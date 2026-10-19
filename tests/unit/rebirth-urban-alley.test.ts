import { describe, expect, it } from 'vitest';
import { getTile, isBlocking, isWorldBlocked } from '../../src/core/collision/grid';
import { createUrbanAlleyMap } from '../../src/rebirth/map/urbanAlley';

describe('Rebirth chapter 1 modern alley blueprint', () => {
  it('provides a stable urban chapter identifier and narrative landmarks', () => {
    const level = createUrbanAlleyMap();
    expect(level.id).toBe('chapter1-alley');
    expect(level.label).toContain('只是想買個宵夜');
    expect(level.landmarks.map((p) => p.id)).toEqual([
      'convenience-store', 'food-stall', 'scooters', 'parking-entrance',
    ]);
  });

  it('has valid map dimensions, a walkable player spawn and five walkable enemy spawns', () => {
    const level = createUrbanAlleyMap();
    expect(level.map.width).toBe(24);
    expect(level.map.height).toBe(24);
    expect(level.map.tiles).toHaveLength(24 * 24);
    expect(level.enemySpawns).toHaveLength(5);
    for (const spawn of [level.playerSpawn, ...level.enemySpawns]) {
      expect(isWorldBlocked(level.map, spawn)).toBe(false);
    }
  });

  it('closes all outer borders and represents scooters as collision obstacles', () => {
    const { map } = createUrbanAlleyMap();
    for (let x = 0; x < map.width; x++) {
      expect(isBlocking(getTile(map, x, 0))).toBe(true);
      expect(isBlocking(getTile(map, x, map.height - 1))).toBe(true);
    }
    for (let y = 0; y < map.height; y++) {
      expect(isBlocking(getTile(map, 0, y))).toBe(true);
      expect(isBlocking(getTile(map, map.width - 1, y))).toBe(true);
    }
    expect(getTile(map, 4, 8)).toBe('obstacle');
  });
});
