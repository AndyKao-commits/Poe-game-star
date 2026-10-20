/** Single source of truth for the Rebirth Alpha world-to-art scale. */
export const REBIRTH_ALPHA_DIMENSIONS = {
  logicalViewport: { width: 480, height: 270 },
  actorFrame: { width: 96, height: 144 },
  groundFrame: { width: 96, height: 96 },
  worldTile: 32,
  actorScale: 1 / 3,
  groundScale: 1 / 3,
  cameraZoom: 1,
} as const;

export const REBIRTH_ALPHA_ACTOR_WORLD_SIZE = {
  width: REBIRTH_ALPHA_DIMENSIONS.actorFrame.width * REBIRTH_ALPHA_DIMENSIONS.actorScale,
  height: REBIRTH_ALPHA_DIMENSIONS.actorFrame.height * REBIRTH_ALPHA_DIMENSIONS.actorScale,
} as const;

export const REBIRTH_ALPHA_GROUND_WORLD_SIZE =
  REBIRTH_ALPHA_DIMENSIONS.groundFrame.width * REBIRTH_ALPHA_DIMENSIONS.groundScale;
