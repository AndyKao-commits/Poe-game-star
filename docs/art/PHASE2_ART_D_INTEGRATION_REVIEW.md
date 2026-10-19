# Phase 2 — Art D and C/D UI integration review

Review date: 2026-10-18
Target branch: `feat/phase2-runtime-integration`
Status: **engineering review only; NOT production approval**

## Verified source documents
Source branch: `feat/phase2-art-direction`
- `docs/art/ASSET_MANIFEST_D_V1.md`
- `docs/art/UI_ENGINEERING_HANDOFF_D_V1.md`

Those source documents are planning/prototype handoffs. This review does not treat their approval checklist as completed.

## Art D inventory (13 prototype PNGs)
- Actor (1): `player.png` — 256×192, 32×32 cells, eight facings and six rows.
- Enemies (2): `crawler.png`, `sentinel.png` — 128×160, 32×32 cells.
- Isometric tiles (4): `tile-floor.png`, `tile-wall.png`, `tile-obstacle.png`, `tile-void.png` — 64×32.
- Combat FX (3): `slash.png`, `telegraph.png`, `hit.png` — 48×48.
- UI (3): `ui-attack.png`, `ui-skill.png`, `ui-potion.png` — 32×32.

Integrated runtime metadata: `public/assets/art-d/manifest.json` (D-v1-prototype).
That manifest explicitly requires Art D visual approval of regenerated `sentinel.png` and `hit.png`.
Passing automated asset-contract CI is not equivalent to visual/animation acceptance.

## Engineering integration comparison
Comparison: `feat/phase2-runtime-integration` against source engineering branches.
- C `src/core/loadout/gearKit.ts`: identical Git blob to `feat/phase2-inventory-runtime`.
- C `src/core/equipment/equipment.ts`: identical Git blob to `feat/phase2-equipment-core`.
- D `src/ui/gearPanels.ts`: identical Git blob to `feat/phase2-ui-runtime`.
- C `src/ui/inventoryPanel.ts`: different Git blobs. Do not overwrite integrated modal/input safeguards without behavior review.
- D `src/ui/hud.ts`: different Git blobs. Do not overwrite integrated death/skill/XP behavior without behavior review.

These are **file-content comparisons only**, not complete feature acceptance for all A/B/C/D modules.

## Art D → engineering UI contract (from source handoff)
1. No overlay may intercept touch attack/joystick outside genuine interactive controls.
2. Maintain readable HP/MP numbers on small landscape screens; respect safe-area insets.
3. Skill unavailable / cooldown / insufficient resource must be distinguishable and synchronized to gameplay.
4. Telegraph and impact effects must be driven by actual enemy events, not decorative timers.
5. Keep mobile controls clear at wide iPhone landscape sizes; desktop keyboard hints remain appropriate.
6. Respect reduced motion; verify FPS, texture memory, and asset alpha/frame bounds.
7. Inventory modal must suppress gameplay input. Death/restart retains accessible controls.
8. Do not display invented XP, equipment or minimap state.

## Remaining acceptance gates
- [ ] Diff and behavior-review C `inventoryPanel.ts` vs legacy branch; exercise pointer/backdrop/keyboard, inventory close on death, and equipment actions.
- [ ] Diff and behavior-review D `hud.ts` vs legacy branch; check HP/MP/XP, cooldown, death and restart states.
- [ ] Inspect all 13 PNGs visually, including each sprite frame and alpha.
- [ ] Obtain Art D sign-off for the regenerated Sentinel and Hit images.
- [ ] Perform real iPhone Safari landscape touch/safe-area and performance QA.
- [ ] Re-run TypeScript, unit, build, Chromium/WebKit E2E, Art D contract on any subsequent runtime change.
- [ ] Only after complete QA and approval, separately decide whether to merge main or deploy.

## Baseline CI evidence
At `b5637500af69d626bbfd42e57b72c77928b118a3`, Phase 2 integration QA run
`39093418187` concluded **success**, including TypeScript, unit tests,
production build, Chromium/WebKit E2E and Art D asset contract.
This proves the tested revision, not subsequent changes or manual art/mobile QA.

