# Rebirth — 第一章正式美術製作規格 / Art Production Spec

Version: 0.1 / 2026-10-19  
Status: **IMPLEMENTATION SPEC (provisional technical sizes)** — follows approved GAME_CONTRACT v0.7.2; technical measurements may be adjusted after actual mobile legibility tests.  
Scope: Chapter 1 「只是想買個宵夜」 opening alley vertical slice; no legacy asset reference.

## 1. Hard rules
1. **Every in-game asset must be purpose-made final Rebirth art.** No placeholder, proxy, procedural stand-in, old-version sprite, borrowed texture, temporary icon or AI image with inconsistent visual style.
2. No active scene may load a missing/unreviewed asset. A feature with incomplete art remains disabled behind the non-playable entry gate.
3. Modern fictional Taiwan: convenience store, shop signs, scooters, asphalt, lane markings, drain covers, neon-lit apartment fronts, parking entrance, utility cabinets. No ruins, temples, talismans, gods, folklore or religious motifs.
4. Magic is secular technology: precise geometric energy lines, translucent interference, metered electronics and compact devices.
5. Text embedded in images must be avoided for localization. Use Unicode UI fonts and separate game text layers; brand signage must be fictional.

## 2. Visual language
- Camera proposal: **top-down / 3-quarter orthographic 2D**, not isometric projection. Ground plane rectangular grid. Character feet anchor controls depth ordering.
- Palette target (art direction, not runtime placeholder): midnight navy `#101A2A`, road blue `#253547`, concrete `#526273`, fluorescent cyan `#4CE0E0`, warm shop amber `#FFB65C`, emergency coral `#FF6672`, readable off-white `#F0F7FA`.
- Stylized hand-authored low-resolution art, clean silhouettes, deliberate clusters of pixels, limited palette per object, readable at ~2x–3x integer scaling.
- Consistent light direction upper-left; night-time pools of shop lighting; do not bake essential combat telegraphs into scenery.
- Silhouettes: player narrow casual jacket + messenger bag, enemies distinguishable by equipment and attack silhouette, not skin tone/clothing identity alone.
- Target 60fps; visual effects need particle budgets and reduce-motion variants, benchmark before claiming performance.

## 3. Source & export conventions
- Authoring files: layered `.aseprite` or layered `.kra` / `.psd` (choose and document per asset); **final runtime** `.png` with transparency for characters and objects. Keep sources under `art/rebirth/source/` and runtime exports under `public/rebirth/art/`.
- All character sprites anchored to feet; no shadows painted outside expected frame unless separately specified.
- Environment: initial **32×32** orthogonal tiles, pixel snapping; initial protagonist frame **32×48**; these are targets, not acceptance until phone test.
- Sprite sheets: consistent grid, no partial cells, nearest-neighbor, transparent RGBA; metadata JSON alongside every sheet (frame dimensions, animation ranges, pivot/feet anchor, collision footprint, revision).
- File naming: lowercase ASCII kebab-case; no `tile-floor.png`, `player.png`, `enemy.png` generic names from earlier runtime. Rebirth prefix/namespace required.
- Transparency edges checked at native scale and 2x/3x; avoid unintended halo.
- The manifest below describes **required outputs**, not existing files. Missing files are never generated automatically.

## 4. First production batch — required final assets
| ID | Runtime path (planned) | Export target | Content & acceptance |
| --- | --- | --- | --- |
| ENV-01 | `public/rebirth/art/urban-ground-atlas.png` | 32px tile grid, dimensions TBD | Asphalt variants, painted line, sidewalk, curb, drain, concrete, cracked road; seamless tile joins |
| ENV-02 | `public/rebirth/art/urban-facade-atlas.png` | 32px tile grid, dimensions TBD | Modern storefront, apartment wall, lit shop window, door, parking entry; depth/collision layers documented |
| PROP-01 | `public/rebirth/art/urban-street-props.png` | separate spritesheet, metadata required | Scooter (parked), traffic cone, bollard, electrical box, trash bin, AC unit, street lamp; readable obstruction footprint |
| CHAR-01 | `public/rebirth/art/aze-character.png` | 32×48 frame target | 阿澤 idle/walk/attack/hurt in four cardinal directions; at least 4-frame walk and 3-frame attack per facing |
| CHAR-02 | `public/rebirth/art/fire-brawler-character.png` | 32×48 frame target | 火拳混混 idle/walk/windup/attack/hurt; orange gauntlet silhouette; readable 0.5s warning |
| CHAR-03 | `public/rebirth/art/shock-caster-character.png` | 32×48 frame target | 電擊仔 idle/walk/windup/attack/hurt; compact emitter and cyan discharge |
| CHAR-04 | `public/rebirth/art/barrier-guard-character.png` | 32×48 frame target | 結界打手 idle/walk/windup/attack/hurt; clear frontal barrier outline and flank exposure |
| VFX-01 | `public/rebirth/art/rebirth-combat-vfx.png` | sprite sheet, metadata required | Basic impact, 魔力衝拳, 瞬步 trail, damage flashes, enemy windup geometry; no religious symbols |
| UI-01 | `public/rebirth/art/rebirth-combat-icons.png` | 48×48 per icon minimum at display density | Basic attack, 魔力衝拳, 瞬步, HP/MP, cooldown states; touch affordance without baked text |

**Next batches (NOT first-batch complete):** garage and workshop tiles, boss 阿彪 and overload VFX, safehouse interior, NPC portraits, dialogue backgrounds, six run-boon icons.

## 5. Scene composition and UX integration
- Reference logical world: 480×270, landscape-first; game camera letterbox/crop rules determined by actual viewport tests. HUD and touch buttons use screen-space sizing independent of art pixel grid.
- Touch left joystick, right attack + 2 active skill buttons, safe-area-aware; buttons must be distinct even without color (icon silhouettes and labels).
- Scene layers: ground → below-character props → character feet-sorted entities → above-character occluders → lighting/VFX → screen-space HUD.
- Hitboxes defined by gameplay metadata, never inferred from full transparent sprite bounds.
- Required visual states: player idle/walk/attack/hurt; enemies windup/attack/hurt; target selection, cooldown, insufficient MP, damage/death; no combat scene enabled without them.
- Verify at landscape 844×390, 932×430 and 740×360 CSS pixels plus representative Android landscape. These are test viewports, **not evidence of testing**.

## 6. Asset acceptance gates
1. **Authenticity:** provenance/author/source recorded, created specifically for Rebirth; no old art and no unlicensed third-party assets.
2. **Completeness:** source file + exported PNG + metadata; all required directions/states; no missing references.
3. **Consistency:** matching palette, outline weight, lighting, projection, sprite scale, collision footprints.
4. **Readability:** visual review at native 480×270 and landscape mobile viewport; telegraph recognition without color alone.
5. **Technical:** decode successfully; alpha and dimensions match manifest; no runtime request to legacy `/assets/` path.
6. **QA:** typecheck, unit, build, Playwright; real Safari/Chrome phone verification explicitly tracked separately.
7. **Activation:** only after gates 1–6 pass may the non-playable entry gate route to a Rebirth-only gameplay scene. Until then, display honest development status.

## 7. First asset handoff record
- **Delivered final art:** NONE as of this specification.
- **Approved game-ready sprites:** NONE.
- **Active gameplay scene:** BLOCKED.
- **Owner approval:** art direction must be visually reviewed against the contract; this document does not invent visual approval.
- **Rollback:** remove this specification and any subsequent unapproved art files from the Rebirth branch only; never touch main or historical archives.
