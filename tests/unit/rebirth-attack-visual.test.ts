import { describe, expect, it } from 'vitest';
import { attackVisualAt } from '../../src/rebirth/dev/attackVisual';

describe('Rebirth directional strike visual timing', () => {
  it('plays all three original attack frames once and returns to locomotion', () => {
    expect(attackVisualAt('basic', 0)?.frameIndex).toBe(0);
    expect(attackVisualAt('basic', 95)?.frameIndex).toBe(1);
    expect(attackVisualAt('basic', 190)?.frameIndex).toBe(2);
    expect(attackVisualAt('basic', 270)).toBeNull();
  });
  it('makes magical punch longer and stronger than a normal swing', () => {
    expect(attackVisualAt('punch', 0)?.strength).toBe(1.5);
    expect(attackVisualAt('basic', 0)?.strength).toBe(1);
    expect(attackVisualAt('punch', 275)?.frameIndex).toBe(2);
    expect(attackVisualAt('punch', 330)).toBeNull();
  });
  it('has a visible sweep with peak movement and fades cleanly', () => {
    const start = attackVisualAt('basic', 0)!;
    const middle = attackVisualAt('basic', 135)!;
    const end = attackVisualAt('basic', 260)!;
    expect(start.sweepAngle).toBeLessThan(middle.sweepAngle);
    expect(middle.sweepAngle).toBeLessThan(end.sweepAngle);
    expect(middle.trailAlpha).toBeGreaterThan(start.trailAlpha);
    expect(middle.trailAlpha).toBeGreaterThan(end.trailAlpha);
    expect(middle.lunge).toBeGreaterThan(0.7);
    expect(attackVisualAt('punch', 165)!.lunge).toBeGreaterThan(middle.lunge);
  });
  it('rejects invalid animation times', () => {
    expect(attackVisualAt('basic', -1)).toBeNull();
    expect(attackVisualAt('punch', Number.NaN)).toBeNull();
    expect(attackVisualAt('basic', Infinity)).toBeNull();
  });
});
