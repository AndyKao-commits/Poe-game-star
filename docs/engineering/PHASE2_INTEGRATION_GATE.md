# Phase 2 integration gate — Engineering E

Date: 2026-10-17. Target: `feat/phase2-runtime-integration` (PR #12). **Do not merge to main or switch Art D PNGs yet.**

## Incoming runtime PRs

| PR | Scope | Head at initial review | Vercel | Independently tested by E? |
|---|---|---|---|---|
| #19 | AI roster, attack driver, EnemyController, GameScene | 80a3f60 | success | no |
| #21 | Q/E/dodge, player/input/touch, GameScene | 4bd0806 | success | no |
| #20 | Loot, inventory, equipment, HUD, GameScene, PlayerController, InputController | 2a72484 | success | no |
| #22 | HUD, UI styling, EnemyController, skill state, modal shell | deef657 | success | no |

## Explicit conflict map

- `GameScene.ts`: #19, #20, #21 all change it. Engineering E must preserve roster spawn, skill UI synchronization, reward/loot claiming and inventory modal gating; verify restart and teardown cleanup.
- `PlayerController.ts` and `InputController.ts`: #20 and #21 overlap. Preserve skill caster and equipment-derived combat stats, mana authority, input release guards.
- `src/ui/hud.ts` and `src/styles.css`: #20 and #22 overlap; #21 also changes CSS. Preserve actual bag button, XP, cooldown indicators, mobile safe areas and pointer passthrough.
- `EnemyController.ts`: #19 and #22 overlap; retain archetype behavior while using Art D telegraph theme.
- `src/ui/gearPanels.ts` (#22) vs `src/ui/inventoryPanel.ts` (#20): reconcile modal ownership and prevent duplicate shells.

## Required integration order and acceptance

1. Freeze incoming PR head SHAs and compare against current integration head before each merge.
2. Merge AI (#19) first after reviewing attack state and GameScene spawn; rerun tests.
3. Reconcile skills (#21) and inventory (#20) together, not blindly sequentially, because both edit player/input/scene.
4. Reconcile UI (#22) after skill and inventory APIs are stable; no fake status.
5. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` on **combined integration HEAD**; capture counts and logs. Per-PR Vercel success is not a combined test.
6. Manual iPhone Safari landscape: joystick+attack+skill multi-touch; no duplicate casts; safe areas; inventory open/close; respawn; telegraph; FPS.
7. Leave PR #12 draft until all P0/P1 gates are met and issue #17 release review is complete.

## Art D release gate

Art branch `feat/phase2-art-direction`; `public/assets/art-d/manifest.json` exists, 13 PNGs are pending. **Do not load or overwrite placeholders**. After all 13 PNGs are committed, validate PNG signatures, dimensions, alpha, sheet grid, texture keys, animation frame ordering, isometric anchors, VFX timing and iPhone Safari performance before a dedicated art integration PR.

## Review findings / follow-ups

- #20 reports full inventory discards drops without ground pickup; product decision needed before production.
- #20 could not run Firefox/WebKit on its agent host; this is not Safari coverage.
- #21 reports real iPhone multi-touch still requires manual QA.
- #22 UI skill strip intentionally shows unavailable until runtime caster wiring is integrated.
- All four PRs currently draft; agent-reported test counts are **not** independently verified by Engineering E.

## Merge gate observation (2026-10-17)

- Engineering E attempted merging PR #19 with expected head `80a3f60`; GitHub rejected HTTP 405 because PR remains **Draft**. No merge occurred. Engineering E left a review comment requesting Ready for review plus final test evidence and target-death/respawn checks. Do not bypass draft status.

## Integration checkpoint — 2026-10-17 15:12 UTC

- PR #19 AI merged into integration at `22f937f`.
- PR #21 skills merged into integration at `69de345`.
- E fixed AI windup/death/respawn race in `5b0d941` and added regression test in `8236af3`; test has not yet been independently executed.
- PR #20 inventory was marked Ready, but GitHub rejected the merge with HTTP 405 **merge conflicts**. This is a real conflict, not merely a Draft block. Do not retry a blind merge.
- Integration conflict resolution must preserve A's skill caster state and touch input, C's equipment-derived stats and inventory gating, B's enemy roster, and D's HUD semantics.
- Art D issue #18 updated with explicit 13-PNG upload request; manifest still reports binaries pending.
- Production `main` remains untouched. Combined tests are pending.

### C + A reconciliation invariants
1. Recompute equipment stats from naked base, preserve current HP/MP and clamp to new maxima; update caster mana/maxMana from the newly derived stats without resetting skill cooldowns.
2. On respawn, restore derived equipment maxima and reinitialize caster resources; preserve bag and gear.
3. Modal open: clear pointer/skill presses, disable keyboard and touch gameplay inputs; modal close: no held-attack replay.
4. Every kill ID yields XP/gold and at most one loot claim, including after respawn. Preserve roster spawn-index assignment.
5. Do not discard A's Q/E/dodge handlers or B's attack telegraph state.

### D reconciliation invariants
Use a single inventory modal owner, one live skill status adapter, and preserve responsive safe-area styles. Do not switch Art D assets before all 13 PNGs are committed and verified.
