import { describe, expect, it } from 'vitest';
import {
  createTileMap,
  isWorldBlocked,
  MAX_STEP_RADIUS_FRACTION,
  moveWithCollision,
  setTile,
} from '../../src/core/collision/grid';

describe('grid collision', () => {
  it('blocks walls and allows floors', () => {
    const map = createTileMap(5, 5, 'floor');
    setTile(map, 2, 2, 'wall');
    expect(isWorldBlocked(map, { x: 1.5, y: 1.5 })).toBe(false);
    expect(isWorldBlocked(map, { x: 2.5, y: 2.5 })).toBe(true);
  });

  it('slides along walls with separated axes', () => {
    const map = createTileMap(8, 8, 'floor');
    setTile(map, 3, 2, 'wall');
    const from = { x: 2.5, y: 2.5 };
    // Pure X push stops before entering the wall (may approach contact via sub-steps)
    const blocked = moveWithCollision(map, from, { x: 1, y: 0 });
    expect(blocked.x).toBeLessThan(3);
    expect(isWorldBlocked(map, blocked)).toBe(false);

    // Diagonal intent: X blocked, Y still slides
    const slid = moveWithCollision(map, from, { x: 1, y: 0.8 });
    expect(slid.x).toBeLessThan(3);
    expect(slid.y).toBeGreaterThan(from.y);
  });

  it('does not tunnel through walls at high speed', () => {
    const map = createTileMap(12, 4, 'floor');
    setTile(map, 5, 1, 'wall');
    setTile(map, 5, 2, 'wall');
    const from = { x: 2.5, y: 1.5 };
    // Delta far larger than one tile — would skip the wall without sub-steps
    const resolved = moveWithCollision(map, from, { x: 6, y: 0 }, 0.28);
    expect(resolved.x).toBeLessThan(5);
    expect(isWorldBlocked(map, resolved, 0.28)).toBe(false);
  });

  it('allows diagonal slide along a wall', () => {
    const map = createTileMap(10, 10, 'floor');
    for (let y = 0; y < 10; y++) setTile(map, 4, y, 'wall');
    const from = { x: 3.2, y: 5 };
    const resolved = moveWithCollision(map, from, { x: 1.5, y: 1.2 }, 0.28);
    expect(resolved.x).toBeLessThan(4 - 0.28);
    expect(resolved.y).toBeGreaterThan(from.y);
  });

  it('blocks map boundary / void outside the grid', () => {
    const map = createTileMap(4, 4, 'floor');
    const from = { x: 0.4, y: 2 };
    const resolved = moveWithCollision(map, from, { x: -2, y: 0 }, 0.28);
    expect(resolved.x).toBeGreaterThanOrEqual(from.x);
    expect(isWorldBlocked(map, resolved, 0.28)).toBe(false);
  });

  it('uses a sub-step size tied to collision radius', () => {
    expect(MAX_STEP_RADIUS_FRACTION).toBeLessThanOrEqual(0.5);
    expect(MAX_STEP_RADIUS_FRACTION).toBeGreaterThan(0);
  });
});
