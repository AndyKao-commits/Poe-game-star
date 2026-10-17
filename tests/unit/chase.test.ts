import { describe, expect, it } from 'vitest';
import { chaseVelocity } from '../../src/core/ai/chase';

describe('chase AI', () => {
  it('moves toward the target when in aggro range', () => {
    const v = chaseVelocity({ x: 0, y: 0 }, { x: 3, y: 0 });
    expect(v.chasing).toBe(true);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeCloseTo(0, 10);
  });

  it('idles when target is too far', () => {
    const v = chaseVelocity({ x: 0, y: 0 }, { x: 20, y: 0 });
    expect(v.chasing).toBe(false);
    expect(v.x).toBe(0);
  });
});
