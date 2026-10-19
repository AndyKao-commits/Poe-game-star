# Legacy Ashen Reliquary — Read-Only Reference Index
Archived on: 2026-10-19
Purpose: Keep previous game information available for engineering reference while preventing contamination of Ashen Reliquary: Rebirth.

## Snapshot references
- [Legacy main snapshot](https://github.com/AndyKao-commits/Poe-game-star/tree/archive/ashen-legacy-20261019) — original baseline at archive creation.
- [Legacy Phase 2 integration snapshot](https://github.com/AndyKao-commits/Poe-game-star/tree/archive/ashen-phase2-20261019) — work-in-progress engineering integration branch at archive creation.
- Original main and feat/phase2-runtime-integration branches remain unchanged. Archive branches are frozen-by-policy; GitHub does not technically enforce read-only protection unless branch protection is configured.

## What to consult
| Category | Reference | Policy for Rebirth |
|---|---|---|
| Toolchain | package.json, vite.config.ts, tsconfig.json | Reuse after checking compatibility |
| Pure combat | src/core/combat/damage.ts | LEGACY ONLY: HP100, MP50, DEF5, old defense curve. Do not import as Rebirth balance |
| Rebirth combat | src/rebirth/core/combat.ts (Rebirth branch only) | Canonical implementation candidate for new damage/skill rules |
| Phaser scene | src/game/scenes/GameScene.ts | Legacy ruin map, must not be mistaken for modern Taiwan |
| Touch controls | src/ui/touchControls.ts | Evaluate joystick/attack handling; legacy Q/E/dodge are disabled placeholders |
| Input | src/game/input/InputController.ts | Evaluate iOS touch handling, aim and coordinate transforms |
| HUD | src/ui/hud.ts | Evaluate and adapt to Rebirth two skills |
| Assets | public/assets, asset scripts, legacy art branch | Reference only; no automatic import of ancient-magic/ruin imagery |
| Tests | tests/unit, tests/e2e | Reuse harness; old tests validate old rules only |
| Integration work | archive/ashen-phase2-20261019 | Inspect carefully for unmerged features and incomplete QA |

## Rebirth authority and decision boundary
1. The sole Rebirth design authority is [GAME_CONTRACT.md](../rebirth/GAME_CONTRACT.md).
2. This legacy archive is NOT the source of truth for story, visual style, mechanics, balance, UI, or delivery claims.
3. Importing legacy logic requires explicit comparison to Rebirth requirements and new tests.
4. Never copy ancient ruins, folklore, old player stats, old skill buttons or keyboard-first controls without deliberate adaptation.
5. Keep the legacy snapshots and old branches untouched; make all new commits only to feat/rebirth-v1 or a successor Rebirth branch.
6. Do not claim archived snapshots were fully audited, tested or deployed. Archive creation proves only that branch references were created.

## Retrieval checklist for hourly development
- Read Rebirth GAME_CONTRACT first.
- Check latest Rebirth branch head and execution board.
- Consult this archive index only when seeking a reusable legacy module.
- Log each adopted module, differences, regression test and commit.
- If legacy conflicts with Rebirth, Rebirth wins.

## Scope and limitations
The snapshot branches preserve Git-tracked content reachable from their starting refs. They do not automatically preserve GitHub Actions logs, CI artifacts, Vercel deployment state, external storage, Supabase data, uncommitted local changes, or other independent branches. These require separate exports if later needed.
