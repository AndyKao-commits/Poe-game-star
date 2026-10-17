import { describe, expect, it } from 'vitest';
import {
  ENEMY_WINDUP_MS,
  EnemyAttackBrain,
} from '../../src/core/ai/enemyAttack';

describe('enemy attack AI', () => {
  it('uses a 400ms windup before the strike', () => {
    expect(ENEMY_WINDUP_MS).toBe(400);
    const brain = new EnemyAttackBrain();
    const self = { x: 0, y: 0 };
    const target = { x: 0.5, y: 0 };

    const start = brain.update(16, self, target);
    expect(start.phase).toBe('windup');
    expect(start.telegraphing).toBe(true);
    expect(start.dealDamage).toBe(false);

    expect(brain.update(399, self, target).dealDamage).toBe(false);
    // Completing the final windup ms resolves the strike in the same tick
    const strike = brain.update(1, self, target);
    expect(strike.phase).toBe('attack');
    expect(strike.dealDamage).toBe(true);
  });

  it('whiffs when the player leaves melee range before the hit', () => {
    const brain = new EnemyAttackBrain();
    const self = { x: 0, y: 0 };
    brain.update(0, self, { x: 0.5, y: 0 });
    const miss = brain.update(400, self, { x: 3, y: 0 });
    expect(miss.dealDamage).toBe(false);
    expect(miss.missed).toBe(true);
  });

  it('applies per-enemy cooldown after a strike', () => {
    const a = new EnemyAttackBrain();
    const b = new EnemyAttackBrain();
    const self = { x: 0, y: 0 };
    const target = { x: 0.4, y: 0 };

    a.update(0, self, target);
    // Finish windup → strike resolves and starts cooldown
    a.update(400, self, target);
    expect(a.cooldownRemaining).toBeGreaterThan(0);

    // Second enemy is independent
    const other = b.update(0, self, target);
    expect(other.phase).toBe('windup');
    expect(b.cooldownRemaining).toBe(0);
  });

  it('does not leave dead state', () => {
    const brain = new EnemyAttackBrain();
    brain.forceDead();
    const tick = brain.update(100, { x: 0, y: 0 }, { x: 0.2, y: 0 });
    expect(tick.phase).toBe('dead');
    expect(tick.dealDamage).toBe(false);
  });
});
