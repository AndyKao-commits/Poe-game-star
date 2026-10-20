# B2 Garage Environment v1

Status: original concept approved for engineering reference only. This board is not a runtime texture atlas.

Reference board: `art/rebirth/concepts/b2-garage-environment-board-v1.png`

## Visual direction

- Wet underground parking garage at night
- Charcoal and deep navy concrete with cold fluorescent pools
- Antique-gold / yellow-black hazard bands on pillars and equipment
- Restrained blue-white energy around the illegal amplifier test circuit
- Industrial Taiwanese basement details: drainage channels, service gate, exposed conduit and cable trays
- Clear readable silhouettes at compact mobile-game scale

## Runtime asset split

The board is split into original runtime assets before the B2 scene is enabled:

| Asset | Runtime role | Engineering anchor |
| --- | --- | --- |
| Floor / lane tile set | walkable floor, parking lines, drains | `chapter1-b2-garage` grid |
| Pillar / vehicle obstacle set | solid collision geometry | map obstacle cells |
| Test-seal prop | optional evidence interaction | `seal` |
| A/B/C power panel | electrical investigation | `power-panel` |
| Cable bundle / junction | route investigation | `cable` |
| Workshop electronic lock | entry interaction | `electronic-lock` |

## Constraints

- Do not use the board itself as a scaled background in the playable scene.
- Do not reuse the alley ground atlas for B2.
- Each runtime prop must have a transparent export, a stable anchor point, and a collision / interaction note.
- B2 remains gated until the split assets, metadata, and iPhone landscape test are complete.
