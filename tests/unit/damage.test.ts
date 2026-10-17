import { describe, expect, it } from 'vitest';
import {
  applyDamage,
  calculateDamage,
  computeDamage,
  computeMitigation,
  createPlayerStats,
  DEFAULT_CRIT_CHANCE,
  DEFAULT_CRIT_MULTIPLIER,
  isDead,
  rollDamage,
} from '../../src/core/combat/damage';

describe('GDD V0.1 damage formula', () => {
  it('creates phase-1 player stats', () => {
    const s = createPlayerStats();
    expect(s).toMatchObject({ hp: 100, mp: 50, attack: 12, defense: 5 });
  });

  it('uses 5% default crit chance and 150% crit multiplier', () => {
    expect(DEFAULT_CRIT_CHANCE).toBe(0.05);
    expect(DEFAULT_CRIT_MULTIPLIER).toBe(1.5);
  });

  it('applies mitigation = defense / (defense + 100)', () => {
    expect(computeMitigation(0)).toBe(0);
    expect(computeMitigation(100)).toBeCloseTo(0.5);
    expect(computeMitigation(5)).toBeCloseTo(5 / 105);
  });

  it('computes non-crit basic attack via the shared entry', () => {
    // raw = 12 * 1 * 1 + 0 = 12
    // mit = 5/105 → final = floor(12 * (1 - 5/105) * 1) = floor(12 * 100/105) = floor(11.428…) = 11
    const roll = calculateDamage({
      baseAttack: 12,
      defense: 5,
      critChance: 0,
      rng: () => 1,
    });
    expect(roll.isCrit).toBe(false);
    expect(roll.rawDamage).toBe(12);
    expect(roll.amount).toBe(11);
    expect(computeDamage(12, 5)).toBe(11);
  });

  it('applies skill multiplier, increased, and flat additives before mitigation', () => {
    // raw = 10 * 2 * (1 + 0.5) + 3 = 33
    // mit = 0 → floor(33 * 1 * 1) = 33
    const roll = calculateDamage({
      baseAttack: 10,
      defense: 0,
      skillMultiplier: 2,
      increasedDamage: 0.5,
      flatDamage: 3,
      critChance: 0,
      rng: () => 1,
    });
    expect(roll.rawDamage).toBe(33);
    expect(roll.amount).toBe(33);
  });

  it('rolls crits with injected rng and non-crit multiplier of 1', () => {
    const crit = calculateDamage({
      baseAttack: 12,
      defense: 5,
      critChance: 0.05,
      critMultiplier: 1.5,
      rng: () => 0,
    });
    expect(crit.isCrit).toBe(true);
    // floor(12 * (100/105) * 1.5) = floor(17.142…) = 17
    expect(crit.amount).toBe(17);

    const normal = calculateDamage({
      baseAttack: 12,
      defense: 5,
      critChance: 0.05,
      rng: () => 0.99,
    });
    expect(normal.isCrit).toBe(false);
    expect(normal.amount).toBe(11);
  });

  it('never drops below 1 damage even with extreme defense', () => {
    const roll = calculateDamage({
      baseAttack: 1,
      defense: 10_000,
      critChance: 0,
      rng: () => 1,
    });
    expect(roll.amount).toBe(1);
    expect(roll.mitigation).toBeCloseTo(10000 / 10100);
  });

  it('clamps negative defense for mitigation', () => {
    expect(computeMitigation(-20)).toBe(0);
    const roll = calculateDamage({
      baseAttack: 10,
      defense: -20,
      critChance: 0,
      rng: () => 1,
    });
    expect(roll.amount).toBe(10);
  });

  it('keeps rollDamage as a thin alias of calculateDamage', () => {
    const a = rollDamage(12, 5, { rng: () => 0.99, critChance: 0 });
    const b = calculateDamage({
      baseAttack: 12,
      defense: 5,
      rng: () => 0.99,
      critChance: 0,
    });
    expect(a).toEqual(b);
  });

  it('applies damage and detects death', () => {
    let s = createPlayerStats();
    s = applyDamage(s, 40);
    expect(s.hp).toBe(60);
    s = applyDamage(s, 999);
    expect(s.hp).toBe(0);
    expect(isDead(s)).toBe(true);
  });
});
