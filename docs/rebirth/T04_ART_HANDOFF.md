# T04 — ENV-01 / CHAR-01 final art acceptance checklist

Status: **BLOCKED — no approved runtime art**. This is a production handoff, not an asset delivery or approval.
Contract: `docs/rebirth/GAME_CONTRACT.md` v0.7.2; `docs/rebirth/ART_PRODUCTION_SPEC.md` v0.1.

## ENV-01 — urban-ground-atlas
- Source: `art/rebirth/source/urban-ground-atlas.aseprite` (or layered .kra with documented authoring app).
- Runtime: `public/rebirth/art/urban-ground-atlas.png`; metadata: `public/rebirth/art/urban-ground-atlas.json`.
- Exact orthogonal 32×32 grid, PNG dimensions multiples of 32, nearest-neighbor, no isometric perspective.
- Tile categories: asphalt variants, concrete sidewalk, curb transition, parking line, road crack, storm drain.
- Verify four-way joins, depth/foot collision convention, seamless repeat, legibility at 480×270 world resolution.
- No lettering baked into the atlas, no reused old artwork, no placeholder procedural textures.

## CHAR-01 — aze-character
- Source: `art/rebirth/source/aze-character.aseprite` (or layered .kra).
- Runtime: `public/rebirth/art/aze-character.png`; metadata: `public/rebirth/art/aze-character.json`.
- Target grid 32×48 per frame, exact PNG dimensions divisible by 32 and 48.
- Facing: north, south, east, west. Each must have idle, walk (≥4 frames), attack (≥3 frames), hurt. Document explicit frame index ranges in metadata.
- Stable feet anchor and collision footprint, readable messenger bag / casual jacket silhouette, no frame clipping or transparent halos.
- Check direction consistency and nearest-neighbor at native 1×, 2× and 3×.

## Acceptance record (required for each asset)
- Creator, creation date, original source file path and license/provenance.
- Layered editable source + final RGBA PNG + frame/tile metadata JSON.
- Frame dimensions, directions, animations, pivot/feet anchor and collision footprint.
- Review evidence at 480×270 and 844×390 / 932×430 / 740×360 CSS pixels.
- Owner visual sign-off and technical validator result. Missing or rejected work **must not be imported**.

## Current cycle
- Generated concept collages are **NOT deliverable sprite sheets**: flattening, irregular frames, embedded UI/signage text, and missing source/metadata violate acceptance.
- **ENV-01:** NOT DELIVERED. **CHAR-01:** NOT DELIVERED. **T04:** IN PROGRESS.
- Next: produce individually editable original pixel artwork and review real exports before integrating into runtime. Gameplay gate remains closed.
