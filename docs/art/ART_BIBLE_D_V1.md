# Ashen Reliquary — Art Bible D v1
Status: approved visual direction B (2026-10-17). Scope: Issue #10.

## Visual language
Low-resolution refined 2D sprites; dark fantasy isometric ruins. Original artwork only. Readability takes precedence over ornament. No 3D pipeline, cinematic VFX, or heavy particle systems.

Palette: stone #3A3434, deep shadow #181820, weathered iron #5A525C, crimson cloth #6D303C, aged brass #A88B54, telegraph amber #D5A64A, damage #D65C50.

## Character roster
- Player: exiled warrior, hood/crimson cape, small metal guards, clear sword-facing silhouette.
- Enemy A: corrupted crawler, low fast silhouette, dark flesh with controlled red accent.
- Enemy B: ruin sentinel, broad armored silhouette, visible raised-weapon windup.

## Runtime-compatible export target
- Player sheet: 256×192 PNG, 32×32 frames; 8 columns [e,se,s,sw,w,nw,n,ne], 6 rows [idle0,idle1,run0,run1,attack-windup,attack-strike]. No padding; alpha background. Current attack animation reuses final strike frame.
- Enemy sheet: 128×160 PNG, 32×32 frames, 4 columns and 5 rows [idle,chase,hurt,windup,attack]. Enemy A and B need separate keys in future integration; existing BootScene currently loads one enemy key, so do not overwrite it before Issue #7 integration.
- Terrain: 64×32 diamond footprint; floor, wall, obstacle, void exports. Tall wall art must have separate rendering/depth handling rather than clipping to 32 pixels.
- Animation target: player idle 4 fps, run 8 fps, attack 10 fps; enemy idle 4, chase 8, hurt 10, windup 8, attack 12 (current BootScene).
- Pivot: character bottom-center at feet, proposed normalized (0.5,1); verify current rendering origins before integration. Tile alignment follows existing TileRenderer.
- Effect: brief sword arc, hit flash and clear amber enemy windup, never obscure input.

## Asset policy
Stage under public/assets/art-d/ rather than current placeholder filenames. scripts/generate-placeholders.mjs may overwrite existing public/assets/*.png during prebuild. Manifest required for each export: path, pixel dimensions, frame grid, animation, anchor, replacement target, provenance/license.

## Acceptance
Review real exported pixel grid, transparency, silhouettes at 1x/2x on iPhone landscape, overdraw and visual clutter; verify loading and animation in isolated test before merge. Concept art is NOT a compliant sprite sheet. No main changes, deploy or automatic integration.
