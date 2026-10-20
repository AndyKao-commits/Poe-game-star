# Rebirth — external game research log (design principles only)

Status: research notes, **not** implementation requirements, approval, or a dependency.
Recorded: 2026-10-20 (Asia/Taipei).
Reference: https://github.com/AndyKao-commits/ADOLF-S-POKE.git (main; README, generated index page, cloud-save documentation inspected).

## Non-copy boundary (mandatory)

This other game is **study-only**. Do not copy, import, translate, rework, derive assets from, or vendor its code, scripts, game data, sprites, names, sound, UI artwork, layouts, text, numerical tables, maps, game content, or save schemas. Do not add it as a dependency or git submodule. Never use its Pokémon/IP-related material. Do not infer that its noncommercial code license authorizes copying into Rebirth. Any Rebirth implementation must be original and governed by `GAME_CONTRACT.md` and our own test evidence.

## Observed approaches and independent Rebirth decisions

| Reference observation (descriptive only) | Rebirth design question | Original Rebirth action | Validation |
| --- | --- | --- | --- |
| Touch movement is documented as a floating joystick on landscape mobile. | Should fixed/floating movement be configurable without breaking two-thumb actions? | Preserve our own pointer ownership and fixed/floating joystick adapter; compare with direct iPhone feedback before choosing default. | CDP multi-touch and real-device Safari tests; joystick must not stick when second finger lifts. |
| User-facing graphics quality and FPS settings exist. | Can low-end devices avoid frame drops while keeping pixel art readable? | Design independent quality tiers for particles, camera shake and DPR, **not** a copied menu. | FPS/frame-time and memory readings on at least two mobile devices. |
| World drawing is optimized by visible-area work and spatial partitioning. | When will Rebirth's own Phaser scene require culling and collision broadphase? | First profile actual encounter and map size. Only then design Phaser-appropriate visibility and broadphase; do not port its Canvas renderer or data structures. | Before/after CPU and frame-time traces with identical scenes. |
| Audio starts after user gesture and provides mute controls. | How to avoid autoplay rejection in iOS Safari? | Plan Rebirth-specific gesture-unlocked audio, pause/mute and resume behavior. | Physical Safari audio unlock, silent-mode and page-resume QA. |
| Browser-local progress and optional cloud sync are documented. | How can single-player progression survive refresh and version updates? | Specify an original versioned local save format before implementing cloud features. No external save data or schemas. | Migration, corrupt-data and offline reload tests. |
| The game describes world interactions and combat telegraphs. | How do players understand interaction ranges and enemy windups? | Continue our own Chapter 1 drain clue, objective marker and original telegraph design; make prompts readable without blocking combat. | Full fight → clue → exit → replay E2E, screenshot review and iPhone playtest. |

## Findings about our own process (not borrowed code)

1. An accessible **in-game retry button** was missing even though `AlphaHost.retry()` existed. We independently wired `#restart-run` in Rebirth's private Alpha at commits `48afbf8` and `017c0f5`, with a real-scene replay browser test at `b5c0e0d`. This is a Rebirth bug fix, not a port.
2. Passing unit tests does not validate screen-space controls. Browser tests and real iPhone testing are separate acceptance gates.
3. Batch related code + unit + E2E work into coherent changes; avoid multiple pushes that cancel each other's CI.
4. Keep the external reference out of the game runtime, art registry and shipped bundle.

## Follow-up order

- **P0:** Verify retry E2E CI on Chromium and WebKit; fix failures, if any.
- **P0:** Provide an authorized private Alpha URL for owner iPhone testing, with release gate unchanged.
- **P0:** Capture real iPhone landscape, safe-area, multi-touch, battle, clue, exit, and retry feedback.
- **P1:** Build original settings for input position and accessibility only after the above QA.
- **P1:** Profile actual Phaser frame time before introducing quality tiers or culling.
- **P2:** Specify original save/audio contracts after the first playable loop is accepted.

Research source is not a quality guarantee. All reference observations require independent Rebirth-specific implementation and QA.
