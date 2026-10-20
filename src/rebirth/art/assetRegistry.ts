/**
 * Rebirth-exclusive asset contract. Metadata only; no assets are loaded here.
 * Some candidates remain external to GitHub. Checked-in candidate art is
 * still NOT approved for public runtime use without visual/device QA.
 */
export const rebirthArtRegistry = {
  'CHAR-01': {
    id: 'CHAR-01',
    revision: 'v4-template-derived',
    usage: 'provisional-development',
    ownerProvisionalApproval: true,
    releaseApproved: false,
    source: 'art/rebirth/source/aze-character.ora',
    image: '/rebirth/art/aze-character.png',
    metadata: '/rebirth/art/aze-character.json',
    frameWidth: 96,
    frameHeight: 144,
    facing: ['south', 'west', 'east', 'north'],
    states: ['idle', 'walk', 'attack', 'hurt'],
    replaceable: true,
  },
  'CHAR-02': {
    id: 'CHAR-02',
    revision: 'v1',
    usage: 'candidate-review',
    ownerProvisionalApproval: false,
    releaseApproved: false,
    source: 'art/rebirth/source/fire-brawler-character.ora',
    image: '/rebirth/art/fire-brawler-character.png',
    metadata: '/rebirth/art/fire-brawler-character.json',
    frameWidth: 96,
    frameHeight: 144,
    facing: ['south', 'west', 'east', 'north'],
    states: ['idle', 'walk', 'attack', 'hurt'],
    replaceable: true,
  },
  'ENV-01': {
    id: 'ENV-01',
    revision: 'v1',
    usage: 'candidate-review',
    ownerProvisionalApproval: false,
    releaseApproved: false,
    source: 'art/rebirth/source/urban-ground-atlas.ora',
    image: '/rebirth/art/urban-ground-atlas.png',
    metadata: '/rebirth/art/urban-ground-atlas.json',
    frameWidth: 96,
    frameHeight: 96,
    replaceable: true,
  },
} as const;

export type RebirthArtId = keyof typeof rebirthArtRegistry;
