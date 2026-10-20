import { describe, expect, it } from 'vitest';
import { getTile, isWorldBlocked, moveWithCollision } from '../../src/core/collision/grid';
import { createParkingGarageMap, nearestGarageLandmark } from '../../src/rebirth/map/parkingGarage';

describe('B2 parking garage spatial slice', () => {
  it('provides closed boundaries, open lanes, and four narrative landmarks', () => {
    const garage = createParkingGarageMap();
    expect(garage.map.width).toBe(30);
    expect(garage.map.height).toBe(18);
    expect(getTile(garage.map, 0, 0)).toBe('wall');
    expect(getTile(garage.map, 15, 9)).toBe('floor');
    expect(garage.landmarks.map((landmark) => landmark.id)).toEqual([
      'seal', 'power-panel', 'cable', 'electronic-lock',
    ]);
  });

  it('keeps the player spawn clear and prevents crossing a pillar', () => {
    const garage = createParkingGarageMap();
    expect(isWorldBlocked(garage.map, garage.playerSpawn)).toBe(false);
    const moved = moveWithCollision(garage.map, { x: 5.5, y: 4.5 }, { x: 1.4, y: 0 });
    expect(moved.x).toBeLessThan(6);
  });

  it('returns only landmarks inside their interaction radius', () => {
    const garage = createParkingGarageMap();
    const seal = garage.landmarks[0]!;
    expect(nearestGarageLandmark(garage, seal.position)).toBe('seal');
    expect(nearestGarageLandmark(garage, { x: 15.5, y: 9.5 })).toBeNull();
  });
});
