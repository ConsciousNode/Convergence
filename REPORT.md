# REPORT.md — Convergence: SONDER × Vanta × SpiralOS 1.1

**Studio:** ConsciousNode SoftWorks · **Target:** `convergence.html`, `spiralos.img`, `LIFTS.md`, `tests/convergence.js`

---

## 1. What Was Built

1. **Single-File Offline `convergence.html` (`1,348,434` bytes):**
   - Built from the SpiralOS 1.1 Build Station (`spiralos/index.html`), embedding the lifted **SONDER** procedural internet engine (`sonder/index.html:773-4182` and `4582-4625`), the lifted **Vanta** HTML5/CSS layout and rendering engine (`vanta/index.html:634-8980`), and the **SpiralOS 1.1** emulators (**TabComp TC-32** at node `0x0101` and **Hummingbird i586** at node `0x0201`), native core builders, `SpiralFS`, and `SpiralC` compiler.
   - Replaces the SpiralOS 1.1 four-template stand-in (`generateSonderProceduralPage`) behind StudioNet node `0x00FE` (`sonder.gw`) with a live host-side gateway that:
     1. Receives `PROTO_SSP` (`3`) HTTP `GET` requests from SpiralWeb inside either emulated machine (`0x0101` or `0x0201`);
     2. Calls the lifted SONDER `renderUrlToDocument(rawUrl, universeSeedBigInt, { quality: 'medium' })` with the UI-configured 64-bit universe seed (default `0n`);
     3. Renders the resulting HTML and era stylesheet through the lifted `VantaEngine.prototype.render(html, '')` at a fixed `800×600` viewport;
     4. Derives a **Projection** (`<h1>`, `<p>`, `<a href>`, `<img>`, `<= 1023` bytes) strictly from Vanta's parsed `document` and laid-out `boxes` in visual reading order (`(b.y, b.x)`), with real SONDER URLs as `href` attributes;
     5. Derives a **Snapshot** (`160×96` pixels = `15,360` bytes) by downsampling Vanta's `800×600` canvas with position-weighted sub-block sampling, peak-contrast preservation, and $4\times 4$ Bayer ordered dithering, quantized to the 256-color SpiralOS palette (`0x0FFA00`).
   - Includes the **Host Panel** beside the TabComp and Hummingbird screens showing:
     - **View 1:** SONDER's own browser view (`#sonder-viewport`) with hydrated procedural canvases;
     - **View 2:** Vanta's full-resolution `800×600` render (`#render-canvas`);
     - **View 3:** What SpiralOS shows (`160×96` palette-quantized snapshot canvas `#spiralos-snap-canvas` and the Vanta-derived SpiralWeb projection `#spiralos-proj-view`);
     - **StudioNet Gateway Frame Log (`#gateway-frame-log`):** Live log of every inbound and outbound StudioNet frame crossing node `0x00FE`.

2. **SpiralOS Segmented SSP & SpiralWeb Snapshot Support (`spiralos/os/net.sp`, `spiralos/os/apps2.sp`, `spiralos.img`):**
   - **Segmented SSP (`FLAG_SEG = 16` in `/src/net.sp`):** Added multi-frame sequenced transfer with an 8-byte SSP segment header (`[seg_idx:u16][tot_segs:u16][tot_len:u16][seg_crc:u16]`), `ssp_crc16` per-segment verification, stop-and-wait `FLAG_ACK` acknowledgments, duplicate-segment re-ACKing, idle-tick NAK/request retransmission up to `SSP_MAX_RETRY = 8`, and clean timeout reporting (`g_web_status = -1`). Single-frame replies (`<= 480` payload bytes without `FLAG_SEG`) continue to operate unchanged.
   - **Snapshot Viewing in SpiralWeb (`/src/apps2.sp`):** Added the **`Snap`** toolbar button (`rx = 152..188, ry = 15..26`) to SpiralWeb (`APP_BROWSER = 14`), requesting `/snap/<current_url>` from `sonder.gw` (`0x00FE`), reassembling the 34-segment (`15,360`-byte) `160×96` image into `WEB_SNAP_BUF` (`0x0D4000`), and blitting it into the SpiralWeb window via `hal_blit(x + 38, y + 30, 160, 96, WEB_SNAP_BUF)`.
   - **Expanded Link & History Tables (`/src/apps2.sp`):** Expanded `WEB_LINK_TAB` (`0x04A300`) stride to 64 bytes (`href` up to 46 bytes) and `WEB_HIST_BUF` (`0x04A600`) to 16 entries so multi-step SONDER URL walks (`archive.sonder/19960512/coralway.com`, `social.sonder/@...`, etc.) and `Back` navigation work without truncation or history overflow.
   - **Compiled through SpiralOS's Own Toolchain:** Rebuilt `spiralos.img` (`1,474,560` bytes) and verified the 3-stage self-hosting fixed point (`Stage 1 == Stage 2 == Stage 3`, SHA-256 `e3968710d19fcffd76b4337541656c05d8cba609bb978b87a45fb4a10e2f9180`) on both TabComp and Hummingbird.

