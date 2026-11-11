# Convergence: Audit

**Auditor:** Kehai Interim · **Date:** 2026-11-11 · **Build audited:** commit `96e644c` (Argon's delivery, as delivered)

**Verdict: real, and it works.** SONDER pages are rendered by the real Vanta. The projection and snapshot are computed live, sent over segmented StudioNet, reassembled by SpiralOS code, and blitted on both machines. The lifts are what LIFTS.md says they are. I found one blocking bug, and it only shows up in a real browser: the page threw on load, and neither machine booted. It's fixed in this commit with a 2-line change.

## 1. Argon's suite, rerun

`node tests/convergence.js` needs `sonder/`, `vanta/` and `spiralos/` laid out next to `convergence.html`, plus `LIFTS.md`. Result: **8/8 pass** in ~33 s.

| Test | Result |
|---|---|
| 1. Lift integrity | 13 blocks: 12 byte-identical, 1 documented modification |
| 2. Originals still pass | SONDER Verify 4/4, Vanta 15/15 pages (24/24 assertions), SpiralOS 8/8 suites |
| 3. Pipeline determinism | 25 URLs × 2 runs, bit-identical across all 5 stages |
| 4. Vanta in the loop | +1 px layout shift changes the snapshot; dropping a parsed element changes the projection |
| 5. Real links | 221 hrefs checked; a 10-link walk inside SpiralWeb, plus Back |
| 6. Both machines | 74 frames each; all 15,360 snapshot pixels blitted. TabComp 232 ms, Hummingbird 3,422 ms |
| 7. Segmentation | 5% drops, 6 seeds: 6/6 byte-identical; 100% loss gives a clean timeout |
| 8. Static scan | strict CSP, no network, storage or channel APIs |

## 2. My checks (`audit/`)

### `verify_lifts.py`: lifts checked against the real repos

I diffed every `// from file:A-B` block against the actual source lines, without using LIFTS.md's hashes.
- **12/13 blocks are identical.**
- **The one difference** is `spiralos/tabcomp.html:505-681`. It removes exactly the BroadcastChannel constructor and its `postMessage`, and replaces each with a comment pointing to LIFTS.md. That matches LIFTS.md's description.
- Lifted code makes up 29,463 of the file's 31,613 lines. The rest is the gateway, the projection and snapshot builders, the UI, and the embedded SpiralOS sources.

### Embedded SpiralOS sources

The page carries 14 source files. 12 are byte-identical to the SpiralOS repo. The two that changed are both documented in REPORT §2:
- `net.sp`: segmented SSP, with sequence numbers, ACKs, a per-segment CRC16 and a retry limit;
- `apps2.sp`: the Snap button, and bigger link and history tables.

I checked the memory map for the new and moved buffers: `SSP_REQ_BUF 0x49D00`, `WEB_LINK_TAB 0x4A300–0x4A600`, `WEB_HIST_BUF 0x4A600–0x4AA00`, `WEB_SNAP_BUF 0xD4000–0xD7C00`. None of them overlap any other constant-addressed buffer.

### No host shortcuts

I checked whether the host page cheats by writing the snapshot straight into guest memory. The non-lifted glue never writes into guest RAM. The gateway only builds frames and hands them to the NIC's receive queue. The snapshot reaches `0xD4000` only through SpiralOS's own `net.sp`.

### `corruption.js`: bit flips, not just drops

Argon's test 7 only drops frames. I flipped random bits inside snapshot segment payloads, leaving the headers alone, so that only the per-segment CRC16 could catch the damage.

| Scenario | Runs | Result |
|---|---|---|
| 10% of segments flipped | 6 | 6/6 byte-identical |
| 30% of segments flipped | 4 | 4/4 byte-identical |
| 10% flipped + 10% dropped | 4 | 4/4 byte-identical |
| 20% dropped | 4 | 4/4 byte-identical |

That's **0 corrupted out of 18**: every damaged segment was rejected and resent.

### In a real browser (headless Chromium)

**As delivered, the page throws on load:** `Cannot set property clientWidth of #<Element> which has only a getter`.
- Where: `runPipelineForUrl` assigns `rCanvas.clientWidth` and `rCanvas.clientHeight`. That works on the Node harness's fake DOM, but those properties are getter-only on real elements.
- Effect: the startup pipeline dies, and both machine screens stay black (`audit/browser-boot.png`).
- Why the tests missed it: Argon's suite only ever runs the fake DOM.

**Fix (this commit):** pin the two values as own properties with `Object.defineProperty`. Vanta's viewport stays exactly 800×600 in the browser, as it is in Node, so all determinism hashes are unchanged.

After the fix:
- Both machines boot.
- The Spiral menu opens SpiralWeb, and [Sonder] fetches and renders the live projection, with real links (`audit/browser-spiralweb-steps.png`).
- The Node suite still passes 8/8.

I didn't confirm the Snap blit visually in the browser. Test 6 verifies it pixel by pixel in Node.

## 3. Notes

- The gateway frame-log panel on the right still read "0 frames" after a browser fetch, which looks like a UI refresh gap. It's cosmetic; the fetch itself happened.
- REPORT timings are from Argon's machine. Mine were TabComp 232 ms and Hummingbird 3,422 ms for a fetch plus snapshot.
- Running the suite needs the three source repos beside the page. The page itself is self-contained: it makes no fetches, so it deploys as-is.
