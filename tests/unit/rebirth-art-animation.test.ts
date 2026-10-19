import { describe, expect, it } from 'vitest';
import {
  animationFrame, validateSpriteSheetMetadata, type SpriteSheetMetadata,
} from '../../src/rebirth/art/animationContract';

function validMetadata(): SpriteSheetMetadata {
  const animations = {} as SpriteSheetMetadata['animations'];
  for (const [row, direction] of ['south', 'west', 'east', 'north'].entries()) {
    const start = row * 9;
    animations[direction as keyof typeof animations] = {
      idle: [start],
      walk: [start + 1, start + 2, start + 3, start + 4],
      attack: [start + 5, start + 6, start + 7],
      hurt: [start + 8],
    };
  }
  return { frameWidth: 32, frameHeight: 48, animations };
}

describe('Rebirth V2 sprite sheet contract', () => {
  it('accepts the 9x4 four-facing sheet', () => {
    expect(() => validateSpriteSheetMetadata(validMetadata(), 288, 192)).not.toThrow();
  });
  it('rejects mismatched PNG dimensions', () => {
    expect(() => validateSpriteSheetMetadata(validMetadata(), 287, 192)).toThrow('dimensions');
  });
  it('rejects missing directional animations', () => {
    const metadata = validMetadata();
    metadata.animations.north.walk = [];
    expect(() => validateSpriteSheetMetadata(metadata, 288, 192)).toThrow('north/walk');
  });
  it('rejects reused animation frames', () => {
    const metadata = validMetadata();
    metadata.animations.east.hurt = [0];
    expect(() => validateSpriteSheetMetadata(metadata, 288, 192)).toThrow('assigned twice');
  });
  it('rejects out-of-range indices', () => {
    const metadata = validMetadata();
    metadata.animations.south.attack[1] = 36;
    expect(() => validateSpriteSheetMetadata(metadata, 288, 192)).toThrow('outside sheet');
  });
  it('plays and loops using metadata instead of hardcoded rows', () => {
    const metadata = validMetadata();
    expect(animationFrame(metadata, 'south', 'walk', 0, 150)).toBe(1);
    expect(animationFrame(metadata, 'south', 'walk', 450, 150)).toBe(4);
    expect(animationFrame(metadata, 'south', 'walk', 600, 150)).toBe(1);
    expect(animationFrame(metadata, 'north', 'attack', 220, 110)).toBe(34);
  });
  it('rejects invalid timing', () => {
    expect(() => animationFrame(validMetadata(), 'south', 'walk', -1, 150)).toThrow('timing');
    expect(() => animationFrame(validMetadata(), 'south', 'walk', 100, 0)).toThrow('timing');
  });
});
