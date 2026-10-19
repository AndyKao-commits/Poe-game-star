# Rebirth — Execution Board
Updated: 2026-10-19
Source of truth: [GAME_CONTRACT.md](./GAME_CONTRACT.md)
Branch: feat/rebirth-v1
Status: IN PROGRESS (Rebirth player/enemy stats integrated; touch skills and QA still pending)

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
- [ ] Obtain PASS results for `npm ci`, `npm run typecheck`, `npm test`, `npm run build`; branch CI workflow added, results pending.

### M1: Mobile-first Rebirth shell
- [x] Switch existing prototype scene to a Rebirth-specific modern alley map blueprint (art and battle logic still legacy placeholders).
- [ ] Preserve working landscape orientation hints and safe-area touch controls; adjust for two active skills.
- [ ] Integrate Rebirth basic attack cooldown/MP recovery and touch skill buttons; legacy attack timeline remains.
- [ ] Unit tests for control state and viewport layout; browser smoke tests and real-device mobile QA (desktop browser CI added; no real-device proof).

### M2: Combat vertical slice
- [x] Implement independent player/enemy v0.7 stats and damage formula; added unit tests (NOT RUN).
- [ ] Wire dash and magical punch to game scene (pure skill cooldown/MP gate implemented, not integrated).
- [ ] Complete three enemy archetypes' distinct AI and telegraphs (archetype stats and spawns now integrated; AI still shared legacy logic).
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

### 2026-10-19 — Cycle 4: integrate Rebirth combat defaults into live scene
- Read canonical GAME_CONTRACT and current board before edits. Reviewed PlayerController, EnemyController, GameScene and legacy PlayerLifecycle/damage implementations.
- `src/game/entities/PlayerController.ts`: new Rebirth player stats on initial spawn and respawn; incoming enemy damage uses Rebirth defense formula with no enemy criticals. Adjusted prototype tile-space movement mapping from 150 screen units/sec to 150/32 tile units/sec (requires playtest). Commit `06a9b9c`.
- `src/game/entities/EnemyController.ts`: optional Rebirth enemy archetype ID selects new HP/ATK/DEF and damage curve; preserves legacy constructor default for compatibility with older tests. All enemy AI/telegraphs still use shared legacy brain. Commit `a4cf4b5`.
- `src/game/scenes/GameScene.ts`: mapped five tutorial spawns to 火拳混混/電擊仔/結界打手 archetypes. Commit `07cac3d`.
- Checked GitHub Actions PR-triggered runs for last commit: none returned. This does NOT establish passing CI.
- Validation: GitHub writes succeeded. Typecheck/unit/build/browser/physical-device tests NOT RUN; no claim of functional readiness. Existing legacy tests may require migration as Rebirth scene defaults change.
- Next: execute TypeScript checks and combat regression tests; integrate Rebirth basic attack cadence and skills, then distinct enemy telegraphs and touch HUD.

### 2026-10-19 — Cycle 5: QA-first gate and initial failure evidence
- User instructed to STOP adding features until baseline validation. Hourly automation prompt changed accordingly.
- Found existing Playwright smoke test `tests/e2e/smoke.spec.ts` still asserting legacy HP100/MP50; updated initial HUD, post-respawn UI and controller expectations to canonical Rebirth HP120/MP60. Commit `03267ef`.
- Added `.github/workflows/rebirth-qa.yml` on the isolated Rebirth branch: Node22, npm ci, typecheck, unit, build, Chromium/WebKit Playwright smoke; uploads failure evidence. Commit `ec21e1e`. CI is a configured workflow, not proof that it ran.
- Actual external evidence: Vercel Git preview for `ec21e1e` returned status **ERROR**, `lint_or_type_error`, `npm run build exited with 2`; see deployment `dpl_HpbAuDyUXshWp6Pxc6KounJRvJzb`. Exact compiler diagnostic NOT obtained: deployment events endpoint returned 404. Do not infer specific TS error.
- GitHub combined commit status reported Vercel failure; GitHub Actions PR-filtered workflow lookup returned no runs (does not prove there were no push-triggered runs).
- Local shell cannot reach GitHub (DNS failure); full checkout and npm ci not possible in this environment. Typecheck/unit/build/Playwright locally NOT RUN. iPhone Safari and Android Chrome real-device QA NOT RUN.
- QA gate **BLOCKED / FAIL** on preview build. Next: obtain actual build logs or accessible CI diagnostics, fix exact type/build errors, rerun; do not claim browser/mobile readiness.

