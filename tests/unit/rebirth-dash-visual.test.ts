import { describe, expect, it } from 'vitest';
import { dashVisualAt } from '../../src/rebirth/dev/dashVisual';

describe('Rebirth dash visual timing', () => {
  it('starts after the action event and fades before the next pose', () => {
    expect(dashVisualAt(0)?.alpha).toBe(0);
    expect(dashVisualAt(110)!.alpha).toBeGreaterThan(0);
    expect(dashVisualAt(110)!.trailLength).toBeGreaterThan(18);
    expect(dashVisualAt(260)).toBeNull();
  });

  it('rejects invalid elapsed times', () => {
    expect(dashVisualAt(-1)).toBeNull();
    expect(dashVisualAt(Number.NaN)).toBeNull();
    expect(dashVisualAt(Infinity)).toBeNull();
  });
});
