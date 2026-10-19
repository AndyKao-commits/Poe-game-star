# Rebirth — Execution Board
Updated: 2026-10-19
Source of truth: [GAME_CONTRACT.md](./GAME_CONTRACT.md)
Branch: feat/rebirth-v1
Status: BLOCKED — v0.7.2 zero-placeholder / zero-legacy-reference requirement not met; build and device QA not verified.

## Current execution order — reset 2026-10-19
1. P0: enforce Rebirth-only runtime import boundary and maintain the non-playable gate; never consult legacy source or assets.
2. P0: obtain verifiable npm ci, typecheck, Vitest, build and desktop Chromium/WebKit Playwright results. Vercel build success alone is insufficient.
3. P1: produce and visually approve purpose-made final Rebirth artwork per ART_PRODUCTION_SPEC; no placeholder assets.
4. P1: implement Rebirth-owned scene, touch input and combat only after corresponding final assets and QA prerequisites exist.
5. P2: add exploration, persistence and story incrementally with tests, then separately verify physical iOS Safari and Android Chrome.
All work stays on feat/rebirth-v1. No main merge, production deploy, legacy inspection or readiness claims without evidence.


## Verified baseline audit
- Existing repository README identifies Vite + TypeScript + Phaser 3, Vitest and Playwright.
- Existing `src/main.ts` boots `createGameConfig` into `#game-root`.
- Existing `src/game/scenes/GameScene.ts` uses `createRuinTestMap()` and `renderTileMap()`; **legacy ruin content must be replaced for Rebirth**.
- Existing scene includes `InputController`, `TouchControlsOverlay`, `OrientationGate`, `SafariGestureGuard`, `InputDebugHud`, HUD, enemy/player controllers. These are reuse candidates only; suitability has not been tested.
- Existing `index.html` still titles the app "Ashen Reliquary — Phase 1"; do not treat it as a Rebirth build.
- Existing `package.json` exposes typecheck, unit tests, build, and Playwright E2E. No tests were run in this audit.

## New owner mandate — v0.7.2 (2026-10-19)
- [x] Lock canonical contract against all placeholder art and legacy-game reference (commit `7e664fe`).
- [x] Update hourly automation to prohibit consulting legacy and to prioritize removing runtime dependencies.
- [x] Remove automatic placeholder generation from dev/build scripts and delete `scripts/generate-placeholders.mjs` on Rebirth branch (commits `f04fcc7`, `fa5a023`).
- [ ] Replace `BootScene.ts` image/spritesheet loading of `/assets/tile-*.png`, `/assets/player.png`, `/assets/enemy.png`, `/assets/slash.png` with purpose-built **final** Rebirth artwork, approved against the Rebirth art specification. These are currently active legacy/placeholder visuals; do not describe the current build as compliant.
- [x] Switch active site bootstrap to Rebirth-only config and an asset-free release gate (commits `b1d810a`, `0372c06`, `a419161`); old scene and tile renderer remain in repository but are no longer loaded by `src/main.ts`.
- [ ] Build the actual Rebirth gameplay renderer and replace legacy tile renderer/isometric architecture with Rebirth-specific implementation built only from current contract.
- [ ] Remove runtime imports of legacy combat defaults and enemy fallbacks; isolate or replace shared lifecycle/input systems without consulting old versions for design.
- [ ] Clean out obsolete legacy files and test fixtures from Rebirth branch only after reference audit and successful checks. Preserve `main` and archive branches untouched.
- [x] Replace legacy gameplay Playwright smoke assertions with release-gate-specific tests; browser execution still NOT RUN (commits `0411a3f`, `93dd9d8`).
- [ ] Complete QA (typecheck, unit, build, browser, physical devices). No playable/release acceptance until both new art and QA pass.

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
- [x] Establish first-batch official art production specification and acceptance criteria (`docs/rebirth/ART_PRODUCTION_SPEC.md`, commit `bd7d4ab`); **no finished artwork delivered**.
- [ ] Produce coherent final urban artwork, animations, VFX and sound.
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