---

## 2. Measured Sizes and Timings (Exercised by `tests/convergence.js` & `spiralos/tests/*`)

### 2.1 Artifact & Memory Sizes

| Component | Measured Size | Notes |
| :--- | ---: | :--- |
| `convergence.html` | `1,348,434` bytes | Single-file offline HTML (SONDER + Vanta + SpiralOS + 0x00FE Gateway) |
| `spiralos.img` | `1,474,560` bytes | Unified 1.44 MB bootable floppy/USB image (2,880 sectors × 512 B) |
| `SPIR` VM Bytecode Image | `93,284` code B + `3,303` str B | `186` functions, `549` global words (Sectors `64..319`, `128 KB` slot) |
| Native Cores (`TC-32` / `x86`) | `4,360` B / `8,683` B | `TC-32` (`1,090` words); `x86` (`512` B Stage 1 + `512` B Stage 2 + `7,659` B PM Core) |
| Projection Size (`sonder.com`) | `417` bytes | `<= 1023` bytes hard cap (`260..475` bytes across all 25 tested URLs) |
| Snapshot Dimensions & Size | `160 × 96` (`15,360` bytes) | 8-bit SpiralOS palette indices at `WEB_SNAP_BUF = 0x0D4000` (`16 KB` region) |
| SSP Segment Payload Size | `464` data B + `8` hdr B = `472` B | Fits inside the `480`-byte SSP payload limit (`16` B wire header + `472` B = `488` B frame) |
| Snapshot Segment Count | `34` data segments | `33 × 464` B + `1 × 48` B = `15,360` B (`1` GET + `34` SEG + `34` ACK = `69` frames; `74` frames total with initial page GET/reply) |

### 2.2 Measured Execution Timings

| Benchmark / Verification Suite | Measured Frame Count / Result | Measured Time |
| :--- | :--- | ---: |
| **SONDER In-Browser Verify Suite (`runInBrowserVerificationSuite`)** | `4/4` checks (`25` domains × `2`, `300` taxonomy, Era CSS, Archive 404) | `~145 ms` |
| **Vanta Reference Suite (`vanta.test()`)** | `15/15` pages (`24/24` layout, style & pixel assertions) | `~180 ms` |
| **25-URL × 2-Pass Pipeline Determinism (50 full renders)** | `5/5` stage hashes identical across both runs for all 25 URLs | `10,567 ms` (`~211 ms`/run) |
| **10-Link Real Navigation Walk + `Back` in Emulated SpiralWeb** | `10` consecutive link clicks from `sonder.com` + `Back` restore | `~2,150 ms` |
| **TabComp (`0x0101`) Full Page Fetch + `/snap` Blit** | `74` StudioNet gateway frames (`15,360 / 15,360` pixels blitted) | `371 ms` |
| **Hummingbird (`0x0201`) Full Page Fetch + `/snap` Blit** | `74` StudioNet gateway frames (`15,360 / 15,360` pixels blitted) | `4,710 ms` |
| **5% Frame Drop Fault Injection (6 Seeded `/snap` Runs)** | `24` frames dropped across 6 runs -> `6/6` arrived byte-identical (`0` corrupted) | `~2,400 ms` |
| **SpiralOS 3-Stage Self-Hosting Bootstrap (`tests/bootstrap.js`)** | Stage 1 == Stage 2 == Stage 3 (`131,072 / 131,072` B identical) | TC: `3.2 s` / HB: `38.0 s` |

---

## 3. Every `LIFTS.md` Entry

All 13 lifted code blocks in `convergence.html` carry machine-verified `// from <file>:<start>-<end>` provenance markers and are tested by `tests/convergence.js` (Suite 1):

