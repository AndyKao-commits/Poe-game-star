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
