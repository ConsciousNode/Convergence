# LIFTS.md — Provenance & Lift Integrity Manifest for `convergence.html`

**Studio:** ConsciousNode SoftWorks · **Target:** `convergence.html`

Every block of code lifted from the attached **SONDER** (`sonder/index.html`), **Vanta** (`vanta/index.html`), and **SpiralOS** (`spiralos/*`) repositories into `convergence.html` is bracketed by explicit machine-verifiable provenance markers:

```javascript
// from <file>:<startLine>-<endLine>
...
// end from <file>:<startLine>-<endLine>
```

---

## 1. Summary Table of Lifted Blocks

| # | Provenance Range (`file:LINE-LINE`) | Source Lines | Source SHA-256 (Prefix) | Lifted SHA-256 (Prefix) | Status | Notes / Reason |
| :- | :--- | ---: | :--- | :--- | :--- | :--- |
| 1 | `sonder/index.html:773-4182` | 3410 | `91b89964fab359e0…` | `91b89964fab359e0…` | **Byte-Identical** | Byte-identical lift (0 changes). |
| 2 | `sonder/index.html:4582-4625` | 44 | `06af190c61f1497b…` | `06af190c61f1497b…` | **Byte-Identical** | Byte-identical lift (0 changes). |
| 3 | `vanta/index.html:634-8980` | 8347 | `a8677664fbf60b77…` | `a8677664fbf60b77…` | **Byte-Identical** | Byte-identical lift (0 changes). |
| 4 | `spiralos/tabcomp.html:270-351` | 82 | `d0a53a8b06cdb83e…` | `d0a53a8b06cdb83e…` | **Byte-Identical** | Byte-identical lift (0 changes). |
| 5 | `spiralos/tabcomp.html:505-681` | 177 | `151795f2311a1111…` | `6ac6fc641217eabf…` | **Modified (Documented)** | Removed cross-tab BroadcastChannel constructor (lines 523-536) and postMessage call (lines 575-579) to satisfy strict offline static scan with zero external/channel APIs. |
| 6 | `spiralos/tabcomp.html:683-2594` | 1912 | `1ee55ac470feb01e…` | `1ee55ac470feb01e…` | **Byte-Identical** | Byte-identical lift (0 changes). |
| 7 | `spiralos/hummingbird.html:637-3637` | 3001 | `180938ed44adc2b0…` | `180938ed44adc2b0…` | **Byte-Identical** | Byte-identical lift (0 changes). |
| 8 | `spiralos/hummingbird.html:3969-11373` | 7405 | `c20b937e05cb90fc…` | `c20b937e05cb90fc…` | **Byte-Identical** | Byte-identical lift (0 changes). |
| 9 | `spiralos/core/x86_asm.js:8-419` | 412 | `27ea41ee57e5b882…` | `27ea41ee57e5b882…` | **Byte-Identical** | Byte-identical lift (0 changes). |
| 10 | `spiralos/core/core_tc32.js:12-1218` | 1207 | `29a9a1e288b93d83…` | `29a9a1e288b93d83…` | **Byte-Identical** | Byte-identical lift (0 changes). |
| 11 | `spiralos/core/core_x86.js:24-2167` | 2144 | `d758da970c094016…` | `d758da970c094016…` | **Byte-Identical** | Byte-identical lift (0 changes). |
| 12 | `spiralos/compiler/spiralfs.js:1-171` | 171 | `2cc4459cab7d51b5…` | `2cc4459cab7d51b5…` | **Byte-Identical** | Byte-identical lift (0 changes). |
| 13 | `spiralos/compiler/spiralc.js:16-1183` | 1168 | `ea15ebd557f2a7b2…` | `ea15ebd557f2a7b2…` | **Byte-Identical** | Byte-identical lift (0 changes). |

---

## 2. Full SHA-256 Hashes for Machine Verification (`tests/convergence.js`)

### Block 1: `sonder/index.html:773-4182`
- **Source File:** `sonder/index.html` (lines `773`–`4182`, `3410` lines)
- **Original SHA-256:** `91b89964fab359e0ef6f9955438b8668d4953c4c16edede3e7701b406d302716`
- **Lifted SHA-256:** `91b89964fab359e0ef6f9955438b8668d4953c4c16edede3e7701b406d302716`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

