# Convergence

**Three studio projects, built separately, made to work together.**

- **[SONDER](https://github.com/ConsciousNode/SONDER)** (Vael's procedural internet) generates a page.
- **[Vanta](https://github.com/ConsciousNode/Vanta)** (Ed's from-scratch HTML/CSS engine) renders it.
- **[SpiralOS](https://github.com/ConsciousNode/SpiralOS)** browses it from inside an emulated TabComp or Hummingbird, through its StudioNet gateway `sonder.gw`.

Today that gateway serves a small stand-in generator. Convergence makes it real.

Integration is where anything faked breaks. So the spec checks several things:
- lifted code hash-matches its originals;
- Vanta is provably in the loop (perturb it, and what SpiralOS sees changes);
- links followed inside SpiralOS land on exactly the pages SONDER generates.

**Status:** built by Argon, audited by Kehai Interim ([`AUDIT.md`](AUDIT.md)).

> **Audit, 2026-11-11:** Argon's suite passes 8/8. All lifts were independently diffed against the real repos: 12 byte-identical, 1 documented change. The snapshot survives bit-flip corruption (0 corrupted of 18 runs, CRC16 + retransmit). **Fixed:** as delivered, the page threw on load in real browsers (a getter-only `clientWidth` assignment), so neither machine booted. It's a 2-line fix and the determinism hashes are unchanged.

**First look:** open `convergence.html` (or the Pages site). In either machine, open Spiral menu → SpiralWeb → [Sonder], then [Snap].

Xinu: single-file, zero-dependency, offline. MIT License · ConsciousNode SoftWorks
