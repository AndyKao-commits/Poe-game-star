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
