import { describe, expect, it } from 'vitest';
import {
  clampJoystickOffset,
  screenDeltaToWorldMove,
} from '../../src/core/input/screenToIsoMove';
import { worldToScreen } from '../../src/core/iso/coordinates';

describe('screenDeltaToWorldMove', () => {
  it('maps screen-right drag to a world vector that increases screen x', () => {
    const move = screenDeltaToWorldMove(1, 0);
    expect(move.moving).toBe(true);
    const screen = worldToScreen({ x: move.x, y: move.y });
    expect(screen.x).toBeGreaterThan(0);
    expect(Math.abs(screen.y)).toBeLessThan(Math.abs(screen.x));
  });

  it('normalizes diagonal screen drags', () => {
    const move = screenDeltaToWorldMove(1, 1);
    expect(Math.hypot(move.x, move.y)).toBeCloseTo(1, 10);
  });

  it('returns idle for zero drag', () => {
    expect(screenDeltaToWorldMove(0, 0)).toEqual({ x: 0, y: 0, moving: false });
  });
});

describe('clampJoystickOffset', () => {
  it('limits magnitude to max radius', () => {
    const c = clampJoystickOffset(100, 0, 40);
    expect(c.magnitude).toBe(40);
    expect(c.x).toBeCloseTo(40);
  });
});
