/**
 * Data-driven Rebirth sprite animation contract.
 * Kept independent of Phaser and of the (not yet checked-in) binary artwork.
 */
export const FACING_DIRECTIONS = ['south', 'west', 'east', 'north'] as const;
export const ANIMATION_STATES = ['idle', 'walk', 'attack', 'hurt'] as const;

export type FacingDirection = typeof FACING_DIRECTIONS[number];
export type AnimationState = typeof ANIMATION_STATES[number];
export type AnimationSet = Record<FacingDirection, Record<AnimationState, number[]>>;

export interface SpriteSheetMetadata {
  frameWidth: number;
  frameHeight: number;
  animations: AnimationSet;
}

export function validateSpriteSheetMetadata(
  metadata: SpriteSheetMetadata,
  sheetWidth: number,
  sheetHeight: number,
): void {
  if (!Number.isInteger(metadata.frameWidth) || metadata.frameWidth <= 0 ||
      !Number.isInteger(metadata.frameHeight) || metadata.frameHeight <= 0) {
    throw new Error('Invalid Rebirth frame dimensions');
  }
  if (sheetWidth % metadata.frameWidth !== 0 || sheetHeight % metadata.frameHeight !== 0) {
    throw new Error('Rebirth sprite sheet dimensions do not match metadata');
  }
  const capacity = (sheetWidth / metadata.frameWidth) * (sheetHeight / metadata.frameHeight);
  const seen = new Set<number>();
  const minimumFrames: Record<AnimationState, number> = {
    idle: 1, walk: 4, attack: 3, hurt: 1,
  };
  for (const facing of FACING_DIRECTIONS) {
    for (const state of ANIMATION_STATES) {
      const frames = metadata.animations?.[facing]?.[state];
      if (!Array.isArray(frames) || frames.length < minimumFrames[state]) {
        throw new Error(`Missing Rebirth animation: ${facing}/${state}`);
      }
      for (const frame of frames) {
        if (!Number.isInteger(frame) || frame < 0 || frame >= capacity) {
          throw new Error(`Rebirth animation frame outside sheet: ${frame}`);
        }
        if (seen.has(frame)) {
          throw new Error(`Rebirth animation frame assigned twice: ${frame}`);
        }
        seen.add(frame);
      }
    }
  }
}

export function animationFrame(
  metadata: SpriteSheetMetadata,
  facing: FacingDirection,
  state: AnimationState,
  elapsedMs: number,
  frameDurationMs: number,
): number {
  const frames = metadata.animations[facing][state];
  if (!frames?.length) throw new Error(`Missing Rebirth animation: ${facing}/${state}`);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 ||
      !Number.isFinite(frameDurationMs) || frameDurationMs <= 0) {
    throw new Error('Invalid Rebirth animation timing');
  }
  return frames[Math.floor(elapsedMs / frameDurationMs) % frames.length];
}
