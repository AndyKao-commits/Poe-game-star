import { describe, expect, it } from 'vitest';
import {
  REBIRTH_ALPHA_ACTOR_WORLD_SIZE,
  REBIRTH_ALPHA_DIMENSIONS,
  REBIRTH_ALPHA_GROUND_WORLD_SIZE,
} from '../../src/rebirth/dev/alphaDimensions';

describe('Rebirth Alpha unified size contract', () => {
  it('maps actor frames and ground frames into the same 32px world grid', () => {
    expect(REBIRTH_ALPHA_ACTOR_WORLD_SIZE).toEqual({ width: 32, height: 48 });
    expect(REBIRTH_ALPHA_GROUND_WORLD_SIZE).toBe(32);
    expect(REBIRTH_ALPHA_DIMENSIONS.worldTile).toBe(32);
  });

  it('does not apply a second camera enlargement', () => {
    expect(REBIRTH_ALPHA_DIMENSIONS.cameraZoom).toBe(1);
  });
});
