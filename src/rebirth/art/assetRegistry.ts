/**
 * Rebirth-exclusive asset contract. Metadata only; no assets are loaded here.
 * Binary candidate files are still external to GitHub and MUST NOT be requested
 * by the release-gated entry scene until their source/export/metadata is checked in.
 */
export const rebirthArtRegistry = {
  'CHAR-01': {
    id: 'CHAR-01',
    revision: 'v2',
    usage: 'provisional-development',
    ownerProvisionalApproval: true,
    releaseApproved: false,
    source: 'art/rebirth/source/aze-character.ora',
    image: '/rebirth/art/aze-character.png',
    metadata: '/rebirth/art/aze-character.json',
    frameWidth: 32,
    frameHeight: 48,
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
    frameWidth: 32,
    frameHeight: 32,
    replaceable: true,
  },
} as const;

export type RebirthArtId = keyof typeof rebirthArtRegistry;
