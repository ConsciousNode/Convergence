#!/usr/bin/env node
/**
 * Convergence Verification Suite (tests/convergence.js)
 * ConsciousNode SoftWorks · Xinu Rules: Zero Dependencies, Offline, Deterministic
 *
 * Exercises all 8 required verification suites on `convergence.html` and `spiralos.img`:
 *   1. Lift integrity (every `// from file:LINE-LINE` block matches original source hash, except documented LIFTS.md edits)
 *   2. The originals still pass (SONDER Verify suite, Vanta 15-page reference suite, SpiralOS existing test suites)
 *   3. Pipeline determinism (25 URLs x 2 runs: SONDER HTML, Vanta pixels, projection bytes, snapshot bytes, frame sequence)
 *   4. Vanta is in the loop (monkey-patch layout +1px -> snapshot changes; monkey-patch parser drop 1 element -> projection changes)
 *   5. Real links (all projection hrefs resolve in SONDER; 10-link walk from sonder.com via click coordinates in SpiralWeb + Back)
 *   6. Both machines (full page fetch + segmented /snap snapshot on TabComp TC-32 and Hummingbird i586; logs frame count & time)
 *   7. Segmentation robustness (5% frame drop via seeded fault injector -> byte-identical snapshot or reported timeout, never corrupted)
 *   8. Static scan (zero network/storage/channel APIs, no stand-in generator, strict Content-Security-Policy)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const assert = require("assert");
const { spawnSync } = require("child_process");

function findConvRoot() {
  const candidates = [
    path.resolve(__dirname, ".."),
    path.resolve(__dirname, "../.."),
    process.cwd(),
    path.resolve(process.cwd(), "..")
  ];
  for (const c of candidates) {
    if (
      fs.existsSync(path.join(c, "sonder", "index.html")) &&
      fs.existsSync(path.join(c, "vanta", "index.html")) &&
      fs.existsSync(path.join(c, "convergence.html"))
    ) {
      return c;
    }
  }
  throw new Error("Cannot locate convergence root containing sonder/index.html, vanta/index.html, and convergence.html");
}

const CONV_ROOT = findConvRoot();
const SPIRAL_ROOT = path.join(CONV_ROOT, "spiralos");
const CONV_HTML_PATH = path.join(CONV_ROOT, "convergence.html");
const LIFTS_MD_PATH = path.join(CONV_ROOT, "LIFTS.md");

function sha256Hex(data) {
  const buf = typeof data === "string"
    ? Buffer.from(data, "utf8")
    : Buffer.from(data.buffer || data, data.byteOffset || 0, data.byteLength !== undefined ? data.byteLength : data.length);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function loadConvergenceEnvironment() {
  const html = fs.readFileSync(CONV_HTML_PATH, "utf8");
  const sourcesMatch = html.match(/<script id="spiral-sources-json" type="application\/json">([\s\S]*?)<\/script>/);
  const sonderMatch = html.match(/<script id="sonder-lifted-script">([\s\S]*?)<\/script>/);
  const vantaMatch = html.match(/<script id="vanta-lifted-script">([\s\S]*?)<\/script>/);
  const stationMatch = html.match(/<script id="spiral-station-core">([\s\S]*?)<\/script>/);

  assert.ok(sourcesMatch && sonderMatch && vantaMatch && stationMatch, "convergence.html must contain all 4 core inline script blocks");

  const renderCanvas = {
    width: 800,
    height: 600,
    clientWidth: 800,
    clientHeight: 600,
    style: {},
    _ctx: null,
    getContext() {
      if (!this._ctx && globalThis.SoftCanvas2DContext) {
        this._ctx = new globalThis.SoftCanvas2DContext(this);
      }
      return this._ctx;
    }
  };

  globalThis.window = globalThis;
  globalThis.window.devicePixelRatio = 1;
  globalThis.document = {
    readyState: "complete",
    activeElement: null,
    getElementById(id) {
      if (id === "render-canvas") return renderCanvas;
      if (id === "spiral-sources-json") return { textContent: sourcesMatch[1] };
      // Return null for tc-canvas so headless mode is active during script load
      if (id === "tc-canvas") return null;
      return null;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) {
      if (tag === "canvas") {
        return {
          width: 300,
          height: 150,
          style: {},
          getContext() {
            return globalThis.SoftCanvas2DContext ? new globalThis.SoftCanvas2DContext(this) : null;
          }
        };
      }
      return { style: {}, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, appendChild() {} };
    }
  };

  vm.runInThisContext(sonderMatch[1]);
  vm.runInThisContext(vantaMatch[1]);
  vm.runInThisContext(stationMatch[1]);

  return {
    html,
    sourceMap: JSON.parse(sourcesMatch[1]),
    renderCanvas
  };
}

function stepTabCompFrames(cpu, n = 1) {
  const target = cpu.presentCount + n;
  while (cpu.presentCount < target && !cpu.halted) {
    cpu.yielded = false;
    cpu.stepBatch(60000);
  }
}

function clickTabComp(cpu, x, y, framesAfter = 2) {
  cpu.setMouseState(x, y, 1);
  stepTabCompFrames(cpu, 1);
  cpu.setMouseState(x, y, 0);
  stepTabCompFrames(cpu, framesAfter);
}

function stepHummingbirdFrames(pc, n = 1) {
  const vmBase = 0x00200000;
  const start = pc.ramView.getInt32(vmBase + 0x0FFD04, true);
  const target = start + n;
  let guard = 0;
  while (pc.ramView.getInt32(vmBase + 0x0FFD04, true) < target && guard < n * 40) {
    pc.cpu.runSteps(180000);
    guard++;
  }
}

function clickHummingbird(pc, tx, ty, framesAfter = 2) {
  const vmBase = 0x00200000;
  for (let iter = 0; iter < 40; iter++) {
    const mx = pc.ramView.getInt32(vmBase + 0x0FFD08, true);
    const my = pc.ramView.getInt32(vmBase + 0x0FFD0C, true);
    const dx = tx - mx;
    const dy = ty - my;
    if (dx === 0 && dy === 0) break;
    const sx = Math.max(-32, Math.min(32, dx));
    const sy = Math.max(-32, Math.min(32, dy));
    pc.ps2.sendMousePacket(sx, sy, 0);
    stepHummingbirdFrames(pc, 1);
  }
  pc.ps2.sendMousePacket(0, 0, 1);
  stepHummingbirdFrames(pc, 1);
  pc.ps2.sendMousePacket(0, 0, 0);
  stepHummingbirdFrames(pc, framesAfter);
}

function runAllConvergenceTests() {
  console.log("======================================================================");
  console.log("  CONVERGENCE VERIFICATION SUITE (tests/convergence.js)");
  console.log("======================================================================");

  const { html, sourceMap } = loadConvergenceEnvironment();
  const liftsMd = fs.readFileSync(LIFTS_MD_PATH, "utf8");
  const metrics = {};

  // ==========================================================================
  // 1. Lift Integrity
  // ==========================================================================
  {
    const liftRegex = /\/\/ from ([^:\n]+):(\d+)-(\d+)\n([\s\S]*?)\n\/\/ end from \1:\2-\3/g;
    const blocks = [];
    let m;
    while ((m = liftRegex.exec(html)) !== null) {
      blocks.push({
        relPath: m[1],
        startLine: parseInt(m[2], 10),
        endLine: parseInt(m[3], 10),
        liftedCode: m[4]
      });
    }
    assert.ok(blocks.length >= 13, `Expected >= 13 lifted blocks in convergence.html, found ${blocks.length}`);

    let byteIdenticalCount = 0;
    let documentedModCount = 0;

    for (const b of blocks) {
      const origFullPath = path.join(CONV_ROOT, b.relPath);
      assert.ok(fs.existsSync(origFullPath), `Original source file must exist: ${b.relPath}`);
      const origLines = fs.readFileSync(origFullPath, "utf8").split("\n");
      const origSlice = origLines.slice(b.startLine - 1, b.endLine).join("\n");
      const origHash = sha256Hex(origSlice);
      const liftedHash = sha256Hex(b.liftedCode);

      if (liftedHash === origHash) {
        byteIdenticalCount++;
      } else {
        // Must be explicitly listed in LIFTS.md with both original and lifted hashes and a reason
        const specTag = `${b.relPath}:${b.startLine}-${b.endLine}`;
        assert.ok(liftsMd.includes(specTag), `Modified lift ${specTag} must be listed in LIFTS.md`);
        assert.ok(liftsMd.includes(origHash), `Original hash ${origHash} for ${specTag} must be documented in LIFTS.md`);
        assert.ok(liftsMd.includes(liftedHash), `Lifted hash ${liftedHash} for ${specTag} must be documented in LIFTS.md`);
        // Specifically verify that no SONDER or Vanta block was modified
        assert.ok(!b.relPath.startsWith("sonder/") && !b.relPath.startsWith("vanta/"),
          `SONDER and Vanta lifts must remain 100% byte-identical, found modification in ${specTag}`);
        documentedModCount++;
      }
    }

    metrics.liftBlocksTotal = blocks.length;
    metrics.liftByteIdentical = byteIdenticalCount;
    metrics.liftDocumentedMods = documentedModCount;
    console.log(`  [PASS] 1. Lift Integrity: ${blocks.length} lifted blocks verified (${byteIdenticalCount} byte-identical, ${documentedModCount} documented in LIFTS.md; 100% of SONDER & Vanta byte-identical)`);
  }

  // ==========================================================================
  // 2. The Originals Still Pass (SONDER Verify + Vanta Reference + SpiralOS Suites)
  // ==========================================================================
  {
    const sonderVerify = globalThis.SONDER.runInBrowserVerificationSuite();
    assert.strictEqual(sonderVerify.detPass, true, "SONDER determinism check must pass");
    assert.strictEqual(sonderVerify.distinctTypes, 8, "SONDER taxonomy diversity must have 8/8 archetypes");
    assert.strictEqual(sonderVerify.eraPass, true, "SONDER era CSS differentiation must pass");
    assert.strictEqual(sonderVerify.archivePass, true, "SONDER pre-founding archive 404 guard must pass");

    const origLog = console.log;
    console.log = () => {};
    let vantaVerify;
    try {
      vantaVerify = globalThis.vanta.test();
    } finally {
      console.log = origLog;
    }
    assert.strictEqual(vantaVerify.passedPages, 15, `Expected 15/15 Vanta reference pages to pass, got ${vantaVerify.passedPages}`);
    assert.strictEqual(vantaVerify.passedAssertions, vantaVerify.totalAssertions, "All Vanta reference assertions must pass");

    // Run SpiralOS core suites against the rebuilt image
    const spiralSuites = [
      "tests/vm.js",
      "tests/boot.js",
      "tests/apps.js",
      "tests/net.js",
      "tests/sonder.js",
      "tests/determinism.js",
      "tests/multitask.js",
      "tests/strict-bios.js"
    ];
    for (const suiteRel of spiralSuites) {
      const res = spawnSync(process.execPath, [path.join(SPIRAL_ROOT, suiteRel)], {
        cwd: SPIRAL_ROOT,
        encoding: "utf8"
      });
      assert.strictEqual(res.status, 0, `SpiralOS suite ${suiteRel} failed:\n${res.stderr || res.stdout}`);
    }

    metrics.sonderVerifyMs = sonderVerify.elapsedMs;
    metrics.vantaPassedPages = vantaVerify.passedPages;
    metrics.vantaPassedAssertions = vantaVerify.passedAssertions;
    metrics.spiralSuitesPassed = spiralSuites.length;
    console.log(`  [PASS] 2. Originals Still Pass: SONDER Verify (4/4 checks), Vanta Reference (${vantaVerify.passedPages}/15 pages, ${vantaVerify.passedAssertions}/${vantaVerify.totalAssertions} assertions), SpiralOS (${spiralSuites.length}/${spiralSuites.length} suites)`);
  }

  // ==========================================================================
  // 3. Pipeline Determinism (25 URLs x 2 Runs)
  // ==========================================================================
  const testUrls25 = [
    "sonder.com",
    "news.sonder",
    "wiki.sonder",
    "archive.sonder/19960512/coralway.com",
    ...globalThis.SONDER.HOUSEHOLD_DOMAINS_CACHE.slice(0, 20),
    "glasswing-consortium.org"
  ];
  assert.strictEqual(testUrls25.length, 25, "Must test exactly 25 URLs");

  const projectionsFor25 = new Map();
  {
    const t0 = Date.now();
    for (const u of testUrls25) {
      const r1 = globalThis.CONVERGENCE.runPipelineForUrl(u, 0n);
      const r2 = globalThis.CONVERGENCE.runPipelineForUrl(u, 0n);

      const htmlHash1 = sha256Hex(r1.sonderHtml);
      const htmlHash2 = sha256Hex(r2.sonderHtml);
      assert.strictEqual(htmlHash1, htmlHash2, `SONDER HTML hash mismatch for ${u}`);

      const pixHash1 = sha256Hex(r1.vantaPixels);
      const pixHash2 = sha256Hex(r2.vantaPixels);
      assert.strictEqual(pixHash1, pixHash2, `Vanta pixel hash mismatch for ${u}`);

      const projHash1 = sha256Hex(r1.projectionBytes);
      const projHash2 = sha256Hex(r2.projectionBytes);
      assert.strictEqual(projHash1, projHash2, `Projection hash mismatch for ${u}`);
      assert.ok(r1.projectionBytes.length > 0 && r1.projectionBytes.length <= 1023,
        `Projection for ${u} must be 1..1023 bytes, got ${r1.projectionBytes.length}`);

      const snapHash1 = sha256Hex(r1.snapshotBytes);
      const snapHash2 = sha256Hex(r2.snapshotBytes);
      assert.strictEqual(snapHash1, snapHash2, `Snapshot hash mismatch for ${u}`);
      assert.strictEqual(r1.snapshotBytes.length, 15360, `Snapshot must be 160x96 (15360 B)`);

      const concatFrames = (arr) => Buffer.concat(arr.map(f => Buffer.from(f)));
      const framesHash1 = sha256Hex(Buffer.concat([concatFrames(r1.projFrames), concatFrames(r1.snapFrames)]));
      const framesHash2 = sha256Hex(Buffer.concat([concatFrames(r2.projFrames), concatFrames(r2.snapFrames)]));
      assert.strictEqual(framesHash1, framesHash2, `Frame sequence hash mismatch for ${u}`);

      projectionsFor25.set(u, r1.projectionText);
    }
    metrics.det25ElapsedMs = Date.now() - t0;
    console.log(`  [PASS] 3. Pipeline Determinism: 25 URLs x 2 runs produced 100% bit-identical hashes across all 5 stages (${metrics.det25ElapsedMs} ms)`);
  }

  // ==========================================================================
  // 4. Vanta Is In The Loop (Monkey-Patch Layout +1px & Parser Drop 1 Element)
  // ==========================================================================
  {
    const baseRun = globalThis.CONVERGENCE.runPipelineForUrl("sonder.com", 0n);
    const baseSnapHash = sha256Hex(baseRun.snapshotBytes);
    const baseProjHash = sha256Hex(baseRun.projectionBytes);

    // 4a. Monkey-patch Vanta's layout to shift every box by +1px
    const origAssignCoords = globalThis.assignAbsoluteCoordinates;
    globalThis.assignAbsoluteCoordinates = function(box, px, py, rootBox, viewport, ctx) {
      origAssignCoords(box, px, py, rootBox, viewport, ctx);
      if (box === rootBox) {
        function shiftAll(b) {
          if (!b) return;
          b.x += 1;
          b.y += 1;
          b.offsetLeft = b.x;
          b.offsetTop = b.y;
          if (b.lineBoxes) {
            for (const lb of b.lineBoxes) {
              lb.x += 1;
              lb.y += 1;
              if (lb.items) {
                for (const it of lb.items) {
                  it.x += 1;
                  it.y += 1;
                }
              }
            }
          }
          if (b.children) {
            for (const c of b.children) shiftAll(c);
          }
        }
        shiftAll(rootBox);
      }
    };

    let shiftedSnapHash;
    try {
      const shiftedRun = globalThis.CONVERGENCE.runPipelineForUrl("sonder.com", 0n);
      shiftedSnapHash = sha256Hex(shiftedRun.snapshotBytes);
    } finally {
      globalThis.assignAbsoluteCoordinates = origAssignCoords;
    }
    assert.notStrictEqual(shiftedSnapHash, baseSnapHash, "Shifting every Vanta box by 1px MUST change the snapshot bytes");

    // Verify restoring layout restores the exact snapshot hash
    const restoredLayoutRun = globalThis.CONVERGENCE.runPipelineForUrl("sonder.com", 0n);
    assert.strictEqual(sha256Hex(restoredLayoutRun.snapshotBytes), baseSnapHash, "Restoring Vanta layout must restore baseline snapshot hash");

    // 4b. Monkey-patch Vanta's parser to drop one element
    const origParseHTML = globalThis.parseHTML;
    globalThis.parseHTML = function(htmlStr) {
      const doc = origParseHTML(htmlStr);
      // Drop the first <p> element from the parsed DOM tree
      let dropped = false;
      function dropFirstP(node) {
        if (!node || dropped || !node.children) return;
        for (let i = 0; i < node.children.length; i++) {
          const ch = node.children[i];
          if (ch.nodeType === 1 && ch.tagName === "p") {
            node.children.splice(i, 1);
            dropped = true;
            return;
          }
          dropFirstP(ch);
          if (dropped) return;
        }
      }
      dropFirstP(doc);
      return doc;
    };

    let droppedProjHash;
    try {
      const droppedRun = globalThis.CONVERGENCE.runPipelineForUrl("sonder.com", 0n);
      droppedProjHash = sha256Hex(droppedRun.projectionBytes);
    } finally {
      globalThis.parseHTML = origParseHTML;
    }
    assert.notStrictEqual(droppedProjHash, baseProjHash, "Dropping one element in Vanta's parser MUST change the projection bytes");

    const restoredParseRun = globalThis.CONVERGENCE.runPipelineForUrl("sonder.com", 0n);
    assert.strictEqual(sha256Hex(restoredParseRun.projectionBytes), baseProjHash, "Restoring Vanta parser must restore baseline projection hash");

    console.log(`  [PASS] 4. Vanta In The Loop: +1px layout shift changed snapshot (${baseSnapHash.slice(0, 12)} -> ${shiftedSnapHash.slice(0, 12)}); dropping 1 parsed element changed projection (${baseProjHash.slice(0, 12)} -> ${droppedProjHash.slice(0, 12)})`);
  }

  // ==========================================================================
  // 5. Real Links (All Projection hrefs Resolve + 10-Link Walk in Emulated SpiralWeb + Back)
  // ==========================================================================
  const buildRes = globalThis.buildUnifiedSpiralImageFromMap(sourceMap);
  const vmBase = 0x00200000;
  {
    // 5a. Every href in every projection across all 25 URLs resolves in SONDER
    let totalCheckedHrefs = 0;
    for (const [u, projText] of projectionsFor25.entries()) {
      const hrefRe = /<a\s+href=['"]([^'"]+)['"]>/g;
      let m;
      while ((m = hrefRe.exec(projText)) !== null) {
        const href = m[1];
        const resolved = globalThis.SONDER.renderUrlToDocument(href, 0n);
        assert.ok(resolved && resolved.html && resolved.html.length > 200,
          `Href '${href}' on projection for '${u}' failed to resolve in SONDER`);
        totalCheckedHrefs++;
      }
    }
    assert.ok(totalCheckedHrefs >= 100, `Expected >= 100 real SONDER hrefs across 25 projections, checked ${totalCheckedHrefs}`);

    // 5b. Boot TabComp and follow 10 links from sonder.com inside emulated SpiralWeb driven by click coordinates
    globalThis.__STUDIONET_SWITCH.nics.clear();
    globalThis.__STUDIONET_SWITCH.packetLog = [];
    globalThis.CONVERGENCE.gatewayState.frameLog = [];
    globalThis.CONVERGENCE.setUniverseSeed(0n);

    const tcCpu = new globalThis.TabCompCPU(new globalThis.TabCompFS());
    globalThis.initHardwareMemory(tcCpu);
    globalThis.bootSpiralDiskImage(tcCpu, buildRes.img);
    stepTabCompFrames(tcCpu, 3);

    // Open SpiralWeb via desktop "Web" icon at (292, 118) -> window opens at (26, 22, w=236, h=132)
    clickTabComp(tcCpu, 24, 6, 1); clickTabComp(tcCpu, 40, 150, 2);
    assert.strictEqual(tcCpu.ramDV.getInt32(vmBase + 0x0FFD18, true), 14, "SpiralWeb must be open and focused");

    // Click [Sonder] button at (26 + 80, 22 + 20) = (106, 42) to load sonder.com from 0x00FE
    clickTabComp(tcCpu, 106, 42, 3);

    const visitedUrls = ["sonder.com"];
    const visitedPageBufs = [
      new TextDecoder().decode(tcCpu.ram.subarray(vmBase + 0x049000, vmBase + 0x049400)).replace(/\0.*$/, "")
    ];

    for (let step = 1; step <= 10; step++) {
      // Read parsed links from WEB_LINK_TAB (vmRam[0x04A300], up to 12 entries * 64B)
      const parsedLinks = [];
      for (let i = 0; i < 12; i++) {
        const slot = vmBase + 0x04A300 + i * 64;
        const rx0 = tcCpu.ramDV.getInt32(slot + 0, true);
        const ry0 = tcCpu.ramDV.getInt32(slot + 4, true);
        const rx1 = tcCpu.ramDV.getInt32(slot + 8, true);
        const ry1 = tcCpu.ramDV.getInt32(slot + 12, true);
        const href = new TextDecoder().decode(tcCpu.ram.subarray(slot + 16, slot + 62)).replace(/\0.*$/, "");
        if (href && rx1 > rx0 && ry1 > ry0) {
          parsedLinks.push({ idx: i, rx0, ry0, rx1, ry1, href });
        }
      }
      assert.ok(parsedLinks.length > 0, `Step ${step}: Expected clickable links in WEB_LINK_TAB on ${visitedUrls[visitedUrls.length - 1]}`);

      // Pick a link (preferring an unvisited URL if available, otherwise cycling by step)
      let chosen = parsedLinks.find(l => !visitedUrls.includes(l.href)) || parsedLinks[step % parsedLinks.length];
      const clickX = 26 + Math.floor((chosen.rx0 + chosen.rx1) / 2);
      const clickY = 22 + Math.floor((chosen.ry0 + chosen.ry1) / 2);

      clickTabComp(tcCpu, clickX, clickY, 3);

      const curUrlInOs = new TextDecoder().decode(tcCpu.ram.subarray(vmBase + 0x04A200, vmBase + 0x04A240)).replace(/\0.*$/, "");
      assert.strictEqual(curUrlInOs, chosen.href, `Step ${step}: SpiralWeb WEB_CUR_URL must match clicked link href`);

      const directDoc = globalThis.SONDER.renderUrlToDocument(chosen.href, 0n);
      const gwHtmlHash = sha256Hex(globalThis.CONVERGENCE.gatewayState.lastResult.sonderHtml);
      const directHtmlHash = sha256Hex(directDoc.html);
      assert.strictEqual(gwHtmlHash, directHtmlHash,
        `Step ${step}: Gateway SONDER HTML hash for '${chosen.href}' must equal direct renderUrlToDocument call`);

      const pageBufStr = new TextDecoder().decode(tcCpu.ram.subarray(vmBase + 0x049000, vmBase + 0x049400)).replace(/\0.*$/, "");
      assert.strictEqual(pageBufStr, globalThis.CONVERGENCE.gatewayState.lastResult.projectionText,
        `Step ${step}: WEB_PAGE_BUF must contain exact Vanta projection for '${chosen.href}'`);

      visitedUrls.push(chosen.href);
      visitedPageBufs.push(pageBufStr);
    }

    // Now click [Back] in SpiralWeb at (26 + 210, 22 + 20) = (236, 42) and verify we return to step 9's page!
    const prevUrl = visitedUrls[visitedUrls.length - 2];
    const prevProj = visitedPageBufs[visitedPageBufs.length - 2];
    clickTabComp(tcCpu, 236, 42, 3);

    const backUrlInOs = new TextDecoder().decode(tcCpu.ram.subarray(vmBase + 0x04A200, vmBase + 0x04A240)).replace(/\0.*$/, "");
    const backPageBuf = new TextDecoder().decode(tcCpu.ram.subarray(vmBase + 0x049000, vmBase + 0x049400)).replace(/\0.*$/, "");
    assert.strictEqual(backUrlInOs, prevUrl, `Clicking [Back] after 10 links must restore previous URL '${prevUrl}', got '${backUrlInOs}'`);
    assert.strictEqual(backPageBuf, prevProj, "Clicking [Back] must restore the exact previous page projection");

    metrics.checkedHrefsCount = totalCheckedHrefs;
    metrics.walked10Links = visitedUrls.slice(1);
    console.log(`  [PASS] 5. Real Links: verified ${totalCheckedHrefs} hrefs across 25 projections; walked 10 links from sonder.com inside SpiralWeb (${visitedUrls.slice(0, 4).join(" -> ")} -> ...) + [Back] -> '${prevUrl}'`);
  }

  // ==========================================================================
  // 6. Both Machines (TabComp TC-32 & Hummingbird i586 Full Page Fetch + Snapshot)
  // ==========================================================================
  {
    globalThis.__STUDIONET_SWITCH.nics.clear();
    globalThis.__STUDIONET_SWITCH.packetLog = [];
    globalThis.CONVERGENCE.gatewayState.frameLog = [];
    globalThis.CONVERGENCE.clearFaultInjector();

    // 6a. TabComp TC-32
    const tcCpu = new globalThis.TabCompCPU(new globalThis.TabCompFS());
    globalThis.initHardwareMemory(tcCpu);
    globalThis.bootSpiralDiskImage(tcCpu, buildRes.img);
    stepTabCompFrames(tcCpu, 3);

    const tcStartFrames = globalThis.CONVERGENCE.gatewayState.frameLog.length;
    const tcT0 = Date.now();
    // Open SpiralWeb (292, 118), click [Sonder] (106, 42), then click [Snap] (196, 42)
    clickTabComp(tcCpu, 24, 6, 1); clickTabComp(tcCpu, 40, 150, 2);
    clickTabComp(tcCpu, 106, 42, 2);
    const expectedSnap = new Uint8Array(globalThis.CONVERGENCE.gatewayState.lastResult.snapshotBytes);
    clickTabComp(tcCpu, 196, 42, 4);
    const tcElapsedMs = Date.now() - tcT0;
    const tcFramesCount = globalThis.CONVERGENCE.gatewayState.frameLog.length - tcStartFrames;

    const tcSnapStatus = tcCpu.ramDV.getInt32(vmBase + 0x0FFD54, true);
    const tcSnapRxBytes = tcCpu.ramDV.getInt32(vmBase + 0x0FFD50, true);
    const tcSnapBuf = tcCpu.ram.subarray(vmBase + 0x0D4000, vmBase + 0x0D4000 + 15360);
    assert.strictEqual(tcSnapStatus, 3, `TabComp snapshot status must be 3 (complete), got ${tcSnapStatus}`);
    assert.strictEqual(tcSnapRxBytes, 15360, `TabComp snapshot received bytes must be 15360, got ${tcSnapRxBytes}`);
    assert.strictEqual(sha256Hex(tcSnapBuf), sha256Hex(expectedSnap), "TabComp reassembled snapshot must be byte-identical to gateway snapshot");

    // Verify blitted pixels in TabComp VRAM at window (26 + 38, 22 + 30) = (64, 52)
    let tcBlitMatches = 0;
    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 160; x++) {
        if (tcCpu.ram[vmBase + 0x0F0000 + (52 + y) * 320 + (64 + x)] === expectedSnap[y * 160 + x]) {
          tcBlitMatches++;
        }
      }
    }
    assert.strictEqual(tcBlitMatches, 15360, "All 15,360 snapshot pixels must be blitted into TabComp VRAM");

    // 6b. Hummingbird i586
    const hbPc = new globalThis.HummingbirdPC({ ramSizeMB: 16 });
    hbPc.loadFloppyImage(buildRes.img);
    stepHummingbirdFrames(hbPc, 3);

    const hbStartFrames = globalThis.CONVERGENCE.gatewayState.frameLog.length;
    const hbT0 = Date.now();
    clickHummingbird(hbPc, 24, 6, 1); clickHummingbird(hbPc, 40, 150, 2);
    clickHummingbird(hbPc, 106, 42, 2);
    clickHummingbird(hbPc, 196, 42, 4);
    const hbElapsedMs = Date.now() - hbT0;
    const hbFramesCount = globalThis.CONVERGENCE.gatewayState.frameLog.length - hbStartFrames;

    const hbSnapStatus = hbPc.ramView.getInt32(vmBase + 0x0FFD54, true);
    const hbSnapRxBytes = hbPc.ramView.getInt32(vmBase + 0x0FFD50, true);
    const hbSnapBuf = hbPc.ram.subarray(vmBase + 0x0D4000, vmBase + 0x0D4000 + 15360);
    assert.strictEqual(hbSnapStatus, 3, `Hummingbird snapshot status must be 3 (complete), got ${hbSnapStatus}`);
    assert.strictEqual(hbSnapRxBytes, 15360, `Hummingbird snapshot received bytes must be 15360, got ${hbSnapRxBytes}`);
    assert.strictEqual(sha256Hex(hbSnapBuf), sha256Hex(expectedSnap), "Hummingbird reassembled snapshot must be byte-identical to gateway snapshot");

    let hbBlitMatches = 0;
    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 160; x++) {
        if (hbPc.ram[vmBase + 0x0F0000 + (52 + y) * 320 + (64 + x)] === expectedSnap[y * 160 + x]) {
          hbBlitMatches++;
        }
      }
    }
    assert.strictEqual(hbBlitMatches, 15360, "All 15,360 snapshot pixels must be blitted into Hummingbird VRAM");

    metrics.tcFrames = tcFramesCount;
    metrics.tcTimeMs = tcElapsedMs;
    metrics.hbFrames = hbFramesCount;
    metrics.hbTimeMs = hbElapsedMs;
    console.log(`  [PASS] 6. Both Machines Complete Full Page Fetch + Snapshot:`);
    console.log(`    - TabComp TC-32    : ${tcFramesCount} StudioNet gateway frames in ${tcElapsedMs} ms (15,360 / 15,360 pixels blitted)`);
    console.log(`    - Hummingbird i586 : ${hbFramesCount} StudioNet gateway frames in ${hbElapsedMs} ms (15,360 / 15,360 pixels blitted)`);
  }

  // ==========================================================================
  // 7. Segmentation Robustness (5% Seeded Fault Injector + Timeout Verification)
  // ==========================================================================
  {
    globalThis.__STUDIONET_SWITCH.nics.clear();
    globalThis.__STUDIONET_SWITCH.packetLog = [];

    const tcCpu = new globalThis.TabCompCPU(new globalThis.TabCompFS());
    globalThis.initHardwareMemory(tcCpu);
    globalThis.bootSpiralDiskImage(tcCpu, buildRes.img);
    stepTabCompFrames(tcCpu, 3);
    clickTabComp(tcCpu, 24, 6, 1); clickTabComp(tcCpu, 40, 150, 2);
    clickTabComp(tcCpu, 106, 42, 2);
    const expectedSnapHash = sha256Hex(globalThis.CONVERGENCE.gatewayState.lastResult.snapshotBytes);

    let totalDropped = 0;
    let completedByteIdentical = 0;
    let reportedTimeouts = 0;

    // Run 6 trials with 5% frame drop rate across distinct seeds
    const seeds = [0x101, 0x202, 0x303, 0x404, 0x505, 0x777];
    for (const s of seeds) {
      const fi = globalThis.CONVERGENCE.setFaultInjector(0.05, s);
      // Clear WEB_SNAP_BUF before starting
      tcCpu.ram.fill(0xAA, vmBase + 0x0D4000, vmBase + 0x0D4000 + 15360);
      clickTabComp(tcCpu, 196, 42, 2);

      // Step up to 60 frames to allow retries to complete or time out
      for (let f = 0; f < 60; f++) {
        const st = tcCpu.ramDV.getInt32(vmBase + 0x0FFD54, true);
        if (st === 3 || st === -1) break;
        stepTabCompFrames(tcCpu, 1);
      }

      totalDropped += fi.droppedCount;
      const finalStatus = tcCpu.ramDV.getInt32(vmBase + 0x0FFD54, true);
      assert.ok(finalStatus === 3 || finalStatus === -1,
        `With 5% frame drops (seed=${s}), status must be 3 (complete) or -1 (timeout), got ${finalStatus}`);

      if (finalStatus === 3) {
        const rxSnap = tcCpu.ram.subarray(vmBase + 0x0D4000, vmBase + 0x0D4000 + 15360);
        assert.strictEqual(sha256Hex(rxSnap), expectedSnapHash,
          `With 5% frame drops (seed=${s}), completed snapshot MUST be 100% byte-identical (never corrupted!)`);
        completedByteIdentical++;
      } else {
        reportedTimeouts++;
      }
    }
    assert.ok(totalDropped >= 4, `Expected seeded 5% fault injector to drop >= 4 frames across 6 runs, dropped ${totalDropped}`);
    assert.ok(completedByteIdentical >= 5, `Expected >= 5/6 runs at 5% drop rate to recover and complete byte-identically, got ${completedByteIdentical}`);

    // Also verify that exceeding retry limit reports a clean timeout (-1) and never marks snapshot ready
    globalThis.CONVERGENCE.setFaultInjector(1.0, 0x999);
    clickTabComp(tcCpu, 196, 42, 2);
    stepTabCompFrames(tcCpu, 25);
    const timeoutStatus = tcCpu.ramDV.getInt32(vmBase + 0x0FFD54, true);
    assert.strictEqual(timeoutStatus, -1, `Expected reported timeout status -1 under 100% packet loss, got ${timeoutStatus}`);
    globalThis.CONVERGENCE.clearFaultInjector();

    metrics.faultDroppedFrames = totalDropped;
    metrics.faultCompletedRuns = completedByteIdentical;
    console.log(`  [PASS] 7. Segmentation Robustness: 5% fault injector dropped ${totalDropped} frames across 6 runs -> ${completedByteIdentical}/6 arrived 100% byte-identical, 0 corrupted; retry exhaustion cleanly reported timeout (-1)`);
  }

  // ==========================================================================
  // 8. Static Scan (No Network or Storage APIs; Strict CSP; No Stand-In Generator)
  // ==========================================================================
  {
    assert.ok(
      /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=["'][^"']*default-src\s+'none'/i.test(html),
      "convergence.html must include a strict Content-Security-Policy meta tag with default-src 'none'"
    );

    const forbiddenPatterns = [
      { name: "fetch()", re: /\bfetch\s*\(/ },
      { name: "XMLHttpRequest", re: /\bXMLHttpRequest\b/ },
      { name: "WebSocket", re: /\bWebSocket\b/ },
      { name: "EventSource", re: /\bEventSource\b/ },
      { name: "navigator.sendBeacon", re: /\bsendBeacon\b/ },
      { name: "localStorage", re: /\blocalStorage\b/ },
      { name: "sessionStorage", re: /\bsessionStorage\b/ },
      { name: "indexedDB", re: /\bindexedDB\b/ },
      { name: "BroadcastChannel", re: /\bnew\s+BroadcastChannel\b/ },
      { name: "generateSonderProceduralPage (stand-in)", re: /\bfunction\s+generateSonderProceduralPage\b/ },
      { name: "external <script src>", re: /<script[^>]+\bsrc\s*=/i },
      { name: "external <link href>", re: /<link[^>]+\bhref\s*=/i }
    ];

    for (const pat of forbiddenPatterns) {
      assert.ok(!pat.re.test(html), `Static scan failed: forbidden pattern '${pat.name}' found in convergence.html`);
    }

    console.log("  [PASS] 8. Static Scan: strict CSP (`default-src 'none'`), zero network/storage/channel APIs, zero external assets, and zero stand-in page generators");
  }

  console.log("======================================================================");
  console.log("  ALL 8 CONVERGENCE VERIFICATION SUITES PASSED!");
  console.log("======================================================================");
  return metrics;
}

if (require.main === module) {
  runAllConvergenceTests();
}

module.exports = { runAllConvergenceTests };