### 2026-10-19 — Cycle 9: enforce owner-directed clean break
- Owner explicitly prohibited **any temporary assets** and **any consultation/reference to the old version**, as the new canonical specification is complete.
- Updated GAME_CONTRACT to v0.7.2 commit `7e664fe`, making zero placeholders and zero legacy references hard requirements.
- Updated and re-enabled hourly automation with this strict rule. Historical branches are excluded from further development work.
- Current Rebirth branch **does not yet meet the rule**: `BootScene.ts` actively loads `/assets/tile-floor.png`, `/assets/tile-wall.png`, `/assets/tile-obstacle.png`, `/assets/tile-void.png`, `/assets/player.png`, `/assets/enemy.png`, `/assets/slash.png`; the scene still uses older TileRenderer/WorldEntity architecture. These need genuine Rebirth replacements, not renamed old files.
- Validation: policy and documentation GitHub commits only; asset replacement, build, unit, browser, physical-device QA NOT RUN/NOT COMPLETE. Release gate remains BLOCKED.

### 2026-10-19 — Cycle 10: remove automatic placeholder generation
- Per owner mandate v0.7.2, removed `generate:assets`, `predev`, `prebuild` from Rebirth `package.json` and updated project description. Commit `f04fcc7`.
- Deleted `scripts/generate-placeholders.mjs` on Rebirth branch only. Commit `fa5a023`. Neither main nor archived branches modified.
- Scope is **asset-generation pipeline only**. Existing static PNG files and `BootScene` references remain and violate v0.7.2; no compliant gameplay preview can be claimed. Next: replace active boot path with Rebirth-only implementation after approved purpose-made art exists; do not use temporary sprites or regenerate placeholders.
- Validation: GitHub file writes PASS. npm ci/typecheck/unit/build/Playwright/real devices NOT RUN in this cycle. Existing preview status must be checked separately.

### 2026-10-19 — Cycle 11: independent Rebirth bootstrap
- Created `src/rebirth/scenes/RebirthEntryScene.ts` (commits `b1d810a`, `6d10bd6`): asset-free, honest non-playable release gate with status text; loads no sprites or temporary artwork.
- Created `src/rebirth/config.ts` (commit `0372c06`) with Phaser configuration that registers only the Rebirth entry scene.
- Updated `src/main.ts` to instantiate `createRebirthGameConfig` instead of the old `createGameConfig` (commit `a419161`). The active entry path no longer imports old game scenes, textures or animation loaders. Old source files remain physically present and are NOT yet removed.
- This deliberately disables the legacy gameplay rather than passing it off as Rebirth. The actual Rebirth combat renderer, official art, touch controls and mobile gameplay remain NOT IMPLEMENTED; legacy Playwright smoke assertions for gameplay must be rewritten to match the release gate until actual gameplay exists.
- Validation: GitHub writes PASS; local npm/typecheck/unit/build/browser/physical phone tests NOT RUN. Preview status to be checked; no production deployment.
- Next: create Rebirth-only art production specification and final assets, then add a new gameplay scene only when complete assets exist; update QA to distinguish gate page from playable release.

