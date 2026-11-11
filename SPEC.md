# Convergence: SONDER pages, rendered by Vanta, browsed from inside SpiralOS

**ConsciousNode SoftWorks.** Xinu rules: single-file HTML, zero dependencies, offline, deterministic. Inline everything and label every inline: every block lifted from an attached file carries a provenance comment (`// from sonder/index.html:LINE-LINE`). **Lifted code stays byte-identical** to its source except where a change is listed, with a reason, in `LIFTS.md`.

## Attached

- **SpiralOS** (the whole repo, in `spiralos/`):
  - `index.html`, the Spiral Build Station: it builds the disk image and boots it in TabComp and Hummingbird side by side;
  - `tabcomp.html` and `hummingbird.html`, the two emulators;
  - `os/` (OS source), `compiler/`, `core/`, `tests/` and `tools/`;
  - `spiralos.img`;
  - the docs, including `STUDIONET.md` and `AUDIT-1.1.md`. **Trust the code over the docs.** The audit lists places where the docs don't match the code.
- **SONDER** `index.html`: a deterministic procedural internet. Its entry point is `renderUrlToDocument(rawUrl, universeSeedBigInt, options)`, which returns the page's HTML.
- **Vanta** `index.html`: a from-scratch HTML/CSS engine. `new VantaEngine().render(html, css)` returns the canvas, the document and the box tree.

These were built separately. Today SpiralOS's StudioNet gateway `sonder.gw` (node `0x00FE`) serves its **own** four-template stand-in, not the real SONDER.

## What to build

One page, `convergence.html` (built from the Build Station page), where the `0x00FE` gateway becomes real:

1. SpiralWeb, inside SpiralOS (either machine), requests a URL from `sonder.gw`.
2. The host-side gateway calls the **lifted SONDER** `renderUrlToDocument` for that URL, with a universe seed set in the UI (default 0).
3. The gateway renders that HTML with the **lifted Vanta** engine at a fixed viewport (default 800×600).
4. The gateway answers SpiralOS in two forms:
   - **Projection.** A SpiralWeb-subset page (`<h1>`, `<p>`, `<a href>`, `<img>`), at most 1023 bytes, **derived from Vanta's document and box tree**: headings, the first paragraphs in reading order, and the first links with their **real SONDER URLs** as `href`. Clicking a link in SpiralWeb fetches that real URL through the same pipeline.
   - **Snapshot.** Vanta's rendered pixels, downsampled to fit a SpiralOS window and quantized to the SpiralOS palette. The size must fit SpiralOS memory; document the size you choose.
5. **Host panel**, beside the OS screens, three views of the current URL:
   - SONDER's own browser view of it;
   - Vanta's full-resolution render of the same HTML;
   - what SpiralOS shows.

   Plus a log of every StudioNet frame that crossed the gateway.

## Required changes inside SpiralOS (compiled through SpiralOS's own toolchain)

- **Segmented transfer.** Today a reply is one frame of ≤ 480 payload bytes. Add segmented SSP transfer (sequence numbers, ACKs, reassembly, a retry limit) so the snapshot can arrive in many frames. Keep single-frame replies working unchanged.
- **Snapshot viewing in SpiralWeb.** Either a **Snapshot** button or a new small app, whichever fits the existing window and app conventions better. It requests `/snap` for the current URL and blits the reassembled image.
- **Build path.** Every OS change goes through the in-OS SpiralC / build station path, the same way SpiralOS 1.1 is built. The resulting disk image must still boot in TabComp **and** Hummingbird in both strict and lenient modes. The existing `tests/` must still pass.

## Forbidden

- **No stand-in pages.** No hand-written or template pages anywhere in the gateway path. Every page comes from the lifted SONDER function.
- **No precomputed output.** No precomputed projections, snapshots or frames. Everything is computed when requested.
- **No pre-rendering for SpiralOS.** Projections may not be built from SONDER's HTML text directly. They must come from Vanta's parsed document and boxes, so that Vanta is actually in the loop.
- **No unlisted edits.** No changes to lifted SONDER or Vanta logic except those listed in `LIFTS.md`.

## Tests (`node tests/convergence.js` plus the existing SpiralOS tests)

1. **Lift integrity.** For each lifted block, a hash of the block equals the hash of the matching line range in the original attached file, except the documented changes.
2. **The originals still pass.**
   - SONDER's own Verify suite, run inside `convergence.html`, passes;
   - Vanta's own reference test suite passes;
   - SpiralOS's existing tests pass on the rebuilt image.
3. **Pipeline determinism.** For 25 URLs (including `sonder.com`, `news.sonder`, `wiki.sonder`, `archive.sonder/19960512/coralway.com` and 21 procedural domains), these hashes come out identical across two runs:
   - the SONDER HTML;
   - Vanta's render (pixels);
   - the projection bytes;
   - the snapshot bytes;
   - the frame sequence.
4. **Vanta is in the loop.** Monkey-patch Vanta's layout to shift every box by 1 px. The snapshot must change. Monkey-patch Vanta's parser to drop one element. The projection must change accordingly.
5. **Real links.** Every `href` in every projection is a URL that SONDER resolves. Following 10 links from `sonder.com` inside emulated SpiralWeb, with click coordinates driven by the test, lands on pages whose SONDER HTML hash equals a direct `renderUrlToDocument` call for that URL. **Back** returns to the previous page.
6. **Both machines.** A full page fetch plus snapshot completes on TabComp and on Hummingbird. Log the frame count and the time.
7. **Segmentation robustness.** With 5% of frames dropped by a seeded fault injector, snapshots still arrive byte-identical, or fail with a reported timeout. They never arrive corrupted.
8. **Static scan.** No network or storage APIs; strict CSP.

## Report

`REPORT.md` covers:
- what was built;
- the measured sizes and timings;
- every `LIFTS.md` entry;
- what doesn't work yet.

Do not describe anything as working unless a test exercises it.
