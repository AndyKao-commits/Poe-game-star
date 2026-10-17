import { describe, expect, it } from 'vitest';
import { knockbackDelta, DEFAULT_COMBAT_FEEDBACK } from '../../src/core/combat/feedback';

describe('combat feedback helpers', () => {
  it('exposes a toggleable defaults object', () => {
    expect(DEFAULT_COMBAT_FEEDBACK.enabled).toBe(true);
    expect(DEFAULT_COMBAT_FEEDBACK.hitPauseMs).toBeGreaterThan(0);
  });

  it('computes knockback away from the attacker', () => {
    const kb = knockbackDelta({ x: 0, y: 0 }, { x: 2, y: 0 }, 0.5);
    expect(kb.x).toBeCloseTo(0.5);
    expect(kb.y).toBeCloseTo(0);
  });
});
