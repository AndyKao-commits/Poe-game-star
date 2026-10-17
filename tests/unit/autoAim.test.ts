import { describe, expect, it } from 'vitest';
import { facingToAngle, resolveAutoAimAngle } from '../../src/core/input/autoAim';

describe('auto aim', () => {
  it('aims at the nearest living enemy in range', () => {
    const angle = resolveAutoAimAngle(
      { x: 0, y: 0 },
      's',
      [
        { alive: true, position: { x: 3, y: 0 } },
        { alive: true, position: { x: 1, y: 0 } },
        { alive: false, position: { x: 0.5, y: 0 } },
      ],
      4.5,
    );
    expect(angle).toBeCloseTo(0, 5);
  });

  it('falls back to facing when no targets remain', () => {
    expect(resolveAutoAimAngle({ x: 0, y: 0 }, 'e', [], 4.5)).toBeCloseTo(facingToAngle('e'));
  });
});
