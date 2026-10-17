import { describe, expect, it } from 'vitest';
import {
  clampJoystickOffset,
  joystickIntensity,
  JOYSTICK_DEAD_ZONE,
  screenDeltaToWorldMove,
} from '../../src/core/input/screenToIsoMove';
import { worldToScreen } from '../../src/core/iso/coordinates';

describe('screenDeltaToWorldMove', () => {
  it('maps screen-right drag to a world vector that increases screen x', () => {
    const move = screenDeltaToWorldMove(1, 0);
    expect(move.moving).toBe(true);
    expect(move.intensity).toBe(1);
    const screen = worldToScreen({ x: move.x, y: move.y });
    expect(screen.x).toBeGreaterThan(0);
    expect(Math.abs(screen.y)).toBeLessThan(Math.abs(screen.x));
  });

  it('keeps diagonal speed within unit circle at full deflection', () => {
    const move = screenDeltaToWorldMove(1, 1);
    expect(Math.hypot(move.x, move.y)).toBeCloseTo(1, 10);
  });

  it('returns idle for zero drag', () => {
    expect(screenDeltaToWorldMove(0, 0)).toMatchObject({
      x: 0,
      y: 0,
      moving: false,
      intensity: 0,
    });
  });

  it('outputs analog intensity between dead zone and full throw', () => {
    const dead = screenDeltaToWorldMove(JOYSTICK_DEAD_ZONE * 0.5, 0, { analog: true });
    expect(dead.moving).toBe(false);
    expect(dead.intensity).toBe(0);

    const partialMag = JOYSTICK_DEAD_ZONE + (1 - JOYSTICK_DEAD_ZONE) * 0.5;
    const partial = screenDeltaToWorldMove(partialMag, 0, { analog: true });
    expect(partial.moving).toBe(true);
    expect(partial.intensity).toBeCloseTo(0.5, 5);
    expect(Math.hypot(partial.x, partial.y)).toBeCloseTo(0.5, 5);

    const full = screenDeltaToWorldMove(1, 0, { analog: true });
    expect(full.intensity).toBe(1);
    expect(Math.hypot(full.x, full.y)).toBeCloseTo(1, 10);
  });
});

describe('joystickIntensity', () => {
  it('uses a 12% dead zone and scales 0..1 afterward', () => {
    expect(JOYSTICK_DEAD_ZONE).toBe(0.12);
    expect(joystickIntensity(0.05)).toBe(0);
    expect(joystickIntensity(0.12)).toBe(0);
    expect(joystickIntensity(0.56)).toBeCloseTo(0.5, 5);
    expect(joystickIntensity(1)).toBe(1);
    expect(joystickIntensity(1.2)).toBe(1);
  });
});

describe('clampJoystickOffset', () => {
  it('limits magnitude to max radius', () => {
    const c = clampJoystickOffset(100, 0, 40);
    expect(c.magnitude).toBe(40);
    expect(c.x).toBeCloseTo(40);
  });
});