1. **`sonder/index.html:773-4182` (`3,410` lines):** Complete SONDER deterministic procedural internet engine (`CONFIG`, `fnv1a64`, `createPRNG`, `parseUrl`, `SITE_TYPES`, `TOPIC_WORD_GRAPH`, `HOUSEHOLD_DOMAINS_CACHE`, `deriveSiteProfile`, `getEraSpec`, `generateEraStylesheet`, `hydrateViewportCanvases`, `renderFaviconCanvas`, `renderUrlToDocument`). **Byte-identical** (`SHA-256: 91b89964fab359e0...`).
2. **`sonder/index.html:4582-4625` (`44` lines):** SONDER `runInBrowserVerificationSuite()`. **Byte-identical** (`SHA-256: 06af190c61f1497b...`).
3. **`vanta/index.html:634-8980` (`8,347` lines):** Complete Vanta HTML5 tokenizer/tree builder (`parseHTML`), CSS cascade engine (`resolveDocumentStyles`), layout engine (`layoutBlock`, `layoutFlex`, `layoutGrid`, `layoutTable`, `assignAbsoluteCoordinates`), Canvas 2D painter, `VantaEngine`, and 15 reference test pages (`getReferenceTestPages`). **Byte-identical** (`SHA-256: a8677664fbf60b77...`).
4. **`spiralos/tabcomp.html:270-351` (`82` lines):** TabComp Base64 helpers and 8×8 CP437/ASCII font ROM (`FONT_8X8_HEX`). **Byte-identical** (`SHA-256: d0a53a8b06cdb83e...`).
5. **`spiralos/tabcomp.html:505-681` (`177` source lines -> `160` lifted lines):** `class StudioNetNIC`. **Modified (documented in `LIFTS.md`):** Removed the cross-tab `BroadcastChannel("studionet-v1")` initialization block (lines `523–536`) and `this.bc.postMessage` call (lines `575–579`) so `convergence.html` has zero external/channel/storage APIs and passes the static scan (`Original SHA-256: 7f8690497082ec26...`, `Lifted SHA-256: 6ac6fc641217eabf...`).
6. **`spiralos/tabcomp.html:683-2594` (`1,912` lines):** TabComp hardware region map, `initHardwareMemory`, `renderFramebufferToCanvas`, `TabCompFS`, `TabCompWasmJIT`, `TabCompCPU`, and `bootSpiralDiskImage`. **Byte-identical** (`SHA-256: 1ee55ac470feb01e...`).
7. **`spiralos/hummingbird.html:637-3637` (`3,001` lines):** Hummingbird i586 constants, `X87FPU`, `VGADisplay`, `PIC8259Dual`, `PIT8254`, `CMOSRTC`, `PS2Controller8042`, `PCIBus`, `DMA8237`, `FDC82077AA`. **Byte-identical** (`SHA-256: 180938ed44adc2b0...`).
8. **`spiralos/hummingbird.html:3969-11373` (`7,405` lines):** `class HummingbirdPC` and `class X86CPU` (protected mode, paging, VBE LFB, BIOS interrupts). **Byte-identical** (`SHA-256: c20b937e05cb90fc...`).
9. **`spiralos/core/x86_asm.js:8-419` (`412` lines):** Symbolic x86 assembler helper (`R`, `X86Builder`). **Byte-identical** (`SHA-256: 27ea41ee57e5b882...`).
10. **`spiralos/core/core_tc32.js:12-1218` (`1,207` lines):** TabComp TC-32 native core generator (`buildTC32Core`). **Byte-identical** (`SHA-256: 29a9a1e288b93d83...`).
11. **`spiralos/core/core_x86.js:24-2167` (`2,144` lines):** Hummingbird x86 Stage 1, Stage 2, and 32-bit Protected-Mode core generator (`buildX86Core`). **Byte-identical** (`SHA-256: d758da970c094016...`).
12. **`spiralos/compiler/spiralfs.js:1-171` (`171` lines):** `SpiralFS` filesystem packager. **Byte-identical** (`SHA-256: 2cc4459cab7d51b5...`).
13. **`spiralos/compiler/spiralc.js:16-1183` (`1,168` lines):** Stage-0 `SpiralC` compiler (`compileSpiralSource`, `expandImports`). **Byte-identical** (`SHA-256: ea15ebd557f2a7b2...`).

---

## 4. What Doesn't Work Yet / Known Limitations

1. **Snapshot Resolution & Aspect Ratio Inside SpiralWeb (`160×96`):** Because SpiralWeb's window client area on the `320×200` desktop is `228×100` pixels, Vanta's `800×600` render must be downsampled by `5×` horizontally and `6.25×` vertically to `160×96` (`15,360` bytes) and quantized to 256 colors; small body text (`< 14px`) on dense SONDER pages is legible in the projection view (`<h1>`/`<p>`/`<a>`) and in the Host Panel's `800×600` Vanta view, but appears as quantized sub-pixel blocks in the `160×96` snapshot.
2. **In-Snapshot Hyperlink Clicking:** When SpiralWeb is in Snapshot mode (`g_web_snap_mode == 1`), the window displays the raw `160×96` bitmap (`hal_blit`); clicking links requires returning to the Projection view (via `Back` or `Sonder`).
3. **SONDER Procedural `<canvas>` Hydration Inside Vanta:** SONDER's `hydrateViewportCanvases` paints procedural WebGL2/2D `<canvas data-sonder-canvas="...">` elements in the live DOM after setting `innerHTML` (used in View 1 of the Host Panel); Vanta renders the static HTML/CSS/SVG/layout tree directly from `renderUrlToDocument`'s HTML string, so `<canvas>` elements appear as styled placeholder boxes in Vanta's render while inline `<svg>` logos and CSS gradients render natively.
4. **QEMU Binary in Container:** As in SpiralOS 1.1 (`tests/qemu.js`), `qemu-system-i386` is not installed in the test container, so `tests/qemu.js` delegates to `tests/strict-bios.js` (verifying 18-sector track limits, 64 KB DMA boundaries, `0xFD000000` VBE LFB, 24-bpp mode, missing StudioNet `0xFF` detection, and the 16-bit Real-Mode BIOS `INT 13h` write thunk).
