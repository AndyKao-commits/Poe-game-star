# Rebirth — Execution Board
Updated: 2026-10-19
Source of truth: [GAME_CONTRACT.md](./GAME_CONTRACT.md)
Branch: feat/rebirth-v1
Status: IN PROGRESS (isolated Rebirth combat rules implemented; not wired to gameplay)

## Verified baseline audit
- Existing repository README identifies Vite + TypeScript + Phaser 3, Vitest and Playwright.
- Existing `src/main.ts` boots `createGameConfig` into `#game-root`.
- Existing `src/game/scenes/GameScene.ts` uses `createRuinTestMap()` and `renderTileMap()`; **legacy ruin content must be replaced for Rebirth**.
- Existing scene includes `InputController`, `TouchControlsOverlay`, `OrientationGate`, `SafariGestureGuard`, `InputDebugHud`, HUD, enemy/player controllers. These are reuse candidates only; suitability has not been tested.
- Existing `index.html` still titles the app "Ashen Reliquary — Phase 1"; do not treat it as a Rebirth build.
- Existing `package.json` exposes typecheck, unit tests, build, and Playwright E2E. No tests were run in this audit.

## Implementation milestones (in order)
### M0: Isolated baseline and audit
- [x] Create dedicated branch feat/rebirth-v1.
- [x] Commit authoritative game contract.
- [x] Record initial engineering audit and task order.
- [ ] Finish inspecting input/controller, game config, HUD, map interfaces, assets, save subsystem, existing test suites.
- [x] Reviewed legacy combat damage, input controller and touch overlay; documented divergence from Rebirth.
- [ ] Run local `npm ci`, `npm run typecheck`, `npm test`, `npm run build` where runner is available; record actual results.

### M1: Mobile-first Rebirth shell
- [x] Switch existing prototype scene to a Rebirth-specific modern alley map blueprint (art and battle logic still legacy placeholders).
- [ ] Preserve working landscape orientation hints and safe-area touch controls; adjust for two active skills.
- [ ] Implement movement + hold-to-attack and basic cooldown/MP feedback.
- [ ] Unit tests for control state and viewport layout; mobile browser smoke tests.

### M2: Combat vertical slice
- [x] Implement independent player/enemy v0.7 stats and damage formula; added unit tests (NOT RUN).
- [ ] Wire dash and magical punch to game scene (pure skill cooldown/MP gate implemented, not integrated).
- [ ] Three enemy archetypes with telegraphs and fair damage windows.
- [ ] Boss 阿彪 phase 1/2 and weak point; test thresholds and recovery.
- [ ] No claim of balance until mobile playtests.

### M3: Exploration / roguelite loop
- [ ] Guided opening, branching encounter/event/loot rooms.
- [ ] Six run-only boosts, random seed for reproducible test runs.
- [ ] Death/retry/return-to-safehouse flow.
- [ ] Permanent equipment, workbench, research, intel facilities.
- [ ] Versioned persistent save, migration tests and recovery.

### M4: Story, art, performance and acceptance
- [ ] Integrate first chapter scenes and localized Taiwanese dialogue.
- [ ] Establish coherent urban art palette, animations, VFX, sound.
- [ ] iPhone Safari and Android Chrome real-device tests.
- [ ] QA regressions, performance measurements, accessibility and save recovery.

## Autonomous work protocol
1. Read GAME_CONTRACT.md before every cycle.
2. Confirm branch and last commit; check if any parallel changes occurred.
3. Choose a single small task from the earliest incomplete milestone.
4. Implement without changing locked pillars; append a decision-log entry for significant refinements.
5. Run available tests and report PASS / FAIL / NOT RUN separately.
6. Record changed files, commit SHA, blockers and next task.
7. Do not merge main, force push, delete legacy, or production deploy without approval.

