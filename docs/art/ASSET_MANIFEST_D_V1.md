# Art D — prototype export manifest v1
Date: 2026-10-17
Status: first procedurally illustrated prototype PNG pack generated outside repository; runtime integration pending.

## Files in prototype package
- player.png: 256×192, transparent PNG, 32×32 cells, 8 facing columns e,se,s,sw,w,nw,n,ne; 6 rows idle0,idle1,run0,run1,attack-windup,attack-strike.
- crawler.png: 128×160, transparent PNG, 32×32 cells; 4 frames each for idle,chase,hurt,windup,attack.
- sentinel.png: same dimensions and animation rows as crawler.
- tile-floor.png, tile-wall.png, tile-obstacle.png, tile-void.png: each 64×32 transparent isometric diamond.
- slash.png, telegraph.png, hit.png: each 48×48 transparent.
- ui-attack.png, ui-skill.png, ui-potion.png: each 32×32 transparent.
- manifest.json: exported asset metadata.

## Provenance
All prototype art is original procedural artwork, generated for this project. No extracted third-party images. The earlier concept board is reference only; it is not a valid runtime sprite atlas.

## Integration safety
DO NOT copy into existing public/assets filenames without changing the prebuild placeholder overwrite strategy. Existing BootScene has only one enemy texture key; enemy subtype loading and actual usage must be handled in Issue #7. Preserve current runtime files in this branch. Proposed character pivot bottom center (0.5,1), subject to rendering verification.

## QA gates
1. Inspect per-cell alpha and frame bounds.
2. Confirm actor visibility and facing readability on iPhone Safari landscape.
3. Confirm frame timing against real attack timeline, especially telegraph and hit.
4. Confirm texture memory and FPS, then consider refined production artwork.
5. Create dedicated integration PR only after review.

## Engineering UI reference
See UI_ENGINEERING_HANDOFF_D_V1.md in this folder. UI recommendations are not yet implemented.
