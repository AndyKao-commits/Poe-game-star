import { describe, expect, it } from 'vitest';
import {
  joystickVector, movementVelocity, touchControlLayout,
} from '../../src/rebirth/input/touchControls';

describe('Rebirth mobile landscape touch control math', () => {
  it('does not drift while finger is within the dead zone', () => {
    expect(joystickVector({ x: 100, y: 100 }, { x: 105, y: 100 }))
      .toEqual({ x: 0, y: 0, magnitude: 0 });
  });
  it('caps stick magnitude outside the joystick radius', () => {
    expect(joystickVector({ x: 0, y: 0 }, { x: 1000, y: 0 }))
      .toEqual({ x: 1, y: 0, magnitude: 1 });
  });
  it('normalizes diagonal movement without a speed exploit', () => {
    const stick = joystickVector({ x: 0, y: 0 }, { x: 100, y: 100 });
    const velocity = movementVelocity(stick, 150);
    expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(150);
    expect(velocity.x).toBeCloseTo(velocity.y);
  });
  it('retains analog speed at intermediate distances', () => {
    const stick = joystickVector({ x: 0, y: 0 }, { x: 28, y: 0 });
    expect(stick.magnitude).toBeCloseTo((0.5 - 0.16) / 0.84);
    expect(movementVelocity(stick).x).toBeCloseTo(stick.magnitude * 150);
  });
  it('rejects nonfinite pointer coordinates and impossible joystick geometry', () => {
    expect(() => joystickVector({ x: 0, y: 0 }, { x: NaN, y: 0 })).toThrow();
    expect(() => joystickVector({ x: 0, y: 0 }, { x: 10, y: 0 }, { radius: 0, deadZone: 0 })).toThrow();
    expect(() => joystickVector({ x: 0, y: 0 }, { x: 10, y: 0 }, { radius: 50, deadZone: 1 })).toThrow();
  });
  it('keeps controls within a typical 844x390 landscape viewport with cutouts', () => {
    const layout = touchControlLayout(844, 390, { left: 44, right: 44, bottom: 10 });
    for (const center of [
      layout.joystickCenter, layout.basicAttackCenter,
      layout.skillOneCenter, layout.skillTwoCenter,
    ]) {
      expect(center.x).toBeGreaterThan(44);
      expect(center.x).toBeLessThan(800);
      expect(center.y).toBeGreaterThan(0);
      expect(center.y).toBeLessThan(380);
    }
    expect(layout.joystickCenter.x).toBeLessThan(layout.skillOneCenter.x);
  });
  it('rejects impossible safe areas rather than returning NaN coordinates', () => {
    expect(() => touchControlLayout(320, 200, { left: 200, right: 200, bottom: 0 })).toThrow();
    expect(() => touchControlLayout(844, 390, { left: 0, right: 0, bottom: Infinity })).toThrow();
  });
});
