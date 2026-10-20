import { describe, expect, it } from 'vitest';
import { createParkingGarageMap } from '../../src/rebirth/map/parkingGarage';
import {
  initialParkingRoam,
  interactParkingRoam,
  stepParkingRoam,
} from '../../src/rebirth/dev/parkingRoam';

describe('B2 free-roam session', () => {
  it('moves with a bounded frame delta and keeps the player inside the map', () => {
    const garage = createParkingGarageMap();
    const start = initialParkingRoam(garage);
    const moved = stepParkingRoam(start, { x: 1, y: 0, interact: false }, 1000, garage);
    expect(moved.position.x).toBeGreaterThan(start.position.x);
    expect(moved.position.x - start.position.x).toBeLessThan(1);
    expect(moved.position.y).toBe(start.position.y);
  });

  it('updates facing without moving when the stick is released', () => {
    const garage = createParkingGarageMap();
    const start = initialParkingRoam(garage);
    const moved = stepParkingRoam(start, { x: 0, y: 1, interact: false }, 16, garage);
    const idle = stepParkingRoam(moved, { x: 0, y: 0, interact: false }, 16, garage);
    expect(moved.facing).toEqual({ x: 0, y: 1 });
    expect(idle.position).toEqual(moved.position);
    expect(idle.facing).toEqual(moved.facing);
  });

  it('routes nearby landmarks into the existing investigation state machine', () => {
    const garage = createParkingGarageMap();
    const seal = garage.landmarks[0]!;
    const atSeal = { ...initialParkingRoam(garage), position: seal.position };
    const inspected = stepParkingRoam(atSeal, { x: 0, y: 0, interact: true }, 0, garage);
    expect(inspected.garage.step).toBe('security');
    expect(inspected.garage.evidence).toContain('B2 增幅器測試封條');
    expect(interactParkingRoam(inspected, garage)).toBe(inspected);
  });
});
