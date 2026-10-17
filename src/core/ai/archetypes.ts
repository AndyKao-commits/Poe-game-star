/**
 * Enemy archetype behavior configurations.
 * Composes chase + attack decision into pure intents for GameScene later.
 * Does not modify Phase 1 chase / EnemyAttackBrain contracts.
 */

import { chaseVelocity, type ChaseConfig } from './chase';
import {
  DEFAULT_ENEMY_ATTACK,
  type EnemyAttackConfig,
} from './enemyAttack';
import { distance, type Vec2 } from '../iso/coordinates';

export type EnemyArchetypeId = 'aggressive_melee' | 'cautious_skirmisher';

export type EnemyIntentType = 'chase' | 'attack' | 'idle' | 'retreat';

export interface EnemyIntent {
  type: EnemyIntentType;
  /** Locomotion velocity when type is chase or retreat; otherwise zero. */
  velocity: { x: number; y: number };
  /** True when the archetype wants to begin / continue an attack windup. */
  wantsAttack: boolean;
}

export interface EnemyArchetypeConfig {
  id: EnemyArchetypeId;
  /** Label for debug / tooling. */
  name: string;
  chase: ChaseConfig;
  attack: EnemyAttackConfig;
  /**
   * Distance at or below which the archetype prefers to open an attack
   * (may be wider than meleeRange for telegraphed engages).
   */
  preferredEngageDistance: number;
  /**
   * Cautious archetypes back away when the target is closer than this.
   * Aggressive melee leaves this at 0 (never retreat).
   */
  retreatDistance: number;
  /**
   * When in engage band, probability [0,1] of choosing attack vs hold/chase.
   * Inject rng for deterministic tests.
   */
  attackCommitChance: number;
}

/** Close-range bruiser: high aggro, tight stop, eager melee commits. */
export const AGGRESSIVE_MELEE: EnemyArchetypeConfig = {
  id: 'aggressive_melee',
  name: 'Aggressive Melee',
  chase: {
    aggroRange: 8,
    stopRange: 0.75,
    speed: 2.0,
  },
  attack: {
    ...DEFAULT_ENEMY_ATTACK,
    windupMs: 320,
    cooldownMs: 700,
    meleeRange: 0.9,
    engageRange: 1.15,
  },
  preferredEngageDistance: 1.15,
  retreatDistance: 0,
  attackCommitChance: 1,
};

/** Skirmisher: keeps distance, slower commit, retreats when crowded. */
export const CAUTIOUS_SKIRMISHER: EnemyArchetypeConfig = {
  id: 'cautious_skirmisher',
  name: 'Cautious Skirmisher',
  chase: {
    aggroRange: 10,
    stopRange: 2.4,
    speed: 1.4,
  },
  attack: {
    ...DEFAULT_ENEMY_ATTACK,
    windupMs: 480,
    strikeMs: 100,
    recoveryMs: 360,
    cooldownMs: 1200,
    meleeRange: 2.6,
    engageRange: 3.0,
  },
  preferredEngageDistance: 3.0,
  retreatDistance: 1.5,
  attackCommitChance: 0.55,
};

export const ENEMY_ARCHETYPES: Readonly<
  Record<EnemyArchetypeId, EnemyArchetypeConfig>
> = {
  aggressive_melee: AGGRESSIVE_MELEE,
  cautious_skirmisher: CAUTIOUS_SKIRMISHER,
};

export function getArchetype(id: EnemyArchetypeId): EnemyArchetypeConfig {
  return ENEMY_ARCHETYPES[id];
}

export interface EnemyDecisionContext {
  self: Vec2;
  target: Vec2;
  /** Remaining attack cooldown ms (0 = ready). */
  attackCooldownMs: number;
  /** When true, locomotion is locked (windup / strike / recovery / hurt / dead). */
  canMove: boolean;
  /** When true, already in an attack sequence — stay idle locomotion. */
  inAttackSequence: boolean;
  /** Optional injectable RNG for commit chance; defaults to Math.random. */
  rng?: () => number;
}

function zeroVelocity(): { x: number; y: number } {
  return { x: 0, y: 0 };
}

function retreatVelocity(
  self: Vec2,
  target: Vec2,
  speed: number,
): { x: number; y: number } {
  const dx = self.x - target.x;
  const dy = self.y - target.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: (dx / len) * speed,
    y: (dy / len) * speed,
  };
}

/**
 * Pure archetype brain: returns a locomotion/combat intent for one tick.
 * Callers feed Phaser / EnemyAttackBrain separately — this only decides.
 */
export function decideEnemyIntent(
  config: EnemyArchetypeConfig,
  ctx: EnemyDecisionContext,
): EnemyIntent {
  if (ctx.inAttackSequence || !ctx.canMove) {
    return { type: 'idle', velocity: zeroVelocity(), wantsAttack: false };
  }

  const dist = distance(ctx.self, ctx.target);
  const rng = ctx.rng ?? Math.random;

  // Out of aggro — idle.
  if (dist > config.chase.aggroRange) {
    return { type: 'idle', velocity: zeroVelocity(), wantsAttack: false };
  }

  // Too close for cautious types — create space.
  if (config.retreatDistance > 0 && dist < config.retreatDistance) {
    return {
      type: 'retreat',
      velocity: retreatVelocity(ctx.self, ctx.target, config.chase.speed),
      wantsAttack: false,
    };
  }

  const attackReady = ctx.attackCooldownMs <= 0;
  const inEngageBand = dist <= config.preferredEngageDistance;

  if (attackReady && inEngageBand) {
    const commit = rng() < config.attackCommitChance;
    if (commit) {
      return {
        type: 'attack',
        velocity: zeroVelocity(),
        wantsAttack: true,
      };
    }
    // Hold position in band when not committing (skirmisher dither).
    return { type: 'idle', velocity: zeroVelocity(), wantsAttack: false };
  }

  // Chase toward preferred band / stop range via existing chase helper.
  const chase = chaseVelocity(ctx.self, ctx.target, config.chase);
  if (chase.chasing) {
    return {
      type: 'chase',
      velocity: { x: chase.x, y: chase.y },
      wantsAttack: false,
    };
  }

  // Inside stop range but not attacking (cooldown or outside engage) — idle.
  return { type: 'idle', velocity: zeroVelocity(), wantsAttack: false };
}
