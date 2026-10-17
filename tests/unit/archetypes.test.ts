import { describe, expect, it } from 'vitest';
import {
  AGGRESSIVE_MELEE,
  CAUTIOUS_SKIRMISHER,
  decideEnemyIntent,
  ENEMY_ARCHETYPES,
  getArchetype,
} from '../../src/core/ai/archetypes';
import { DEFAULT_CHASE } from '../../src/core/ai/chase';
import { DEFAULT_ENEMY_ATTACK } from '../../src/core/ai/enemyAttack';

describe('enemy archetypes', () => {
  it('registers at least two distinct behavior configs', () => {
    expect(Object.keys(ENEMY_ARCHETYPES).length).toBeGreaterThanOrEqual(2);
    expect(getArchetype('aggressive_melee')).toBe(AGGRESSIVE_MELEE);
    expect(getArchetype('cautious_skirmisher')).toBe(CAUTIOUS_SKIRMISHER);

    expect(AGGRESSIVE_MELEE.chase.speed).toBeGreaterThan(CAUTIOUS_SKIRMISHER.chase.speed);
    expect(AGGRESSIVE_MELEE.retreatDistance).toBe(0);
    expect(CAUTIOUS_SKIRMISHER.retreatDistance).toBeGreaterThan(0);
    expect(AGGRESSIVE_MELEE.attackCommitChance).toBe(1);
    expect(CAUTIOUS_SKIRMISHER.attackCommitChance).toBeLessThan(1);

    // Compose Phase 1 defaults without replacing them
    expect(DEFAULT_CHASE.aggroRange).toBe(7);
    expect(DEFAULT_ENEMY_ATTACK.windupMs).toBe(400);
  });

  it('aggressive melee chases when in aggro and outside engage', () => {
    const intent = decideEnemyIntent(AGGRESSIVE_MELEE, {
      self: { x: 0, y: 0 },
      target: { x: 4, y: 0 },
      attackCooldownMs: 0,
      canMove: true,
      inAttackSequence: false,
      rng: () => 0,
    });
    expect(intent.type).toBe('chase');
    expect(intent.velocity.x).toBeGreaterThan(0);
    expect(intent.wantsAttack).toBe(false);
  });

  it('aggressive melee commits attack when in engage range and ready', () => {
    const intent = decideEnemyIntent(AGGRESSIVE_MELEE, {
      self: { x: 0, y: 0 },
      target: { x: 0.8, y: 0 },
      attackCooldownMs: 0,
      canMove: true,
      inAttackSequence: false,
      rng: () => 0,
    });
    expect(intent.type).toBe('attack');
    expect(intent.wantsAttack).toBe(true);
    expect(intent.velocity).toEqual({ x: 0, y: 0 });
  });

  it('aggressive melee idles out of aggro', () => {
    const intent = decideEnemyIntent(AGGRESSIVE_MELEE, {
      self: { x: 0, y: 0 },
      target: { x: 20, y: 0 },
      attackCooldownMs: 0,
      canMove: true,
      inAttackSequence: false,
    });
    expect(intent.type).toBe('idle');
    expect(intent.velocity).toEqual({ x: 0, y: 0 });
  });

  it('aggressive melee does not attack while on cooldown; may chase or idle', () => {
    const intent = decideEnemyIntent(AGGRESSIVE_MELEE, {
      self: { x: 0, y: 0 },
      target: { x: 0.8, y: 0 },
      attackCooldownMs: 500,
      canMove: true,
      inAttackSequence: false,
    });
    expect(intent.wantsAttack).toBe(false);
    expect(intent.type).not.toBe('attack');
  });

  it('locks locomotion while in attack sequence or cannot move', () => {
    const locked = decideEnemyIntent(AGGRESSIVE_MELEE, {
      self: { x: 0, y: 0 },
      target: { x: 0.5, y: 0 },
      attackCooldownMs: 0,
      canMove: false,
      inAttackSequence: true,
    });
    expect(locked.type).toBe('idle');
    expect(locked.wantsAttack).toBe(false);
  });

  it('cautious skirmisher retreats when the target is too close', () => {
    const intent = decideEnemyIntent(CAUTIOUS_SKIRMISHER, {
      self: { x: 0, y: 0 },
      target: { x: 0.5, y: 0 },
      attackCooldownMs: 0,
      canMove: true,
      inAttackSequence: false,
      rng: () => 0,
    });
    expect(intent.type).toBe('retreat');
    expect(intent.velocity.x).toBeLessThan(0);
    expect(intent.wantsAttack).toBe(false);
  });

  it('cautious skirmisher attack commit is deterministic with injected rng', () => {
    const ctx = {
      self: { x: 0, y: 0 },
      target: { x: 2.5, y: 0 },
      attackCooldownMs: 0,
      canMove: true,
      inAttackSequence: false,
    };

    const commit = decideEnemyIntent(CAUTIOUS_SKIRMISHER, {
      ...ctx,
      rng: () => 0, // always below attackCommitChance
    });
    expect(commit.type).toBe('attack');
    expect(commit.wantsAttack).toBe(true);

    const hold = decideEnemyIntent(CAUTIOUS_SKIRMISHER, {
      ...ctx,
      rng: () => 0.99, // above attackCommitChance
    });
    expect(hold.type).toBe('idle');
    expect(hold.wantsAttack).toBe(false);
  });

  it('cautious skirmisher chases toward preferred band from far aggro', () => {
    const intent = decideEnemyIntent(CAUTIOUS_SKIRMISHER, {
      self: { x: 0, y: 0 },
      target: { x: 6, y: 0 },
      attackCooldownMs: 0,
      canMove: true,
      inAttackSequence: false,
      rng: () => 0,
    });
    expect(intent.type).toBe('chase');
    expect(intent.velocity.x).toBeGreaterThan(0);
  });
});
