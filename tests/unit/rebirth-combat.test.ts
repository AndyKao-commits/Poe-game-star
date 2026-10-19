import { describe, expect, it } from 'vitest';
import {
  calculateRebirthDamage,
  createRebirthEnemyStats,
  createRebirthPlayerStats,
  createRebirthSkillState,
  rebirthBossPhase,
  rebirthMitigationFactor,
  regenerateRebirthMp,
  REBIRTH_SKILLS,
  tryUseRebirthSkill,
} from '../../src/rebirth/core/combat';

describe('Rebirth v0.7.1 isolated combat rules', () => {
  it('uses the approved Rebirth starting stats, not legacy stats', () => {
    expect(createRebirthPlayerStats()).toEqual({
      hp: 120, maxHp: 120, mp: 60, maxMp: 60, attack: 12, defense: 4,
    });
    expect(createRebirthEnemyStats('fireBrawler')).toMatchObject({
      hp: 45, attack: 9, defense: 1,
    });
    expect(createRebirthEnemyStats('bossBiao').maxHp).toBe(420);
  });

  it('uses 100/(100+5DEF) mitigation, including nonnegative defense clamp', () => {
    expect(rebirthMitigationFactor(0)).toBe(1);
    expect(rebirthMitigationFactor(2)).toBeCloseTo(100 / 110);
    expect(rebirthMitigationFactor(-10)).toBe(1);
  });

  it('calculates deterministic basic and magic punch damage', () => {
    expect(calculateRebirthDamage({
      attack: 12, targetDefense: 2, critChance: 0, rng: () => 0.99,
    }).amount).toBe(10);
    expect(calculateRebirthDamage({
      attack: 12, targetDefense: 2,
      skillMultiplier: REBIRTH_SKILLS.magicPunch.damageMultiplier,
      critChance: 0, rng: () => 0.99,
    }).amount).toBe(24);
  });

  it('applies critical multiplier after the base damage is floored', () => {
    expect(calculateRebirthDamage({
      attack: 12, targetDefense: 2, critChance: 0.05, rng: () => 0,
    })).toMatchObject({ amount: 15, isCritical: true });
  });

  it('preserves one minimum damage for valid attack rolls', () => {
    expect(calculateRebirthDamage({
      attack: 1, targetDefense: 9999, critChance: 0, rng: () => 0.99,
    }).amount).toBe(1);
  });

  it('spends MP and sets cooldown for magic punch without mutating input', () => {
    const initial = createRebirthSkillState();
    const first = tryUseRebirthSkill(initial, 'magicPunch', 1000);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.state.mp).toBe(45);
    expect(first.state.readyAtMs.magicPunch).toBe(6000);
    expect(initial.mp).toBe(60);
    const cooldown = tryUseRebirthSkill(first.state, 'magicPunch', 5999);
    expect(cooldown).toMatchObject({ ok: false, reason: 'cooldown', state: first.state });
    const ready = tryUseRebirthSkill(first.state, 'magicPunch', 6000);
    expect(ready).toMatchObject({ ok: true, state: { mp: 30 } });
  });

  it('rejects casts without enough MP and preserves state', () => {
    const initial = createRebirthSkillState(9);
    expect(tryUseRebirthSkill(initial, 'blink', 0)).toEqual({
      ok: false, reason: 'insufficient-mp', state: initial,
    });
    expect(tryUseRebirthSkill(initial, 'magicPunch', -1)).toEqual({
      ok: false, reason: 'invalid-time', state: initial,
    });
  });

  it('regenerates MP only after the casting delay and caps at maximum', () => {
    expect(regenerateRebirthMp(20, 60, 1000, 1999)).toBe(20);
    expect(regenerateRebirthMp(20, 60, 1000, 2000)).toBe(24);
    expect(regenerateRebirthMp(59, 60, 1000, 4000)).toBe(60);
  });

  it('switches boss phase at 60% health', () => {
    expect(rebirthBossPhase(253)).toBe(1);
    expect(rebirthBossPhase(252)).toBe(2);
    expect(rebirthBossPhase(0)).toBe(2);
  });
});
