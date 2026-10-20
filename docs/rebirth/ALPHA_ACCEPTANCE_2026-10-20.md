# Rebirth private Alpha acceptance — 2026-10-20

**Scope:** `feat/rebirth-v1` only; private Chapter 1 alley prototype. **Not** a public-release approval, physical-phone acceptance, or art sign-off.

## Verified

- GitHub Actions [39350087164](https://github.com/AndyKao-commits/Poe-game-star/actions/runs/39350087164) at `a05bd28`: **SUCCESS**, including TypeScript, Vitest (225 tests at that revision), boundary check, production build, real Phaser scene boot and multi-touch **after retry**, Chromium/WebKit smoke, emulated landscape controls. This is browser emulation, not a physical iPhone.
- New gameplay-domain acceptance suite `tests/unit/rebirth-alley-playthrough.test.ts` (`a76b25e`, corrected `2e9c600`) covers normal held-basic combat against default-HP enemies in deterministic close-range positions, victory unlocking exit, optional evidence persistence, completion at exit, fresh-run reset, and death overriding exit.
- Isolated Vercel sandbox with the corrected test content: TypeScript **PASS**, **227 Vitest tests PASS**, release import boundary **PASS**, Vite build **PASS**. Note sandbox was checked out at `a76b25e` and the one-line unused-variable correction from `2e9c600` was applied locally before QA. Await the exact HEAD GitHub workflow before asserting browser success for the new test revision.
- Phaser bundle remains large (~1.48 MB minified, ~340 kB gzip); build warning, not a blocker by itself.

## Acceptance matrix

| Acceptance gate | Evidence | Status |
| --- | --- | --- |
| TypeScript, unit, build, public-entry isolation | Sandbox full run (227 tests) | PASS |
| Real Phaser boots with checked-in candidate art | GitHub Actions 39350087164 | PASS in emulated browsers |
| Joystick + attack and attack release after restart | GitHub Actions 39350087164 | PASS in Chromium CDP |
| Full combat → clue → exit → replay domain transitions | New integrated domain suite | PASS (domain only) |
| Full combat → clue → exit → replay using on-screen controls | Not automated yet | **NOT VERIFIED** |
| Player outcome/restart UI across Chromium and WebKit | GitHub Actions 39350087164 restart smoke | PASS (basic replay) |
| Actual iPhone Safari landscape, safe-area, multi-touch, FPS | No physical device session | **NOT VERIFIED** |
| Original character/environment art visual owner approval | Candidate art only | **PENDING** |
| Authorized private Alpha testing URL | No confirmed current URL | **BLOCKED** |
| Public game release gate | Must remain locked | LOCKED (correct) |

## Findings and next work

1. **P0:** Make private Alpha reachable through a confirmed, access-controlled testing URL **without** changing the public `main` release entry. Do not claim deployment before checking actual URL.
2. **P0:** Automate actual UI-controlled full alley run; unit-domain simulation is insufficient for on-device interaction.
3. **P0:** Owner physical iPhone landscape QA: rotate; tap Start; steer while holding attack; use punch/dash; kill two enemies; approach drain; reach exit; restart; confirm touch release, visual layout, no stuck inputs, no clipped buttons. Record device/iOS version and screenshots.
4. **P1:** Fix any physical UX issues and art/layout discrepancies before new Chapter 1 environments.
5. **P1:** Investigate Phaser payload and mobile frame time with measurements before optimization.
6. **P1:** Ensure future external-game research stays in `REFERENCE_RESEARCH_LOG.md` and does not contribute code or assets.

**Decision:** engineering/domain acceptance **PARTIAL PASS**. **Private player testing NOT YET DELIVERED**. **Public release NOT APPROVED**.
