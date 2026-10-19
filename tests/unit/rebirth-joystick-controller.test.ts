import { describe, expect, it } from 'vitest';
import { RebirthJoystickController } from '../../src/rebirth/input/joystickController';

const center = { x: 100, y: 200 };
const config = { radius: 56, deadZone: 0.16, captureRadius: 72 };
const create = () => new RebirthJoystickController(center, config);

describe('Rebirth fixed joystick multi-touch ownership', () => {
  it('keeps the fixed base at the configured position while dragging', () => {
    const joystick = create();
    expect(joystick.pointerDown(7, { x: 110, y: 200 })).toBe(true);
    joystick.pointerMove(7, { x: 150, y: 220 });
    expect(joystick.snapshot().center).toEqual(center);
    expect(joystick.snapshot().stick.magnitude).toBeGreaterThan(0);
  });

  it('rejects remote touches instead of jumping the base', () => {
    const joystick = create();
    expect(joystick.pointerDown(2, { x: 500, y: 200 })).toBe(false);
    expect(joystick.snapshot().pointerId).toBeNull();
    expect(joystick.snapshot().stick.magnitude).toBe(0);
  });

  it('does not let the attack finger steal or move the joystick', () => {
    const joystick = create();
    joystick.pointerDown(1, center);
    joystick.pointerMove(1, { x: 150, y: 200 });
    const before = joystick.snapshot();
    expect(joystick.pointerDown(2, center)).toBe(false);
    joystick.pointerMove(2, { x: 44, y: 200 });
    joystick.pointerUp(2);
    expect(joystick.snapshot()).toEqual(before);
  });

  it('resets on owner release and ignores a stale pointer', () => {
    const joystick = create();
    joystick.pointerDown(3, center);
    joystick.pointerMove(3, { x: 180, y: 200 });
    joystick.pointerUp(3);
    joystick.pointerMove(3, { x: 180, y: 200 });
    expect(joystick.snapshot()).toEqual({
      mode: 'fixed', center, pointerId: null, stick: { x: 0, y: 0, magnitude: 0 },
    });
  });

  it('clears movement immediately on cancellation, focus loss or orientation change', () => {
    const joystick = create();
    joystick.pointerDown(3, center);
    joystick.pointerMove(3, { x: 180, y: 200 });
    joystick.reset();
    expect(joystick.snapshot().stick).toEqual({ x: 0, y: 0, magnitude: 0 });
  });

  it('keeps floating mode opt-in and reanchors only on a new valid touch', () => {
    const joystick = create();
    joystick.setMode('floating');
    expect(joystick.pointerDown(4, { x: 110, y: 200 })).toBe(true);
    expect(joystick.snapshot().center).toEqual({ x: 110, y: 200 });
    joystick.pointerMove(4, { x: 160, y: 200 });
    expect(joystick.snapshot().center).toEqual({ x: 110, y: 200 });
    joystick.setMode('fixed');
    expect(joystick.snapshot().center).toEqual(center);
    expect(joystick.snapshot().pointerId).toBeNull();
  });

  it('rejects invalid pointer IDs and nonfinite input', () => {
    const joystick = create();
    expect(joystick.pointerDown(-1, center)).toBe(false);
    expect(joystick.pointerDown(1.5, center)).toBe(false);
    expect(joystick.pointerDown(2, { x: NaN, y: 200 })).toBe(false);
    expect(joystick.pointerDown(2, center)).toBe(true);
    joystick.pointerMove(2, { x: Infinity, y: 200 });
    expect(joystick.snapshot().stick.magnitude).toBe(0);
  });
});
