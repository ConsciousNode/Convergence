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


// ---- Kehai's audit: bit-flip corruption (Argon's test 7 only drops frames) ----
const { sourceMap } = loadConvergenceEnvironment();
const buildRes = globalThis.buildUnifiedSpiralImageFromMap(sourceMap);
const vmBase = 0x00200000;
let seed = 4242; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

function trial(label, corruptP, dropP, fseed) {
  globalThis.__STUDIONET_SWITCH.nics.clear(); globalThis.__STUDIONET_SWITCH.packetLog = [];
  globalThis.CONVERGENCE.clearFaultInjector();
  const cpu = new globalThis.TabCompCPU(new globalThis.TabCompFS());
  globalThis.initHardwareMemory(cpu); globalThis.bootSpiralDiskImage(cpu, buildRes.img);
  stepTabCompFrames(cpu, 3);
  clickTabComp(cpu, 24, 6, 1); clickTabComp(cpu, 40, 150, 2); clickTabComp(cpu, 106, 42, 2);
  const expected = sha256Hex(globalThis.CONVERGENCE.gatewayState.lastResult.snapshotBytes);
  // corrupt inbound segment payload bytes on every NIC (header untouched, so only the per-segment CRC can catch it)
  let flips = 0;
  for (const nic of globalThis.__STUDIONET_SWITCH.nics.values()) {
    if (nic.__wrapped) continue; const orig = nic._enqueueRx.bind(nic);
    nic._enqueueRx = (f) => { const u = new Uint8Array(f); if (u.length > 40 && (u[5] & 16) && rnd() < corruptP) { const i = 24 + Math.floor(rnd() * (u.length - 24)); u[i] ^= 1 << Math.floor(rnd() * 8); flips++; } return orig(u); };
    nic.__wrapped = true;
  }
  if (dropP) globalThis.CONVERGENCE.setFaultInjector(dropP, fseed);
  cpu.ram.fill(0xAA, vmBase + 0x0D4000, vmBase + 0x0D4000 + 15360);
  clickTabComp(cpu, 196, 42, 2);
  let st; for (let f = 0; f < 120; f++) { st = cpu.ramDV.getInt32(vmBase + 0x0FFD54, true); if (st === 3 || st === -1) break; stepTabCompFrames(cpu, 1); }
  const got = sha256Hex(cpu.ram.subarray(vmBase + 0x0D4000, vmBase + 0x0D4000 + 15360));
  const verdict = st === 3 ? (got === expected ? 'complete, byte-identical' : '*** COMPLETE BUT CORRUPTED ***') : st === -1 ? 'clean timeout' : `stuck (status ${st})`;
  console.log(`${label}: ${flips} payload bit flips -> ${verdict}`);
  return verdict;
}
const R = [];
for (let s = 0; s < 6; s++) R.push(trial(`flip 10% seed${s}`, 0.10, 0, 0));
for (let s = 0; s < 4; s++) R.push(trial(`flip 30% seed${s}`, 0.30, 0, 0));
for (let s = 0; s < 4; s++) R.push(trial(`flip 10% + drop 10% seed${s}`, 0.10, 0.10, 0x1000 + s));
for (let s = 0; s < 4; s++) R.push(trial(`drop 20% seed${s}`, 0, 0.20, 0x2000 + s));
console.log('SUMMARY', R.filter(v => v.includes('CORRUPTED')).length, 'corrupted of', R.length, '|', R.filter(v => v.includes('identical')).length, 'identical,', R.filter(v => v.includes('timeout')).length, 'timeouts,', R.filter(v => v.includes('stuck')).length, 'stuck');
