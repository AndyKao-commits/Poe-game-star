import { describe, expect, it } from 'vitest';
import { calculateDamage } from '../../src/core/combat/damage';
import {
  createCasterState,
  getSkillDefinition,
  isInvulnerable,
  restoreResources,
  setDead,
  setDisabled,
  SKILL_DEFINITIONS,
  tickCooldowns,
  tryCast,
  validateCast,
} from '../../src/core/skills';

describe('skill definitions', () => {
  it('defines Q, E, and dodge with cooldown / resource policy', () => {
    expect(SKILL_DEFINITIONS.q.kind).toBe('attack');
    expect(SKILL_DEFINITIONS.q.manaCost).toBeGreaterThan(0);
    expect(SKILL_DEFINITIONS.q.skillMultiplier).toBeGreaterThan(1);

    expect(SKILL_DEFINITIONS.e.kind).toBe('attack');
    expect(SKILL_DEFINITIONS.e.manaCost).toBeGreaterThan(SKILL_DEFINITIONS.q.manaCost);
    expect(SKILL_DEFINITIONS.e.skillMultiplier).toBeGreaterThan(SKILL_DEFINITIONS.q.skillMultiplier);

    expect(SKILL_DEFINITIONS.dodge.kind).toBe('mobility');
    expect(SKILL_DEFINITIONS.dodge.staminaCost).toBeGreaterThan(0);
    expect(SKILL_DEFINITIONS.dodge.manaCost).toBe(0);
    expect(SKILL_DEFINITIONS.dodge.iframeMs).toBeGreaterThan(0);
    expect(SKILL_DEFINITIONS.dodge.skillMultiplier).toBe(0);
  });

  it('exposes definitions via getSkillDefinition', () => {
    expect(getSkillDefinition('q').id).toBe('q');
    expect(getSkillDefinition('dodge').iframeMs).toBe(280);
  });
});

describe('tryCast / validation', () => {
  it('casts Q, deducts mana, starts cooldown, and reuses damage formula', () => {
    const state = createCasterState({ maxMana: 50, mana: 50 });
    const result = tryCast(state, 'q', {
      baseAttack: 12,
      defense: 5,
      critChance: 0,
      rng: () => 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.resources.mana).toBe(50 - SKILL_DEFINITIONS.q.manaCost);
    expect(result.state.cooldowns.q).toBe(SKILL_DEFINITIONS.q.cooldownMs);
    expect(result.damage).not.toBeNull();

    const expected = calculateDamage({
      baseAttack: 12,
      defense: 5,
      skillMultiplier: SKILL_DEFINITIONS.q.skillMultiplier,
      critChance: 0,
      rng: () => 1,
    });
    expect(result.damage).toEqual(expected);
    // Original state is not mutated
    expect(state.resources.mana).toBe(50);
    expect(state.cooldowns.q).toBe(0);
  });

  it('casts E with higher multiplier damage', () => {
    const state = createCasterState();
    const result = tryCast(state, 'e', {
      baseAttack: 10,
      defense: 0,
      critChance: 0,
      rng: () => 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.damage?.rawDamage).toBe(10 * SKILL_DEFINITIONS.e.skillMultiplier);
    expect(result.damage?.amount).toBe(Math.floor(10 * SKILL_DEFINITIONS.e.skillMultiplier));
  });

  it('casts dodge on stamina, grants i-frame window as pure data', () => {
    const state = createCasterState({ maxStamina: 100, stamina: 100 });
    const result = tryCast(state, 'dodge');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.resources.stamina).toBe(100 - SKILL_DEFINITIONS.dodge.staminaCost);
    expect(result.state.resources.mana).toBe(state.resources.mana);
    expect(result.iframeGrantedMs).toBe(SKILL_DEFINITIONS.dodge.iframeMs);
    expect(result.state.iframeRemainingMs).toBe(SKILL_DEFINITIONS.dodge.iframeMs);
    expect(result.damage).toBeNull();
    expect(isInvulnerable(result.state)).toBe(true);
  });

  it('rejects dead casters', () => {
    const state = setDead(createCasterState(), true);
    const result = tryCast(state, 'q', { baseAttack: 12, defense: 0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('dead');
  });

  it('rejects disabled casters', () => {
    const state = setDisabled(createCasterState(), true);
    const result = tryCast(state, 'e');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('disabled');
  });

  it('rejects casts while on cooldown', () => {
    let state = createCasterState();
    const first = tryCast(state, 'q', { baseAttack: 12, defense: 0, critChance: 0, rng: () => 1 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = first.state;

    const second = tryCast(state, 'q', { baseAttack: 12, defense: 0 });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe('on_cooldown');
  });

  it('rejects insufficient mana and stamina', () => {
    const lowMana = createCasterState({ mana: 0, maxMana: 50 });
    const manaFail = tryCast(lowMana, 'q');
    expect(manaFail.ok).toBe(false);
    if (!manaFail.ok) expect(manaFail.reason).toBe('insufficient_mana');

    const lowStamina = createCasterState({ stamina: 0, maxStamina: 100 });
    const stamFail = tryCast(lowStamina, 'dodge');
    expect(stamFail.ok).toBe(false);
    if (!stamFail.ok) expect(stamFail.reason).toBe('insufficient_stamina');
  });

  it('rejects unknown skill ids', () => {
    const result = tryCast(createCasterState(), 'r');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unknown_skill');
  });

  it('validateCast mirrors tryCast gating without mutating', () => {
    const state = createCasterState({ mana: 0 });
    const check = validateCast(state, 'q');
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe('insufficient_mana');
    expect(state.resources.mana).toBe(0);
  });
});

describe('tickCooldowns', () => {
  it('decrements cooldowns and i-frames over time', () => {
    let state = createCasterState();
    const cast = tryCast(state, 'dodge');
    expect(cast.ok).toBe(true);
    if (!cast.ok) return;
    state = cast.state;

    state = tickCooldowns(state, 100);
    expect(state.cooldowns.dodge).toBe(SKILL_DEFINITIONS.dodge.cooldownMs - 100);
    expect(state.iframeRemainingMs).toBe(SKILL_DEFINITIONS.dodge.iframeMs - 100);

    state = tickCooldowns(state, 10_000);
    expect(state.cooldowns.dodge).toBe(0);
    expect(state.iframeRemainingMs).toBe(0);
    expect(isInvulnerable(state)).toBe(false);
  });

  it('allows recast after cooldown fully ticks down', () => {
    let state = createCasterState({ mana: 100, maxMana: 100 });
    const first = tryCast(state, 'q', { baseAttack: 12, defense: 0, critChance: 0, rng: () => 1 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    state = tickCooldowns(first.state, SKILL_DEFINITIONS.q.cooldownMs);
    const second = tryCast(state, 'q', { baseAttack: 12, defense: 0, critChance: 0, rng: () => 1 });
    expect(second.ok).toBe(true);
  });
});

describe('resource helpers', () => {
  it('restores mana and stamina clamped to max', () => {
    let state = createCasterState({ mana: 10, stamina: 20 });
    state = restoreResources(state, { mana: 1000, stamina: 5 });
    expect(state.resources.mana).toBe(state.resources.maxMana);
    expect(state.resources.stamina).toBe(25);
  });
});