### Block 2: `sonder/index.html:4582-4625`
- **Source File:** `sonder/index.html` (lines `4582`–`4625`, `44` lines)
- **Original SHA-256:** `06af190c61f1497bdc1a0735d451308e1f497d0dbb8bace2e7e52917205a002e`
- **Lifted SHA-256:** `06af190c61f1497bdc1a0735d451308e1f497d0dbb8bace2e7e52917205a002e`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

### Block 3: `vanta/index.html:634-8980`
- **Source File:** `vanta/index.html` (lines `634`–`8980`, `8347` lines)
- **Original SHA-256:** `a8677664fbf60b77fbe7b337551827f7c30f60355fa7733f4d10834fd63202d6`
- **Lifted SHA-256:** `a8677664fbf60b77fbe7b337551827f7c30f60355fa7733f4d10834fd63202d6`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

### Block 4: `spiralos/tabcomp.html:270-351`
- **Source File:** `spiralos/tabcomp.html` (lines `270`–`351`, `82` lines)
- **Original SHA-256:** `d0a53a8b06cdb83ee243145495ca216cd40f1316d6a1c1397c1f34ba6852a234`
- **Lifted SHA-256:** `d0a53a8b06cdb83ee243145495ca216cd40f1316d6a1c1397c1f34ba6852a234`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

### Block 5: `spiralos/tabcomp.html:505-681`
- **Source File:** `spiralos/tabcomp.html` (lines `505`–`681`, `177` lines)
- **Original SHA-256:** `151795f2311a11110e45abee604c71c6527587f6b780e6fc22860242dca8ddfb`
- **Lifted SHA-256:** `6ac6fc641217eabfa44beacf5e8c22c3f95a0db4583bcfc66c24899cb97045fb`
- **Byte-Identical:** `false (documented edit below)`
- **Reason:** Removed cross-tab BroadcastChannel constructor (lines 523-536) and postMessage call (lines 575-579) to satisfy strict offline static scan with zero external/channel APIs.

### Block 6: `spiralos/tabcomp.html:683-2594`
- **Source File:** `spiralos/tabcomp.html` (lines `683`–`2594`, `1912` lines)
- **Original SHA-256:** `1ee55ac470feb01e453d8996f91c2171cb52898cb798d7cdfb5ca13d3170c2c6`
- **Lifted SHA-256:** `1ee55ac470feb01e453d8996f91c2171cb52898cb798d7cdfb5ca13d3170c2c6`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

### Block 7: `spiralos/hummingbird.html:637-3637`
- **Source File:** `spiralos/hummingbird.html` (lines `637`–`3637`, `3001` lines)
- **Original SHA-256:** `180938ed44adc2b02c7c977eb1f8aae4e636da31afb0fb8ab226cd51869a00c1`
- **Lifted SHA-256:** `180938ed44adc2b02c7c977eb1f8aae4e636da31afb0fb8ab226cd51869a00c1`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

### Block 8: `spiralos/hummingbird.html:3969-11373`
- **Source File:** `spiralos/hummingbird.html` (lines `3969`–`11373`, `7405` lines)
- **Original SHA-256:** `c20b937e05cb90fc3b34010161e79afb3bbbe72b560fba3c6812c785d56e77f8`
- **Lifted SHA-256:** `c20b937e05cb90fc3b34010161e79afb3bbbe72b560fba3c6812c785d56e77f8`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

### Block 9: `spiralos/core/x86_asm.js:8-419`
- **Source File:** `spiralos/core/x86_asm.js` (lines `8`–`419`, `412` lines)
- **Original SHA-256:** `27ea41ee57e5b882917c5cd195ea8778824e0adedc2d86ce1eee60c92926c19e`
- **Lifted SHA-256:** `27ea41ee57e5b882917c5cd195ea8778824e0adedc2d86ce1eee60c92926c19e`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

