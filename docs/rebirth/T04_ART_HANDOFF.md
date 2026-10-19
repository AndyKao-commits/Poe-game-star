# T04 — ENV-01 / CHAR-01 final art acceptance checklist

Status: **USER-APPROVED PROVISIONAL ART DIRECTION (2026-10-19); REPOSITORY INTEGRATION PENDING**. User explicitly accepted CHAR-01 v2 for temporary use with future replacement. This is *not* a full T04 release or gameplay authorization.
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
- **ENV-01:** candidate delivered in downloadable V2 ZIP; technical and visual acceptance pending. **CHAR-01:** V2 candidate delivered in ZIP and approved by user for provisional use with future replacement; technical/repository integration pending. **T04:** IN PROGRESS.
- Next: produce individually editable original pixel artwork and review real exports before integrating into runtime. Gameplay gate remains closed.

## 2026-10-19 owner decision — approved provisional use, replace later
- User: 「勉強可以接受 可以先使用 後續再更替可以嗎」.
- Interpretation: authorize **CHAR-01 V2** for provisional in-development use, with an explicit replacement path. ENV-01 may accompany it as a candidate for internal development, but is not independently declared visually approved.
- Source of candidate: `rebirth_t04_v2.zip` conversation artifact. Contains layered `.ora`, RGBA PNG and JSON for CHAR-01 and ENV-01. Binary contents have **not** been committed to the repository. Never imply GitHub contains them until a commit is verified.
- Future replacement contract: keep logical asset IDs (`CHAR-01`, `ENV-01`), frame dimensions, animation state keys, facing names, feet anchors and collision footprint stable, or introduce a versioned metadata migration. Gameplay systems must not hardcode sprite sheet row positions.
- Provisional approval is **not** an exception to zero-legacy policy and is **not** final art approval. Retain `approved:false` in candidate metadata until source/PNG/JSON are integrated and verified; distinguish `ownerProvisionalApproval` from `releaseApproved`.
- Release gate stays closed until other first-batch assets, gameplay and physical phone QA meet their respective gates.