## Engineering acceptance update — 2026-10-18

This update supersedes the older baseline CI evidence for currently integrated changes; it does **not** grant production approval.

- CI `39099705284` (#171), commit `85aa5d2`: **success** for TypeScript, unit tests, build, Chromium/WebKit E2E, and Art D asset contract.
- C inventory: equip/unequip failures now display localized feedback; regression tests cover failed equip, gear-derived attack/defense/HP, death/restart, and 844×390 inventory accessibility.
- A/D skills: HUD and mobile touch skills refresh on respawn; coarse-pointer layout hides the duplicate desktop skill strip. Automated mobile-state regressions passed in CI #171.
- B/D combat: enemy hit FX are tracked and destroyed when encounter reset cancels tweens. The canceled-tween regression passed in CI #171.
- Mobile layout: Chromium and WebKit initially detected overlapping inventory/settings hit targets in CI #169. CSS corrected the conflict; the unchanged overlap assertion passed in CI #171.
- Follow-up on the current branch: a **new** regression for the normal (non-canceled) hit FX tween is awaiting its own CI result. Do not cite CI #171 as proof of that later addition.

### Still blocking release
- [ ] Visual review of **all 13 prototype PNGs**, including actual sprite frames, alpha edges and animation consistency.
- [ ] Explicit Art D approval for regenerated `sentinel.png` and `hit.png`.
- [ ] Physical iPhone Safari landscape touch, safe-area and sustained performance evaluation.
- [ ] Complete CI success on **the latest** integration commit.
- [ ] Separate authorization and complete acceptance before any `main` merge or production deployment.

## Phase 3 visual quality rejection and rework brief — 2026-10-18

**Human review outcome: NOT APPROVED.** The project owner considers the current
Art D visual quality below target. Automated PNG/frame-contract checks passed,
but this is not visual approval. Treat all 13 staged images as provisional.

### Rework priorities
1. **Player (P0):** preserve the approved dark-fantasy exiled-warrior concept,
   red cape and recognizable weapon direction; improve head/torso/weapon silhouette
   and consistent anatomy across all eight facing columns and six animation rows.
2. **Enemies (P0):** give the crawler a readable low and fast profile and the
   sentinel a distinct broad armored profile; every enemy windup must have
   clear silhouettes without relying solely on hue.
3. **Terrain (P1):** refine value grouping and material separation between floor,
   wall, obstacle and void without burying actors in low-contrast textures.
4. **Combat effects (P1):** refine slash, telegraph and hit so their direction,
   timing and threat hierarchy remain legible; no visually noisy full-screen FX.
5. **UI icons (P1):** refine attack, skill, potion silhouettes at actual 32px
   display scale with consistent contour weight and disabled/cooldown readability.

### Mandatory technical compatibility
- Player: 256x192 RGBA PNG, 8x6 grid of 32px frames, no spacing or padding.
- Crawler/sentinel: 128x160 RGBA PNG each, 4x5 grid of 32px frames.
- Floor/wall/obstacle/void: 64x32 RGBA isometric tile image each.
- Slash/telegraph/hit: 48x48 RGBA PNG; attack/skill/potion: 32x32 RGBA PNG.
- Preserve filenames, transparency, per-cell bounding boxes, facing order,
  animation row order, bottom-center actor pivots and Phaser atlas assumptions.
- Work on a dedicated Art D branch. Do **not** overwrite the integrated
  runtime assets before visual comparisons and automated CI.
- **Gate:** contact sheets showing every animation frame and 1x/2x in-game
  comparisons, alpha/frame inspections, manual Art D acceptance, and
  iPhone Safari landscape visual/performance acceptance.
- If one asset is accepted, replace only that asset and re-run the full QA
  suite; partial acceptance does not approve the remaining assets.

Engineering QA #239 passed on commit `50694ef`, but that result does not
clear this art-quality rejection or authorize a production deployment.
