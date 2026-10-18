# Ashen Reliquary — Phase 3 workstream handoff

Target integration branch: `feat/phase2-runtime-integration`
Prepared: 2026-10-18
Status: **proposed work allocation; no claim that individual track owners accepted or delivered these tasks.**
Release policy: **do not merge main or deploy until full CI, Art D visual approval and physical iPhone Safari QA.**

## Baseline

- CI #197 (run 39103045249) succeeded: TypeScript, unit tests, production build, Chromium/WebKit E2E and Art D asset contract.
- All thirteen Art D prototypes are loaded in BootScene and referenced in gameplay/UI runtime, but are **not visually signed off**. Regenerated `sentinel.png` and `hit.png` require approval.
- C inventory and A skills have successful automated interaction regressions; B enemy and D HUD have integrated runtime event paths.
- New preliminary **pure data-layer** interface: `src/core/loot/groundDrops.ts`; this is **not yet an in-game pickup feature**. No ground sprites, controls, enemy drop placement, or persistence have been wired.

## Non-overlapping delivery ownership

| Track | Owns | Expected contract | Acceptance gate |
| --- | --- | --- | --- |
| C — inventory/equipment | Pure `groundDrops` transactions, capacity and stack behavior | `placeGroundDrop`, `pickupGroundDrop`, immutable kit/state | Unit coverage: duplicate claims, no item loss, range, full bag |
| B — enemy AI/combat | Enemy death drop coordinate and lifecycle event | Stable kill ID plus death position, no duplicate spawn | Death/reset E2E; no orphan world objects |
| D — UI/touch | Nearby-drop prompt, interaction affordance and pickup feedback | Calls E's pickup handler, respects mobile safe-area and modal input gate | Chromium/WebKit landscape; keyboard/touch and screen reader |
| Art D — art | Pickup marker and UI styling references; 13 PNG validation | 2D low-res style, proper alpha and frame atlas | Visual approval (especially `sentinel.png` / `hit.png`) |
| A — skills | Input action compatibility only | No skill cast/attack when inventory or pickup modal active | Skill/touch regressions |
| E — integration | GameScene world objects, lifecycle cleanup, merge coordination, CI | Wire above stable interfaces without overwriting track branches | All automated QA + manual gates |

## Behavior to implement in the next iteration

1. One enemy death grants XP/gold exactly once and rolls loot exactly once.
2. Choose one explicit pickup policy. Recommended: normal loot remains bag-auto-pickup for compatibility; **only bag-rejected items become ground drops**. Never grant the same item twice.
3. A pickup succeeds only near the character and only when the bag can accept the item. Otherwise keep the ground object unchanged.
4. Ground loot must be cleared and graphics destroyed on scene teardown and encounter reset.
5. Do not create unbounded ground sprites. `MAX_GROUND_DROPS` caps the data model; define user-facing overflow handling before enabling runtime.
6. Notify the player accurately: a drop on the ground is not equivalent to a collected item.
7. Keep all Art D replacement assets in prototype state until visual sign-off.

## Boundaries and blockers

- This handoff is a concrete integration proposal committed for review, **not an externally delivered assignment or instruction to other agents**.
- Branch edits should be owned by their respective workstreams; E will validate changes and cherry-pick only reviewed patches.
- Physical iPhone Safari QA and visual acceptance cannot be replaced with browser automation.
