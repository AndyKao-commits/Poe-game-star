import { describe, expect, it } from 'vitest';
import {
  depthFromFoot,
  screenToWorld,
  TILE_HEIGHT,
  TILE_WIDTH,
  worldToScreen,
} from '../../src/core/iso/coordinates';

describe('isometric coordinates', () => {
  it('uses 64×32 tile metrics', () => {
    expect(TILE_WIDTH).toBe(64);
    expect(TILE_HEIGHT).toBe(32);
  });

  it('round-trips world ↔ screen', () => {
    const world = { x: 3.25, y: 7.5 };
    const screen = worldToScreen(world);
    const back = screenToWorld(screen);
    expect(back.x).toBeCloseTo(world.x, 10);
    expect(back.y).toBeCloseTo(world.y, 10);
  });

  it('sorts depth by foot position x+y', () => {
    expect(depthFromFoot({ x: 2, y: 3 })).toBe(5);
    expect(depthFromFoot({ x: 5, y: 1 })).toBeGreaterThan(depthFromFoot({ x: 1, y: 1 }));
  });
});
