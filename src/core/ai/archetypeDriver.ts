/**
 * Pure composition helpers: archetype intent + attack brain + collision move.
 * Used by EnemyController and regression tests without Phaser.
 */

import { moveWithCollision, type TileMapData } from '../collision/grid';
import type { Vec2 } from '../iso/coordinates';
import {
  decideEnemyIntent,
  type EnemyArchetypeConfig,
  type EnemyIntent,
} from './archetypes';
import {
  EnemyAttackBrain,
  type EnemyAttackTickResult,
} from './enemyAttack';

export interface ArchetypeCombatStepInput {
  archetype: EnemyArchetypeConfig;
  brain: EnemyAttackBrain;
  self: Vec2;
  target: Vec2;
  deltaMs: number;
  /** Injectable RNG for skirmisher commit chance. */
  rng?: () => number;
  /**
   * When false, skip opening new attacks (e.g. target dead).
   * Ongoing windup/strike still resolves so telegraph stays honest.
   */
  targetAlive?: boolean;
}

export interface ArchetypeCombatStepResult {
  intent: EnemyIntent;
  tick: EnemyAttackTickResult;
  /** Position after collision-safe chase/retreat (same as self when locked). */
  position: Vec2;
}

/**
 * One AI tick: decide intent → feed allowAttack into brain → apply locomotion.
 * Attack telegraphs (`tick.telegraphing`) only fire while the brain is in windup,
 * which is the same path that later emits `dealDamage`.
 */
export function stepArchetypeCombat(
  map: TileMapData,
  input: ArchetypeCombatStepInput,
): ArchetypeCombatStepResult {
  const targetAlive = input.targetAlive !== false;
  const locked =
    input.brain.inAttackSequence ||
    input.brain.state === 'hurt' ||
    input.brain.isDead;

  const intent = decideEnemyIntent(input.archetype, {
    self: input.self,
    target: input.target,
    attackCooldownMs: input.brain.cooldownRemaining,
    canMove: !locked,
    inAttackSequence: input.brain.inAttackSequence,
    rng: input.rng,
  });

  const allowAttack = targetAlive && intent.wantsAttack ? true : false;

  const tick = input.brain.update(input.deltaMs, input.self, input.target, {
    allowAttack,
  });

  let position = input.self;
  if (tick.canMove && targetAlive && (intent.velocity.x !== 0 || intent.velocity.y !== 0)) {
    const dt = input.deltaMs / 1000;
    position = moveWithCollision(map, input.self, {
      x: intent.velocity.x * dt,
      y: intent.velocity.y * dt,
    });
  }

  return { intent, tick, position };
}
