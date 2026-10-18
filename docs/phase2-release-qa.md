# Phase 2 — Release Candidate QA Gate

Status: **NOT APPROVED FOR RELEASE** (2026-10-18)
Branch: `feat/phase2-runtime-integration`
PR: #12 (Draft; do not merge to `main` before full QA)

## Verified automated gates

- [x] TypeScript, unit tests, production build: GitHub Actions runs [39085900763](https://github.com/AndyKao-commits/Poe-game-star/actions/runs/39085900763) and [39085903934](https://github.com/AndyKao-commits/Poe-game-star/actions/runs/39085903934), passing on commit `ec21202f71170ff3cf6ebb3efb030fcc2ec26761`.
- [x] Playwright Chromium/WebKit E2E on the same commit.
- [x] C inventory gating of A skill controls, equipment/HUD synchronization, damage/death/respawn regression tests.
- [x] Art D PNG contract for all 13 files and browser texture loading.
- [x] Sentinel frame and hit-effect nontransparent pixel assertions.

## Manual / device release blockers — NOT verified

- [ ] **iPhone Safari actual device**: landscape, virtual joystick + skill simultaneous touch, pinch/double-tap handling, orientation changes, safe area, inventory modal tap targets, death/restart.
- [ ] **Art D visual approval**: inspect Sentinel 4 x 5 frames and Hit 48 x 48 effect in actual gameplay at target size, compare against approved 2D art direction. Both were regenerated as replacement artwork after invalid PNG payloads; automated pixel validation is not art-direction approval.
- [ ] **Combat gameplay acceptance**: confirm intended design that enemy AI and damage continue while inventory is open; check fairness and HUD/health synchronization on a real device.
- [ ] **Performance acceptance**: sustained play on target iPhone; record FPS, touch latency, memory stability, and any asset-loading errors.
- [ ] **Owner sign-off**: record reviewer, device/iOS/browser version, evidence, unresolved defects and disposition before considering merge or deployment.

## Release decision

Automated gates pass at the baseline SHA above. This checklist does **not** authorize merging, deploying or replacing production artwork. Rerun all automated gates after any new commit and record that new SHA. Keep PR #12 in Draft until all blockers are resolved.