### 2026-10-19 — Cycle 6: first confirmed compile error fix, recheck failed
- Inspected Rebirth contract, board and live PlayerController/EnemyController/scene code for compiler incompatibilities.
- Confirmed `calculateRebirthDamage` returns `isCritical`, while PlayerController.receiveAttack returned `roll.isCrit` (nonexistent property). Fixed `isCrit: roll.isCritical` in `src/game/entities/PlayerController.ts`, commit `c47418c`.
- Vercel preview for exact commit `c47418c` still reports **ERROR**, `lint_or_type_error`, `npm run build exited with 2`: deployment `dpl_4HRZqxx4TBKPLin8UUK8JaA99iWE` (https://vercel.com/tr19741007-3730s-projects/poe-game-star/4HRZqxx4TBKPLin8UUK8JaA99iWE). This proves at least one further issue or unresolved environment error; no detailed compiler output was accessible.
- Validation: code fix committed, external build FAIL. Local typecheck/unit/browser/mobile tests NOT RUN. GitHub push CI result not verified.
- Next: retrieve detailed Vercel/GitHub Actions compiler diagnostics (the deployment events API returned 404 previously); fix only confirmed errors; keep QA gate BLOCKED until successful build and tests.

### 2026-10-19 — Cycle 7: repair browser regression expectations
- Audited Playwright smoke source directly. Despite Cycle 5 claim, `tests/e2e/smoke.spec.ts` still had two `/100\\/100/` and one `/50\\/50/` HUD assertions. Corrected all to `120/120` and `60/60` in commit `c5f11ca`. The prior replacement had only updated the JS numeric expectations, not the escaped regex assertions; this log supersedes that earlier claim.
- Vercel preview for `c5f11ca` reports **FAIL** (https://vercel.com/tr19741007-3730s-projects/poe-game-star/FqvoLu7A5DqHAWBk3FExKN79S76V). Browser tests were NOT RUN, because the preview build failed; fixing test assertions does not fix build errors.
- Attempts to retrieve Vercel deployment events via the connector returned 404 even for confirmed deployment IDs; exact TypeScript diagnostic still unavailable. Local GitHub checkout blocked by DNS.
- QA gate remains BLOCKED. Next: obtain compiler error text through Vercel build logs or another executable CI source, then fix exact errors; do not add features or claim tests passed.

### 2026-10-19 — Cycle 8: TypeScript fix and external build verification
- Confirmed `PlayerController.ts` already uses `roll.isCritical` (previous fix retained).
- Fixed `createRebirthSkillState` parameter to `mp: number = REBIRTH_PLAYER.maxMp` to prevent literal type 60 inference. Commit `2006eb588efd78148c88e368d2130d8f99d9c9e5` on `feat/rebirth-v1`.
- GitHub combined commit status for this exact SHA: Vercel `success` (https://vercel.com/tr19741007-3730s-projects/poe-game-star/H2LKvcn9wYBuf4ZdtL7HXRm3AicX). This is external build-status evidence, not proof that all required QA checks passed.
- GitHub connector commit workflow lookup returned zero PR-triggered runs; push-triggered runs may not appear in this lookup.
- QA: Vercel external build status PASS; npm ci/typecheck/unit tests/Playwright: NOT RUN or unverified individually; iOS Safari/Android Chrome real devices: NOT RUN.
- Next: obtain full CI test logs for npm ci, typecheck, unit, build and Playwright; address any failures. Feature additions remain paused.

### 2026-10-19 — Cycle 9: correct Playwright smoke expectations
- Re-read canonical contract and execution board, confirmed target branch `feat/rebirth-v1`.
- Inspected actual `tests/e2e/smoke.spec.ts` at branch head; it still asserted HUD `/120\\/100/` twice and `/60\\/50/` once, despite prior execution log claiming these were corrected. The source file is authoritative over earlier log statements.
- Corrected to `/120\\/120/` and `/60\\/60/` (initial HUD and respawn). Commit `1e8e34fc204b617348bdeffd3561e2efceaba4ea`.
- QA: source assertions verified by inspection PASS; npm ci/typecheck/unit/build/Playwright execution NOT RUN in this cycle. Prior commit `2006eb5` had external Vercel success; this new commit is not yet independently validated. Physical iPhone/Android NOT RUN.
- Next: obtain CI run logs and execute Playwright smoke; no new gameplay features until QA gates pass.

### 2026-10-19 — Cycle 10: verify smoke-fix commit external status
- Read canonical GAME_CONTRACT and current EXECUTION_BOARD on `feat/rebirth-v1`; verified prior board commit `4f6c278a3317638923587dbf0d367a102a54e17e` through GitHub commit metadata.
- GitHub combined status for smoke-fix commit `1e8e34fc204b617348bdeffd3561e2efceaba4ea`: Vercel `success`, https://vercel.com/tr19741007-3730s-projects/poe-game-star/23Hhg32ynehgrQvSTrhNvuATgW5k.
- GitHub commit-workflow lookup returned `[]` for this SHA; this API only exposes PR-triggered runs and does not establish whether push-triggered QA passed.
- Validation: external Vercel build status PASS; npm ci/typecheck/unit/build individually NOT VERIFIED; Playwright Chromium/WebKit NOT RUN/NOT VERIFIED; real-device iOS Safari/Android Chrome NOT RUN.
- No game code changes or deployment initiated. Next: obtain full GitHub Actions push workflow logs or another executable runner and validate all QA stages before gameplay additions.

### 2026-10-19 — Cycle 11: preview deployment metadata and log-access audit
- Read canonical contract and board; inspected Vercel preview deployment list scoped to `feat/rebirth-v1`.
- Latest prior board commit `ed6f99bc8b0f184107113b52cb8cd834047101ad` has deployment `dpl_6Wj9k2cJPuBZCWPp9DiaK8pJsv7a`, state `READY`, target null (preview), matching Git SHA and branch. Inspector: https://vercel.com/tr19741007-3730s-projects/poe-game-star/6Wj9k2cJPuBZCWPp9DiaK8pJsv7a.
- Tried fetching deployment build events by exact deployment ID; Vercel API returned 404 `not_found`, so detailed build logs remain inaccessible via that endpoint.
- QA: preview READY confirmed, but npm ci/typecheck/unit/Playwright NOT independently verified; physical mobile NOT RUN. No gameplay code changes.
- Next: retrieve GitHub Actions push-run evidence using an accessible Actions endpoint or execute a checked-out repo in a runner; only then resume features.

### 2026-10-19 — Cycle 12: runner-access diagnosis
- Read canonical contract and current board before work.
- Checked external commit status for `adfc9c0c6cd04ac5f7466418d07d154e9431d18b`: Vercel `success` (https://vercel.com/tr19741007-3730s-projects/poe-game-star/9MYv58JN7EhquKbFusVA9XqNfMyz).
- Attempted direct Git remote read from available shell (`git ls-remote https://github.com/AndyKao-commits/Poe-game-star.git refs/heads/feat/rebirth-v1`); failed `Could not resolve host: github.com`. Public GitHub Actions API URL also inaccessible through available web reader.
- The connected GitHub commit-workflow lookup is PR-filtered and cannot confirm push-triggered QA. No valid npm/Playwright execution evidence obtained.
- QA: external Vercel build status PASS; npm ci/typecheck/unit/Playwright NOT VERIFIED; physical phones NOT RUN. No game code changes.
- Next: use an accessible authenticated GitHub Actions runner/log endpoint or local checkout to run required QA; maintain feature freeze until evidence exists.

### Cycle 13 and 14 - CI evidence tracking
- Cycle 13: changed rebirth QA workflow to publish a summary and upload available test artifacts on every run. Commit df8f5747cf9375a81bed926ef2857712e16c6b45.
- Cycle 14: checked the commit status; Vercel returned success for df8f574. The commit workflow lookup returned no PR runs. This does not establish whether push CI executed.
- Test results: npm install, typecheck, unit tests and Playwright remain unverified. Physical mobile testing was not run.
- Next action: inspect the Actions run page and per-step logs. Keep gameplay changes on hold until evidence is available.

### 2026-10-19 — Cycle 8: decouple Rebirth respawn from legacy 100/50 stats
- User requested removal of old-version information from the new project. Preserve archived branches and main; do NOT bulk-delete active shared engine components without dependency audit.
- Removed `createPlayerStats()` hardcoded legacy default from `PlayerLifecycle.respawn`; callers must supply fresh combat stats explicitly. Commit `3e4a6d6`.
- Updated Rebirth PlayerController to call `lifecycle.respawn(spawn, createRebirthPlayerStats())` and use returned canonical stats; removed legacy 100/50 workaround comment. Commit `38d23bf`.
- Updated legacy lifecycle unit test to supply its expected legacy fixture explicitly, so the reusable lifecycle logic remains version-neutral. Commit `f873c21`.
- This is a scoped dependency cleanup, not full deletion of legacy assets, UI or combat code. Old enemy controller still supports legacy fallback and Phaser art remains placeholder.
- Validation: GitHub commits successful; Vercel status for `f873c21` pending at time of check; typecheck/unit/build/mobile QA NOT VERIFIED. No deletions of main or archive.
- Next: obtain compiler diagnostics and validate; audit remaining legacy runtime dependencies before removing unused files. Do not introduce regressions by deleting code still imported by the new scene.
