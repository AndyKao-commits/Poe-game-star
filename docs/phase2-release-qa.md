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

## Latest automation checkpoint (2026-10-18)

- [x] Commit `1a5e7843ef13efe4d976ea61d4a1cd4980ac8a0a` passed both integration workflows: [Push #39087693082](https://github.com/AndyKao-commits/Poe-game-star/actions/runs/39087693082), [PR #39087695476](https://github.com/AndyKao-commits/Poe-game-star/actions/runs/39087695476).
- [x] Browser-simulated portrait → landscape transition, inventory modal state, and mobile Q/E/dodge state restoration.
- [ ] iPhone hardware Safari validation has **not** been run or signed off. Browser WebKit simulation is not a substitute.

## iPhone Safari hands-on test procedure (release blocking)

Capture iPhone model, iOS version, Safari version, orientation, tested URL / commit SHA, tester, time, and evidence (screen recording or screenshots). Test a production-like **nonproduction** build only when an authorized test environment exists; do not deploy to production for this checklist.

1. **First load:** open the game in Safari, verify a playable canvas, no blank textures, no stuck loading screen and no uncaught errors.
2. **Rotation:** begin in portrait, verify rotate prompt and hidden game touch controls; rotate to landscape, verify HUD and touch controls appear; repeat twice and check touch hit targets remain aligned.
3. **Two-thumb combat:** hold the movement joystick and repeatedly attack or cast Q/E/dodge with another finger; verify movement continuity, single casts per tap and correct mana/stamina/cooldown updates.
4. **Inventory overlay:** open inventory while holding movement or attack; verify player inputs stop, Q/E/dodge disabled states, equip/unequip changes HUD stats, close modal and confirm no stale pressed inputs or disabled skills.
5. **Damage and death:** take damage with inventory open, verify HP display and intended monster behavior; die, verify modal closes and controls lock; restart and check combat stats, equipment, HP and touch controls.
6. **Safari gestures and safe areas:** test edge swipes, double tap and two-finger gestures with the game in landscape; verify no accidental page zoom/scroll, controls outside notch/home indicator, and no obscured inventory buttons.
7. **Art D visual sign-off:** watch all Sentinel idle/chase/hurt/windup/attack animations and Hit effect in gameplay; compare color, silhouette, timing and pixel density to the approved 2D art direction. Replacement images are **not approved by automated pixel checks**.
8. **Sustained play:** complete a continuous play session while monitoring FPS, input responsiveness and resource use; record duration, observations, defects and severity.

Each step must be marked Pass / Fail / Not tested, with evidence attached. Any P0/P1 issue blocks release. Missing evidence must remain **Not tested**, never inferred as Pass.

## Manual / device release blockers — NOT verified

- [ ] **iPhone Safari actual device**: landscape, virtual joystick + skill simultaneous touch, pinch/double-tap handling, orientation changes, safe area, inventory modal tap targets, death/restart.
- [ ] **Art D visual approval**: inspect Sentinel 4 x 5 frames and Hit 48 x 48 effect in actual gameplay at target size, compare against approved 2D art direction. Both were regenerated as replacement artwork after invalid PNG payloads; automated pixel validation is not art-direction approval.
- [ ] **Combat gameplay acceptance**: confirm intended design that enemy AI and damage continue while inventory is open; check fairness and HUD/health synchronization on a real device.
- [ ] **Performance acceptance**: sustained play on target iPhone; record FPS, touch latency, memory stability, and any asset-loading errors.
- [ ] **Owner sign-off**: record reviewer, device/iOS/browser version, evidence, unresolved defects and disposition before considering merge or deployment.

## Release decision

Automated gates pass at the baseline SHA above. This checklist does **not** authorize merging, deploying or replacing production artwork. Rerun all automated gates after any new commit and record that new SHA. Keep PR #12 in Draft until all blockers are resolved.
