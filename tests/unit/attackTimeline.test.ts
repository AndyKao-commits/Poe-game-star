import { describe, expect, it } from 'vitest';
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_HIT_FRAME_MS,
  ATTACK_MOVE_LOCK_MS,
  AttackTimeline,
} from '../../src/core/combat/attackTimeline';
import { AttackCooldown } from '../../src/core/combat/attackCone';

describe('attack timeline hit sync', () => {
  it('keeps 550ms cooldown and configurable move lock', () => {
    expect(ATTACK_COOLDOWN_MS).toBe(550);
    expect(ATTACK_MOVE_LOCK_MS).toBe(280);
    expect(ATTACK_HIT_FRAME_MS).toBe(120);
  });

  it('resolves damage only on the hit frame', () => {
    const tl = new AttackTimeline();
    expect(tl.tryBegin(1.2)).toBe(true);
    expect(tl.update(100)).toBe('none');
    expect(tl.update(25)).toBe('hit');
    expect(tl.update(10)).toBe('none');
    expect(tl.currentAimAngle).toBeCloseTo(1.2);
  });

  it('locks movement until moveLockMs elapses', () => {
    const tl = new AttackTimeline({ moveLockMs: 200, hitFrameMs: 100, actionMs: 300 });
    tl.tryBegin(0);
    expect(tl.moveLocked).toBe(true);
    tl.update(199);
    expect(tl.moveLocked).toBe(true);
    tl.update(2);
    expect(tl.moveLocked).toBe(false);
  });

  it('rejects overlapping attacks until finished', () => {
    const tl = new AttackTimeline({ moveLockMs: 100, hitFrameMs: 50, actionMs: 150 });
    expect(tl.tryBegin(0)).toBe(true);
    expect(tl.tryBegin(1)).toBe(false);
    // Large dt may land hit and end the action in one step
    const event = tl.update(150);
    expect(event === 'hit' || event === 'finished').toBe(true);
    expect(tl.isActive).toBe(false);
    expect(tl.tryBegin(1)).toBe(true);
  });

  it('cooldown remains independent of hit-frame timing', () => {
    const cd = new AttackCooldown(550);
    const tl = new AttackTimeline();
    expect(cd.tryStart()).toBe(true);
    tl.tryBegin(0);
    tl.update(120);
    expect(cd.ready).toBe(false);
    cd.update(550);
    expect(cd.ready).toBe(true);
  });
});
