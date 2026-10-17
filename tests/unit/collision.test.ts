import { describe, expect, it } from 'vitest';
import {
  createTileMap,
  isWorldBlocked,
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
    const resolved = moveWithCollision(map, from, { x: 1, y: 0 });
    expect(resolved.x).toBe(from.x);
    expect(resolved.y).toBe(from.y);
  });
});
