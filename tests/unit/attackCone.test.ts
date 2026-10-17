import { describe, expect, it } from 'vitest';
import {
  ATTACK_ARC_DEGREES,
  ATTACK_COOLDOWN_MS,
  AttackCooldown,
  isInsideAttackCone,
} from '../../src/core/combat/attackCone';

describe('attack cone', () => {
  it('uses 120° arc and 550ms cooldown', () => {
    expect(ATTACK_ARC_DEGREES).toBe(120);
    expect(ATTACK_COOLDOWN_MS).toBe(550);
  });

  it('hits targets in front within range', () => {
    const origin = { x: 0, y: 0 };
    expect(
      isInsideAttackCone({ origin, aimAngle: 0, target: { x: 1, y: 0 } }),
    ).toBe(true);
    expect(
      isInsideAttackCone({ origin, aimAngle: 0, target: { x: 1, y: 0.5 } }),
    ).toBe(true);
  });

  it('rejects targets behind the aim', () => {
    const origin = { x: 0, y: 0 };
    expect(
      isInsideAttackCone({ origin, aimAngle: 0, target: { x: -1, y: 0 } }),
    ).toBe(false);
  });

  it('enforces cooldown timing', () => {
    const cd = new AttackCooldown(550);
    expect(cd.tryStart()).toBe(true);
    expect(cd.tryStart()).toBe(false);
    cd.update(549);
    expect(cd.ready).toBe(false);
    cd.update(1);
    expect(cd.ready).toBe(true);
  });
});
