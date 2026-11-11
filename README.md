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

**Status:** in the build (Argon, from `SPEC.md`, sent 2026-11-11). Kehai Interim's audit follows.

Xinu: single-file, zero-dependency, offline. MIT License · ConsciousNode SoftWorks
