import { describe, expect, it } from 'vitest';
import { facingFromVector, movementFromInput } from '../../src/core/movement/direction';

describe('movement', () => {
  it('normalizes diagonal speed to unit length', () => {
    const m = movementFromInput({ up: true, down: false, left: false, right: true });
    expect(m.moving).toBe(true);
    expect(Math.hypot(m.x, m.y)).toBeCloseTo(1, 10);
  });

  it('maps vectors to eight facings', () => {
    expect(facingFromVector(1, 0)).toBe('e');
    expect(facingFromVector(1, 1)).toBe('se');
    expect(facingFromVector(0, 1)).toBe('s');
    expect(facingFromVector(-1, 0)).toBe('w');
  });
});