## Execution log
### 2026-10-19 — Cycle 0
- Verified repository and source of truth on dedicated branch.
- Inspected README, package.json, src/main.ts, src/game/scenes/GameScene.ts and index.html.
- Determined reuse candidates and risk: old scene still builds a ruin map; mobile shell exists but Rebirth gameplay is not implemented.
- Added execution board; next task is detailed interface and test audit.
- Validation: GitHub file reads and successful file commit only. Typecheck/unit/E2E/mobile QA: NOT RUN.

### 2026-10-19 — Cycle 1: Rebirth combat core
- Inspected existing `src/core/combat/damage.ts` and `tests/unit/damage.test.ts`: legacy player HP100/MP50/DEF5 and defense curve d/(d+100) conflict with Rebirth v0.7.
- Inspected `src/game/input/InputController.ts` and `src/ui/touchControls.ts`: touch overlay still displays disabled placeholder Q/E/dodge buttons; Rebirth skills are NOT yet wired.
- Added `src/rebirth/core/combat.ts` with isolated Rebirth player/enemy defaults, damage curve, skill cooldown/MP state and boss phase threshold. Commit: `2f8b623`.
- Added `tests/unit/rebirth-combat.test.ts` covering core damage, skill gates, MP recovery and boss phases. Commit: `c0d246d`.
- Tests/typecheck/build/mobile QA: NOT RUN in this cycle (GitHub connector supports file operations, not a local test runner). These tests are authored, not verified.
- Next: run CI/local checks, then connect Rebirth input and first urban scene without changing the legacy scene in main.

### 2026-10-19 — Cycle 2: first chapter urban alley map
- Read GAME_CONTRACT and inspected current Rebirth execution board, legacy scene/config/map/collision and player/enemy controllers.
- Added `src/rebirth/map/urbanAlley.ts`: contemporary Taiwan alley collision blueprint with shopfronts, roadside scooters, snack stall, parking entrance, five valid enemy spawn points. Commit `9375aae`.
- Updated only the Rebirth branch `src/game/scenes/GameScene.ts` to instantiate the new alley instead of the legacy ruin map. Commit `045a2aa`.
- Added `tests/unit/rebirth-urban-alley.test.ts` covering landmarks, spawn clearance and border collision. Commit `3e73d9a`.
- Caveat: the existing tile textures and combat controllers are still legacy placeholders; this is NOT a finished modern-Taiwan art scene, and the new combat core is NOT connected yet.
- Validation: GitHub commits successful; Vitest/typecheck/build/E2E/real-device QA NOT RUN. Do not claim this map is verified in a browser.
- Next: run CI/typecheck and smoke test the alley; build dedicated Rebirth mobile input + two usable skill buttons, then integrate isolated combat stats/damage.

### 2026-10-19 — Cycle 3: visual refresh, mobile-first Rebirth shell
- User explicitly rejected old page appearance; implemented a new modern Taiwan urban-magic HUD skin on Rebirth branch only.
- `index.html`: new page title, description, mobile browser theme color; removed legacy ruin-tile favicon. Commit `1cf3872`.
- `src/ui/hud.ts`: urban chapter header, revised health/mana labels and initial placeholders, new death/retry copy. Commit `1531965`.
- `src/ui/orientationGate.ts`: updated mobile landscape guidance and chapter tone. Commit `b30a07e`.
- `src/styles.css`: added neon cyan/coral urban styling, rounded glass panels, compact landscape sizing, reduced-motion support. Commit `098dfae`.
- Functional limits: styling only; legacy combat stats, legacy tile textures, disabled skill buttons and input behavior remain until separately integrated. HUD placeholder HP/MP labels are NOT proof actual player values are Rebirth values.
- Validation: GitHub commits successful. Typecheck, unit tests, build, browser screenshot and physical phone QA NOT RUN. Visual design is not yet approved by actual screenshots/device tests.
- Next: integrate new Rebirth stats into game controllers and wire two usable touch skills; then inspect browser rendering and adjust touch occlusion.
