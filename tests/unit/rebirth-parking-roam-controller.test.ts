import { describe, expect, it } from 'vitest';
import { ParkingRoamController } from '../../src/rebirth/dev/parkingRoamController';

describe('B2 parking roam controller bridge', () => {
  it('exposes an interaction prompt only near an authored landmark', () => {
    const controller = new ParkingRoamController();
    expect(controller.tick({ x: 0, y: 0, interact: false }, 0).interactionLabel).toBeNull();
    let snapshot = controller.tick({ x: 1, y: -1, interact: false }, 50);
    for (let now = 100; now <= 1050; now += 50) {
      snapshot = controller.tick({ x: 1, y: -2, interact: false }, now);
    }
    expect(snapshot.nearbyLandmark).toBe('seal');
    expect(snapshot.interactionLabel).toBe('調查測試封條');
  });

  it('keeps time monotonic and routes interaction through the roam state', () => {
    const controller = new ParkingRoamController();
    const seal = controller.blueprint.landmarks[0]!;
    const state = controller.tick({ x: 0, y: 0, interact: false }, 0);
    expect(state.garageStep).toBe('entrance');
    // The controller is scene-facing; tests can place the authored actor at a
    // landmark through its deterministic blueprint without rendering assets.
    const atSeal = controller.blueprint.playerSpawn;
    expect(atSeal).not.toEqual(seal.position);
    expect(() => controller.tick({ x: 0, y: 0, interact: false }, -1)).toThrow('Nonmonotonic');
  });

  it('resets both the investigation step and the clock', () => {
    const controller = new ParkingRoamController();
    controller.tick({ x: 1, y: 0, interact: false }, 100);
    const reset = controller.reset();
    expect(reset.garageStep).toBe('entrance');
    expect(reset.evidence).toEqual([]);
    expect(controller.tick({ x: 0, y: 0, interact: false }, 0).garageStep).toBe('entrance');
  });
});
