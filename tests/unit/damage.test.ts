import { describe, expect, it } from 'vitest';
import {
  applyDamage,
  computeDamage,
  createPlayerStats,
  isDead,
  rollDamage,
} from '../../src/core/combat/damage';

describe('damage', () => {
  it('creates phase-1 player stats', () => {
    const s = createPlayerStats();
    expect(s).toMatchObject({ hp: 100, mp: 50, attack: 12, defense: 5 });
  });

  it('computes flat damage with a floor of 1', () => {
    expect(computeDamage(12, 5)).toBe(7);
    expect(computeDamage(3, 10)).toBe(1);
  });

  it('applies damage and detects death', () => {
    let s = createPlayerStats();
    s = applyDamage(s, 40);
    expect(s.hp).toBe(60);
    s = applyDamage(s, 999);
    expect(s.hp).toBe(0);
    expect(isDead(s)).toBe(true);
  });

  it('rolls crits with a deterministic rng', () => {
    const crit = rollDamage(12, 5, { rng: () => 0 });
    expect(crit.isCrit).toBe(true);
    expect(crit.amount).toBeGreaterThan(7);
    const normal = rollDamage(12, 5, { rng: () => 0.99 });
    expect(normal.isCrit).toBe(false);
    expect(normal.amount).toBe(7);
  });
});
