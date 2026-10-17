# Ashen Reliquary — UI/UX engineering handoff (D → Integration #7)
Approved visual direction: B, restrained low-resolution refined 2D. Owner: UI integration engineers; this file is a proposal, not a runtime implementation.

## Current implementation
src/ui/hud.ts currently renders HP/MP linear bars and numbers, FPS, keyboard hints, death overlay/restart. BootScene loads 32×32 player/enemy sheets and tiles. Do not assume XP, minimap, cooldown buttons or ornamental orbs already work.

## P0 — Mobile combat readability
1. Preserve current touch joystick and attack input hit targets. Decorative UI must never intercept pointer events outside interactive buttons; overlay should use pointer-events:none except interactive descendants.
2. HP/MP: retain numerical values with contrasting dark backing; compact bars preferred on small landscape screens. Blood/mana orbs are optional skins, not a required layout change.
3. Skill icons: square silhouette and consistent border thickness, clear pressed/disabled states, numeric cooldown countdown and optional radial mask; use B-line skill model only after its interface is integrated. Distinguish unavailable skill vs cooldown vs insufficient resource.
4. Enemy telegraph: amber preattack signal readable against gray floor; impact uses short muted red flash. Telegraph timing driven by actual combat events, never independent decorative timers.
5. Safe areas: CSS env(safe-area-inset-*); adapt to 16:9 and wider iPhone landscape, preserve visible battlefield center, avoid overlap with joystick and attack cluster.
6. UI text must remain legible at device scale. Prefer system font for small numbers; decorative font only for headings. Respect reduced-motion preference.

## P1 — Integration-dependent
- XP progress and level: only after A-line events/state are available. Update on game events rather than animation loop DOM churn.
- Inventory/equipment: only after C-line data contract is agreed. Modal interaction must pause/guard gameplay input consistently.
- Responsive HUD presets: small-landscape and desktop; desktop retains keyboard hints, mobile omits them.
- Death/restart: retain accessible button and state; do not add full-screen cinematic effects.

## P2 — Optional polish
- Minimap only after map visibility/position API exists; do not fake enemy or room state.
- Ornamented HP/MP orbs only if screen occupancy and FPS testing pass.
- Dust and glow only as limited short-lived feedback, no perpetual full-screen particles.

## Implementation contract
- Integration issue #7 owns modifications to src/ui/hud.ts, touchControls.ts, GameScene.ts and BootScene.ts.
- Art D provides small PNG/WebP icons, transparent backgrounds, consistent scale and manifest.
- Check contrast in real game scene, pointer targets, safe areas, low-resource device frame rate, cooldown synchronization and no accidental input blocking.
- Do not alter core logic, merge to main, or deploy as part of this art planning handoff.

## Acceptance checklist
[ ] HP/MP update correctly and remain readable
[ ] Skill icons reflect real cooldown/resource state
[ ] Telegraph aligns with real attack timeline
[ ] Mobile controls unobstructed in landscape
[ ] Desktop hints retained only where appropriate
[ ] No layout overlap at common iPhone landscape widths
[ ] XP/equipment UI only shown when backed by integrated state
[ ] FPS/asset memory regressions reviewed