### 2026-10-19 — Cycle 12: align browser QA with the new release gate
- Replaced `tests/e2e/smoke.spec.ts` assertions tied to the removed legacy active scene with two Rebirth-specific checks: only `RebirthEntryScene` active, release-blocking text present, no extra image textures, and viewport resize response. Commits `0411a3f`, `93dd9d8`.
- Browser test source now matches the non-playable Rebirth-only bootstrap; **this does not imply playable combat is tested or present**. Gameplay acceptance tests must be authored separately when the Rebirth gameplay scene exists.
- GitHub file writes PASS. Vercel combined status for `93dd9d8`: PENDING (https://vercel.com/tr19741007-3730s-projects/poe-game-star/4o89MNxYZC7VuEKT96XTprSe8ugY). npm ci/typecheck/unit/build/Playwright/mobile device execution: NOT RUN in this cycle.
- Next: produce a detailed official Rebirth art specification and asset manifest, then implement purpose-made final sprites/tiles without reusing old art. Keep gate active until asset/QA approval.

### 2026-10-19 — Cycle 13: official art production specification
- Created `docs/rebirth/ART_PRODUCTION_SPEC.md` (commit `bd7d4ab`) based solely on GAME_CONTRACT v0.7.2: orthographic urban visual direction, first-batch manifest (alley tiles, facades, street props, 阿澤, three enemy archetypes, combat VFX and UI icons), authoring/export naming, mobile readability and release gates.
- No legacy source/art consulted; no placeholders created; no image or playable scene represented as complete. Technical sprite/tile sizes are provisional and subject to real device tests. Art direction document is a production specification, not evidence of approved finished art.
- GitHub commit PASS. npm ci/typecheck/unit/build/Playwright/real-device checks NOT RUN for this documentation-only cycle. Gameplay activation remains BLOCKED.
- Next bounded task: produce and review the first Rebirth-exclusive finished visual asset(s) to spec; do not wire incomplete art to runtime. Then implement a Rebirth-owned scene renderer when asset acceptance is met.

### 2026-10-19 — Responsive Rebirth entry gate (bounded UI task)
- Read GAME_CONTRACT v0.7.2 and current board. Only Rebirth-owned entry scene and its smoke test were edited; no legacy files or historical branches consulted.
- Added portrait-only orientation guidance, responsive heading size and constrained text width to `src/rebirth/scenes/RebirthEntryScene.ts`. Commit `ae983e16b0ce572f5382671a38f9c8847c2dcf37`.
- Added Playwright assertion for landscape hidden / portrait visible orientation guidance and narrow viewport heading bounds to `tests/e2e/smoke.spec.ts`. Commit `3de80fdd4fdeaab908bf52bc09f686bca8032626`.
- Evidence: GitHub file writes PASS; Vercel status for `3de80fd` PENDING at inspection (https://vercel.com/tr19741007-3730s-projects/poe-game-star/37jJGES64cqQZ8ZLs2V6veHutJV1). npm ci/typecheck/unit/build/Playwright NOT RUN in this cycle; iPhone Safari and Android Chrome real-device NOT RUN. Do not treat test code as passed execution.
- No artwork added; non-playable release gate remains active. Next: check Vercel and CI logs for the new commit, execute smoke tests, fix any failures before enabling gameplay.

### 2026-10-19 — Cycle: execution reset and runtime boundary QA
- Read GAME_CONTRACT v0.7.2, current execution board, and Rebirth-only runtime files before editing. Verified latest previous board commit 94757eac1ee06d5b14669dc0bd4303d1ad56f585.
- Added `scripts/check-rebirth-boundary.mjs`, a Node-only static guard that traverses the active entry's local import graph but refuses to read paths outside `src/rebirth` (except `src/main.ts`). It rejects unresolved imports, unexpected external dependencies, dynamic imports, forbidden asset paths and changes to the non-playable scene gate. Commit 82bb76adbd727dc7a47959af19d2e9273f9bff41.
- Inserted this check before typecheck in Rebirth GitHub Actions workflow. Commit 3b53e8c5af23820ccc8e8c12c8611bea6379ba62.
- Locally ran `node --check` and positive/negative self-tests against a minimal synthetic Rebirth-shaped fixture: PASS; intentionally unresolved outside-boundary import was rejected as expected. These are script self-tests, NOT the full repository's CI run.
- Vercel commit status for 3b53e8c: PASS (https://vercel.com/tr19741007-3730s-projects/poe-game-star/3pXMzs7RAnsRSnqKhWByS5nq8wLs). GitHub commit-workflow lookup returned no PR-triggered runs; push CI result remains unavailable.
- Full repo npm ci/typecheck/unit/build/Playwright: NOT RUN in this cycle. Physical iOS Safari/Android Chrome: NOT RUN. Release gate remains CLOSED; no finished art delivered.
- Next: obtain actual push-triggered GitHub Actions run logs for boundary guard and full QA; fix failures before enabling gameplay.

### 2026-10-19 — Cycle: Vercel install command correction and asset-request smoke coverage
- Read GAME_CONTRACT v0.7.2 and the current board; verified `package-lock.json` exists on feat/rebirth-v1. Vercel project metadata confirms framework Vite and Node 22.x.
- Added Rebirth entry Playwright smoke assertion that tracks and rejects requests for `/assets/`, `/legacy/` and placeholder/proxy art paths. Commit `0685daf4b3628f43d0fa08f0df566ad6d0917c97`. Test code committed but browser execution NOT RUN.
- Preview build for this commit FAILED: Vercel deployment `dpl_4SE5h2U8tnGjRJSkwBDh3uDLg4X7` reported `BUILD_UTILS_SPAWN_1`, `Command "npm c" exited with 1`. This is a confirmed Vercel install-command configuration error, not a confirmed source/test failure.
- Updated Vercel project install command to `npm ci` through the connected Vercel project settings API. Setting update returned successfully; a subsequent fresh preview build is required to confirm correction. No manual deployment or production promotion performed.
- QA: Vercel deployment FAIL before correction; setting update PASS; npm ci/typecheck/unit/build/Playwright NOT RUN locally, push CI result not accessible, physical devices NOT RUN. Next: verify the next preview deployment after `npm ci` correction, obtain full GitHub Actions logs, repair any genuine failures.

## Sequential execution checklist (2026-10-19; Rebirth-only)
- [x] T01 — Obtain auditable GitHub Actions evidence for npm ci, runtime boundary guard, typecheck, Vitest, build, Playwright Chromium and WebKit. Acceptance: actual run URL, per-step outcomes and logs/artifact; CI configuration alone is NOT PASS.
- [x] T02 — Resolve all failures in T01; verify fresh green run at the exact feat/rebirth-v1 commit. Do not infer CI PASS from Vercel READY.
- [x] T03 — Verify Rebirth active runtime has zero legacy/temporary artwork or code dependencies, including browser network checks.
- [ ] T04 — Produce purpose-made final Rebirth artwork per ART_PRODUCTION_SPEC; inspect and approve each delivered asset before integration. No placeholders.
- [ ] T05 — Integrate Rebirth-owned alley scene, touch movement, attack, skills and enemies only with approved final art and passing prerequisites.
- [ ] T06 — Add exploration, run boosts, persistent gear, safehouse and versioned save with unit/migration tests.
- [ ] T07 — Integrate Chapter 1 narrative, boss, feedback and complete guided loop; repeat QA.
- [ ] T08 — Verify on physical iPhone Safari and Android Chrome, recording devices, OS/browser versions and observed results.
- All tasks are sequential gates. Never consult legacy files/branches or deploy production without approval.

### 2026-10-19 — T01 cycle A: per-step CI evidence
- Re-read GAME_CONTRACT v0.7.2 and EXECUTION_BOARD, verified the existing Rebirth workflow on feat/rebirth-v1 and latest prior board commit 2836597cb8002ec1bd1f00e8e4216d874271f543.
- Updated .github/workflows/rebirth-qa.yml to assign stable step IDs and include each individual outcome (success/failure/skipped) in the GitHub Actions step summary and artifact. Commit 08b439bf628dc879988eed0fa50e850faa6d541b.
- Environment probe: local Node v22.16.0, npm v10.9.2 available; git ls-remote failed with DNS error resolving github.com. Thus full checkout and local npm ci/typecheck/unit/build/Playwright NOT RUN.
- CI run lookup via available GitHub connector remains limited to PR-triggered workflows; push run logs NOT VERIFIED. No claims of test pass. Physical mobile NOT RUN. Next T01 cycle: inspect push-run per-step report on GitHub Actions, or secure a permitted runnable checkout.


### 2026-10-19 — Cycle: executable sandbox QA and Rebirth-only browser scope
- Task: establish actual command-level QA evidence for Rebirth without inspecting legacy source, art or historical branches. Source of truth: GAME_CONTRACT v0.7.2; branch feat/rebirth-v1.
- Created isolated Vercel Sandbox session `sbx_M5hhmEHGSvc67stBL4lwc01oADC0`, checked out exact Git SHA `f89254bf1ddc2ab5433bf4d4863af3dbd1a816cf`; runtime Node 24.21.0 / npm 11.19.0 (different from CI Node 22). No production deployment.
- Initial sandbox `npm ci` at `/vercel` failed because repository is under `/vercel/Poe-game-star`; reran at correct working directory and PASS. Browser launch initially failed due to missing `libglib-2.0.so.0`; installed Playwright system dependencies in isolated sandbox and reran.
- Actual browser smoke exposed three test assertion defects: `legacyActive` was null instead of false when scenes absent, Phaser text creates internal texture keys, and Vite bundles are served under `/assets/`. Fixed assertions without using legacy implementation as reference. Commit `11ae55435db85a3915c9a913dabeaa18ebe9791a`.
- CI workflow previously attempted unrelated browser tests for disabled gameplay. Restricted the Rebirth QA browser job to `tests/e2e/smoke.spec.ts` (desktop Chromium/WebKit). Commit `f89254bf1ddc2ab5433bf4d4863af3dbd1a816cf`.
- Re-executed all commands on exact `f89254b` checkout in sandbox, shell `set -e`, command id `cmd_a861d72a09414665a2422914637c`, exit code 0:
  - `npm ci --no-audit --no-fund`: PASS.
  - `node scripts/check-rebirth-boundary.mjs`: PASS, 3-file active entry graph, non-playable gate retained.
  - `npm run typecheck`: PASS.
  - `npm test`: PASS, 28 files and 128 tests. This repository-wide test count is NOT evidence that legacy tests define Rebirth behavior; only Rebirth-owned tests are canonical.
  - `npm run build`: PASS (Vite bundle size warning remains).
  - `npx playwright test tests/e2e/smoke.spec.ts --project=chromium --project=webkit --reporter=dot`: PASS, 8/8 desktop browser checks.
- GitHub Actions push-run logs: NOT VERIFIED independently. Physical iPhone Safari/Android Chrome: NOT RUN. Rebirth gameplay and art acceptance gates G1–G5 remain BLOCKED. Sandbox QA PASS applies only to current non-playable gate.
- Next task: verify GitHub Actions Node 22 execution and CI run artifacts; then plan Rebirth-only finished art review and implement gameplay only after art approval.

### 2026-10-19 — T01 cycle B: Node 22 sandbox revalidation
- Re-read GAME_CONTRACT v0.7.2 and current EXECUTION_BOARD. Fetched feat/rebirth-v1 HEAD `853b289de2e694f099879dc7b2a3008d02371f87` in isolated Vercel Sandbox `sbx_M5hhmEHGSvc67stBL4lwc01oADC0`; no historical branches or legacy implementation were consulted.
- Installed isolated Node `v22.23.3` under `/tmp/rebirth-node22` without changing repository dependencies or production deployment. npm version `11.19.0` (not CI npm version).
- Executed exact SHA in sandbox: command `cmd_88e61c79f5724aaca7cb3a5a35c0`, working directory `/vercel/Poe-game-star`, shell `set -e`, exit code `0`, 36.23 seconds.
- PASS: `npm ci --no-audit --no-fund` (62 packages), `node scripts/check-rebirth-boundary.mjs` (3-file graph), `npm run typecheck`, `npm test` (28 files / 128 tests), `npm run build`, `npx playwright test tests/e2e/smoke.spec.ts --project=chromium --project=webkit --reporter=dot` (combined command completed successfully). Browser scope is non-playable gate smoke, not gameplay QA. The command log was truncated by the connector but the sequential set -e command exited 0.
- Outstanding T01: obtain independent GitHub Actions push-run URL, individual step outcomes and artifact, ideally Node 22 with runner's npm. No iOS Safari/Android Chrome physical testing; G1-G5 still BLOCKED. Vite chunk size warning observed, non-fatal.
- Next: collect CI evidence or continue Rebirth-only QA improvements; do not enable gameplay without official art and acceptance.

### 2026-10-19 — T01 cycle C: authoritative GitHub Actions evidence obtained
- Re-read GAME_CONTRACT v0.7.2 and current board; no legacy source or archived branches accessed.
- Queried GitHub Actions public REST endpoint for Rebirth QA push runs on feat/rebirth-v1 from isolated Vercel Sandbox. Exact run ID `39204309682`, head SHA `ae48cdf4bb03e353acca009260bd75bcd51466f6`, status `completed`, conclusion `success`: https://github.com/AndyKao-commits/Poe-game-star/actions/runs/39204309682 .
- Verified job `117903697097` conclusion success and individually inspected step outcomes: checkout PASS, setup Node 22 PASS, npm ci PASS, Rebirth runtime isolation PASS, TypeScript typecheck PASS, Vitest PASS, production build PASS, Chromium/WebKit browser installation PASS, Rebirth gate Playwright smoke PASS, summary PASS, QA evidence artifact upload PASS.
- T01 acceptance met at SHA ae48cdf4. T02 has no CI failures at that SHA. A later board-only commit does not alter code, but its own CI run should be checked separately if strict HEAD-level acceptance is required.
- Remaining T03: inspect current Rebirth runtime and network behavior against zero-legacy/zero-placeholder policy; T04 formal art assets remain not delivered. Physical iPhone Safari / Android Chrome NOT RUN; G1-G5 not accepted.
- Next cycle: T03 focused active-runtime import and browser request audit. Do not enable gameplay or integrate provisional artwork.

### 2026-10-19 — T02: fresh green GitHub Actions validation
- Re-read GAME_CONTRACT v0.7.2 and execution board on feat/rebirth-v1. Verified the exact branch commit `2efb71204a4d075ce8d00b2eea060c5be79bc415` with GitHub Actions public REST API using a fresh isolated Vercel sandbox; no legacy implementation was consulted.
- GitHub Actions Rebirth QA run `39205123511` (https://github.com/AndyKao-commits/Poe-game-star/actions/runs/39205123511), job `117906174923`: completed SUCCESS, all 15 reported job steps SUCCESS, including checkout, Node 22 setup, npm ci, isolation guard, typecheck, Vitest, production build, browser install, Rebirth gate Chromium/WebKit smoke, QA summary and evidence artifact upload.
- No actionable failures at the validated SHA; T02 is COMPLETE without source modifications. Older canceled runs were superseded by later pushes due to concurrency, not treated as code failures.
- Limitations: CI validates only the non-playable Rebirth gate, not gameplay or final art. Physical iOS Safari and Android Chrome remain NOT RUN. No production deployment or main merge.
- Next: T03 runtime and browser-network zero-legacy/zero-placeholder audit.

### 2026-10-19 — T03: runtime/network isolation verified
- Re-read canonical GAME_CONTRACT v0.7.2 and current execution board. Scope restricted to Rebirth active entry path; did not read legacy implementation or old art.
- Audited `scripts/check-rebirth-boundary.mjs`: statically follows allowed entry imports; current active graph has 3 files, and non-playable gate is enforced. Rebirth-only Playwright tests assert single entry scene, no Image/Sprite/TileSprite objects, and no legacy scene active.
- Strengthened `tests/e2e/smoke.spec.ts` to reject any media/image/font network requests or recognized art/audio/video file requests regardless of asset directory, while allowing Vite JavaScript bundles under `/assets/`. Commit `189c23867dd4525d902bb221bd4a06d791961d51`.
- Local sandbox at exact 189c238: `npm ci`, isolation check, typecheck, unit and build PASS, command `cmd_8201f6f3ebc840e5b893d5d139ec`, exit 0. Initial browser test in fresh sandbox failed only because Playwright browser executables were not installed; a follow-up installation was interrupted by sandbox shutdown. This is an environment prerequisite failure, not evidence of an app defect.
- Independent GitHub Actions run for exact commit `189c23867dd4525d902bb221bd4a06d791961d51`: `39205719951`, completed SUCCESS, job SUCCESS, individual steps including Chromium/WebKit installation and updated browser smoke SUCCESS. https://github.com/AndyKao-commits/Poe-game-star/actions/runs/39205719951
- T03 PASS for current **non-playable** entry. This is not proof that future art/gameplay scenes are clean; repeat guard and browser audits as runtime expands. Physical iOS/Android NOT RUN. No gameplay unlock, production deployment or main merge.
- Next: T04 Rebirth-specific finished art production and review; no placeholder assets or old art.

### 2026-10-19 — T04 cycle A: visual review and rejection
- Reviewed ART_PRODUCTION_SPEC v0.1 and GAME_CONTRACT v0.7.2 before production. First generated concept board was **REJECTED**: it depicted gothic ruins, skeletons, a robed fantasy caster and ornate fantasy UI, conflicting with locked modern secular Taiwan urban-magic identity; it was also a flattened reference collage, not transparent layered 32x48 character sprite frames or 32x32 orthographic atlas assets.
- No generated image was committed to source or public/rebirth/art, and no approval or runtime activation was granted. Do not use rejected concept board as an implementation or stylistic reference.
- Corrected T04 production direction for next concept/art review: midnight fictional Taiwan convenience-store frontage, asphalt road markings, scooters, apartment facades, neon shop light, utility boxes, geometric electronic magic; narrow-jacket messenger-bag protagonist 阿澤; enemy orange gauntlet / cyan emitter / forward barrier; top-down 3/4 orthographic pixel clusters, 32px tile and 32x48 character targets, clean feet anchors and no embedded labels.
- T04 remains IN PROGRESS / 0 of 9 final asset groups delivered, 0 approved. Required source layers, export PNG and JSON animation/collision metadata are still missing. Gameplay gate CLOSED; do not treat an AI concept sheet as final sprites.
- Next: produce a compliant isolated character/environment art review set, then verify consistency and actual export completeness before any runtime integration.

### 2026-10-19 — T04 cycle B: contemporary urban art direction review
- Generated a NEW Rebirth-specific visual concept board in this cycle (not the rejected gothic board). The board depicts a night-time fictional Taiwan urban street, storefront, road markings, scooters, utility boxes, modern civilian protagonist 阿澤, orange fire-gauntlet enemy, cyan electrical enemy and front-barrier enemy, plus UI/VFX studies. No historical art consulted.
- Art-direction review: PASS as a **directional concept only** for contemporary urban setting, night lighting and distinguishable enemy silhouettes. **NOT APPROVED as game-ready art**: the board is one flattened composition, with no layered source files, isolated transparent RGBA sheets, verified frame dimensions, feet anchors, collision metadata or consistent four-direction animations. Some depicted UI uses keyboard keys instead of mobile touch controls, and stylized signage/UI lettering requires independent text-layer and localization work.
- Asset acceptance count remains 0/9 final groups. Do not place the board under `public/rebirth/art/` or import it in runtime. Do not use AI board slices as proxy/temporary sprites.
- Next T04 production task: create individually authored `ENV-01` 32x32 orthogonal ground atlas and `CHAR-01` 32x48 阿澤 four-direction sheet with editable sources, export metadata, native-scale mobile legibility review; then progress other required assets. No gameplay activation before all acceptance gates.
- GAME_CONTRACT v0.7.2 unchanged; no main merge or production deploy.

### 2026-10-19 — T04 cycle C: concrete art handoff and fail-closed validator
- Created `docs/rebirth/T04_ART_HANDOFF.md` (commit `d77c13bd0eafa6683fb99c9238a96b2537544504`) with specific editable source, PNG, metadata, direction/state, viewport, provenance and visual sign-off criteria for ENV-01 and CHAR-01.
- Added `scripts/audit-rebirth-art.mjs` (commit `e265f4a0c95f77cd1ddb9a3550a1e0fc095ed7f8`): read-only validator checks layered source presence, PNG signature/alpha/tile or frame grid, JSON provenance, approval and four-direction player animations. It **never** fabricates assets or unlocks the scene.
- Verified in isolated sandbox on exact commit e265f4a: `node --check` PASS; `node scripts/audit-rebirth-art.mjs` correctly exits 1 with six unmet checks (source, PNG and metadata missing for each of ENV-01 and CHAR-01). Shell verified expected blocking behavior, exit 0; command `cmd_a120a783957a450494641129e9c5`.
- A newly generated collage was reviewed and NOT accepted as an editable spritesheet or tileset: flattened panels, embedded UI lettering, no 32x32 or 32x48 verified grid, no provenance source or animation metadata. No art added to runtime or claimed as approved.
- T04 remains IN PROGRESS, final art 0/9 groups. Next: original editable production of ENV-01 and CHAR-01 assets; re-run validator, visual mobile reviews, and official CI after approved exports.

### 2026-10-19 — T04 cycle D: actual editable candidate artwork created, not approved
- Produced **two original Rebirth-specific pixel-art candidate packages**, not concept collages: ENV-01 128×128 PNG (16 orthogonal 32×32 tiles), CHAR-01 288×192 RGBA PNG (4 facing rows × 9 columns of 32×48 frames). Each has an editable layered OpenRaster `.ora` source and JSON metadata, with `approved: false`.
- The candidate bundle was created in an isolated working environment for owner review/download. **Binary assets were NOT committed to GitHub** in this cycle; no active runtime imports were changed. Do not claim GitHub asset delivery. Art gate remains CLOSED.
- Local structural checks PASS for PNG dimensions/RGBA, OpenRaster ZIP validity, JSON frame dimensions and presence of 4-direction idle/walk/attack/hurt index ranges. **Visual acceptance NOT PASSED**: directional silhouette and actual movement/attack readability require stronger art differentiation and mobile viewport review; this candidate is not production-ready.
- Updated `scripts/audit-rebirth-art.mjs` to recognize layered `.ora` sources, commit `b4617517362789c2f6d0be7db8851ffcdaad1f3a`. Validator still requires explicit approval and does not generate or activate assets.
- T04 status: 2/9 candidate groups prototyped, 0/9 final approved. Next: improve directional and attack-frame readability, test at mobile native scale, obtain visual approval, then integrate the approved files and verify CI. Do not use as temporary gameplay art.

### 2026-10-19 — T04 cycle E: CHAR-01 v2 candidate rework and repeated local audit
- Reopened previous candidate PNG and metadata, visually inspected 3× nearest-neighbor preview. Review found insufficient differentiation between walk frames, left/right faces and three attack phases. Kept prior candidate unchanged for comparison.
- Authored **CHAR-01 candidate v2** as a new independently layered OpenRaster source (3 layers: body/poses, facing/hair/bag, VFX), exported transparent RGBA 288×192 PNG, JSON four-direction animation indices (idle 1, walk 4, attack 3, hurt 1 per direction), and 3× preview. More distinct walking foot offsets, directional bag/face and windup–extension–recovery attack shapes. `approved:false` retained.
- Repackaged unchanged ENV-01 candidate alongside v2. Added reproducible local `audit-candidates.py` to package and ran it: both PNG dimensions/RGBA, OpenRaster archive integrity, composited layers matching exports, metadata grid and four-direction frame coverage PASS. Checked walk frames are 4 distinct images and attack frames 3 distinct images per direction. All four directions PASS. ZIP integrity PASS.
- Candidate files exist only as downloadable conversation artifact `rebirth_t04_v2.zip`, **not** committed to GitHub or imported into active runtime. No claims of owner approval or physical mobile testing. Automated distinctness does not prove professional animation quality or gameplay readability.
- T04: 2/9 candidate groups available, **0/9 approved final**. Next: owner review at native and phone viewport, improve character silhouette where necessary, assess ground tile seams and animation timing; only after approval and technical gates should source/PNG/metadata be committed to `feat/rebirth-v1`.

### 2026-10-19 — T04 cycle F: owner accepts CHAR-01 V2 for provisional use
- Owner explicitly approved temporary in-development use of CHAR-01 V2, with later replacement: 「勉強可以接受 可以先使用 後續再更替可以嗎」. Scope: user-approved provisional **character art**, not release-ready final art, not permission to use legacy artwork.
- Updated `docs/rebirth/T04_ART_HANDOFF.md` to preserve the decision, explain binary integration pending and specify stable asset IDs/animation metadata/replacement strategy. Commit `f7f93f0cd0dda9249dc3f106c49f620e1bb27e87`.
- Added data-only, versioned `src/rebirth/art/assetRegistry.ts` with `CHAR-01` provisional approval, `ENV-01` still candidate, both `releaseApproved:false` and replaceable. Commit `706d9e0e9b7a2c96c778be8dd1c3da48809de1be`. Registry is not imported by entry scene and does not load art.
- Rechecked V2 ZIP integrity, RGBA formats, grid sizes and `approved:false` metadata: ZIP PASS, CHAR-01 288×192 / 32×48 PASS, ENV-01 128×128 / 32×32 PASS. Visual and physical phone tests still pending.
- **Critical transparency:** binary `.ora`, `.png`, `.json` assets remain in downloadable conversation ZIP, not in GitHub. Runtime integration NOT COMPLETE; do not claim active use or full T04 completion until actual binary commit and QA. Gameplay release gate CLOSED.

### 2026-10-19 — T04 cycle G: V2 asset integrity pinned and integration preflight
- Verified actual user-approved V2 package in conversation workspace with `python audit-candidates.py`: CHAR-01 RGBA 288×192, 3 OpenRaster layers and complete 36-frame metadata PASS; ENV-01 RGBA 128×128, 2 OpenRaster layers and 16-tile metadata PASS. `approved:false` retained, as final/release approval has not occurred.
- Added `docs/rebirth/T04_CANDIDATE_MANIFEST.json` commit `1e54e2e87cfe548a3df5d534adb2086d26d4b791`: exact SHA-256 hashes for six V2 files, revision and provisional/release approval flags. Added `scripts/verify-rebirth-candidate.mjs` commit `e54b05d1b26723672804bfa6bc0b0ad2b5922810`: read-only SHA-256, PNG RGBA/grid, metadata frame-range and source-format validation for candidate files. Usage: `node scripts/verify-rebirth-candidate.mjs /path/to/extracted/rebirth_t04_v2`.
- On isolated GitHub checkout at exact e54b05d, `node --check` both art validators PASS and `node scripts/check-rebirth-boundary.mjs` PASS. Candidate verifier intentionally fails closed with six missing files because binaries are **not in GitHub**; verified expected exit code 1. Command `cmd_862da5ea856c47a3be717fcf475b`.
- GitHub Actions run for e54b05d `39208764064` was pending when checked; do not claim CI PASS yet. https://github.com/AndyKao-commits/Poe-game-star/actions/runs/39208764064
- **Status:** user-provisional approval for CHAR-01 V2 recorded; exact candidate bits identified by hashes; **no binary asset commit, no active art loading, no gameplay unlock**. Next integrate exact hash-matching candidate sources/exports into feat/rebirth-v1 and rerun validator + browser CI; maintain T04 IN PROGRESS.