### Block 10: `spiralos/core/core_tc32.js:12-1218`
- **Source File:** `spiralos/core/core_tc32.js` (lines `12`–`1218`, `1207` lines)
- **Original SHA-256:** `29a9a1e288b93d8314d6d49e93964038609a8436bc44c81cd34a8413ed468e4e`
- **Lifted SHA-256:** `29a9a1e288b93d8314d6d49e93964038609a8436bc44c81cd34a8413ed468e4e`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

### Block 11: `spiralos/core/core_x86.js:24-2167`
- **Source File:** `spiralos/core/core_x86.js` (lines `24`–`2167`, `2144` lines)
- **Original SHA-256:** `d758da970c0940163ba870b9e2e6d88ba4e36c01d7c72e3e2a891ff4861dcca9`
- **Lifted SHA-256:** `d758da970c0940163ba870b9e2e6d88ba4e36c01d7c72e3e2a891ff4861dcca9`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

### Block 12: `spiralos/compiler/spiralfs.js:1-171`
- **Source File:** `spiralos/compiler/spiralfs.js` (lines `1`–`171`, `171` lines)
- **Original SHA-256:** `2cc4459cab7d51b5b60c875020156ecffde0af23071a9377c011c9e0b96e5b44`
- **Lifted SHA-256:** `2cc4459cab7d51b5b60c875020156ecffde0af23071a9377c011c9e0b96e5b44`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

### Block 13: `spiralos/compiler/spiralc.js:16-1183`
- **Source File:** `spiralos/compiler/spiralc.js` (lines `16`–`1183`, `1168` lines)
- **Original SHA-256:** `ea15ebd557f2a7b2167954a5fe2fe5f6deb002cf8dc567b20305d839a4fe3da4`
- **Lifted SHA-256:** `ea15ebd557f2a7b2167954a5fe2fe5f6deb002cf8dc567b20305d839a4fe3da4`
- **Byte-Identical:** `true`
- **Reason:** Byte-identical lift (0 changes).

---

## 3. Documented Lift Modifications & Intentional Omissions

### 3.1 `spiralos/tabcomp.html:505-681` (`class StudioNetNIC`)
- **What Changed:**
  1. Lines `523–536` (`if (typeof BroadcastChannel !== "undefined" ...) { this.bc = new BroadcastChannel("studionet-v1"); ... }`) were replaced with a single comment line:
     `// [LIFTS.md] Removed BroadcastChannel init (lines 523-536) for offline static scan compliance`
  2. Lines `575–579` (`if (this.bc) { try { this.bc.postMessage(...); } catch (e) {} }`) were replaced with a single comment line:
     `// [LIFTS.md] Removed BroadcastChannel.postMessage (lines 575-579) for offline static scan compliance`
- **Why:** `convergence.html` runs both emulators (`0x0101` TabComp and `0x0201` Hummingbird) and the `0x00FE` (`sonder.gw`) gateway inside the same single-file page over the in-memory `__STUDIONET_SWITCH` bus, and Test 8 (`Static scan`) forbids external network/channel/storage APIs.

### 3.2 Intentional Omissions of Non-Engine Chrome & Stand-In Stubs
- **`sonder/index.html:4183-4581` & `4626-4938`:** Standalone SONDER multi-tab DOM chrome and `localStorage` bookmark/history persistence (`loadBookmarksFromStorage`, `saveBookmarksToStorage`, `recordHistoryVisit`). Omitted so `convergence.html` contains zero `localStorage` calls while keeping the entire SONDER procedural engine (`sonder/index.html:773-4182`) and verification suite (`sonder/index.html:4582-4625`) 100% byte-identical.
- **`vanta/index.html:8981-9579`:** Standalone Vanta workbench DOM initialization (`initWorkbenchUI`). Omitted because `convergence.html` drives `VantaEngine` (`vanta/index.html:634-8980`, 100% byte-identical) directly from the `0x00FE` gateway and Host Panel.
- **`spiralos/tabcomp.html:354-504` & `spiralos/hummingbird.html:3640-3968`:** The SpiralOS 1.1 four-template stand-in `generateSonderProceduralPage` and its single-frame `0x00FE` stub handler. Omitted and replaced by the real Convergence `0x00FE` gateway calling lifted SONDER `renderUrlToDocument` + lifted Vanta `VantaEngine.prototype.render`.
