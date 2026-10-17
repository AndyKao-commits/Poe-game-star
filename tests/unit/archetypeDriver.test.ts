import { describe, expect, it } from 'vitest';
import {
  AGGRESSIVE_MELEE,
  CAUTIOUS_SKIRMISHER,
} from '../../src/core/ai/archetypes';
import { stepArchetypeCombat } from '../../src/core/ai/archetypeDriver';
import { EnemyAttackBrain } from '../../src/core/ai/enemyAttack';
import {
  createTileMap,
  isWorldBlocked,
  setTile,
} from '../../src/core/collision/grid';

function openMap(): ReturnType<typeof createTileMap> {
  return createTileMap(16, 16, 'floor');
}

describe('archetype combat driver', () => {
  it('Corrupted Crawler aggressively chases then telegraphs before damage', () => {
    const map = openMap();
    const brain = new EnemyAttackBrain(AGGRESSIVE_MELEE.attack);
    let self = { x: 2, y: 2 };
    const target = { x: 5, y: 2 };

    // Close the gap over several chase ticks
    for (let i = 0; i < 40; i++) {
      const step = stepArchetypeCombat(map, {
        archetype: AGGRESSIVE_MELEE,
        brain,
        self,
        target,
        deltaMs: 50,
        rng: () => 0,
      });
      self = step.position;
      if (step.tick.telegraphing) break;
    }

    expect(brain.state).toBe('windup');
    const duringWindup = stepArchetypeCombat(map, {
      archetype: AGGRESSIVE_MELEE,
      brain,
      self,
      target: { x: self.x + 0.5, y: self.y },
      deltaMs: 16,
      rng: () => 0,
    });
    expect(duringWindup.tick.telegraphing).toBe(true);
    expect(duringWindup.tick.dealDamage).toBe(false);
    expect(duringWindup.position).toEqual(self);

    // Finish windup → strike resolves on the same path that was telegraphing
    const remaining = AGGRESSIVE_MELEE.attack.windupMs;
    const strike = stepArchetypeCombat(map, {
      archetype: AGGRESSIVE_MELEE,
      brain,
      self,
      target: { x: self.x + 0.4, y: self.y },
      deltaMs: remaining,
      rng: () => 0,
    });
    expect(strike.tick.phase).toBe('attack');
    expect(strike.tick.dealDamage).toBe(true);
    expect(strike.tick.telegraphing).toBe(false);
  });

  it('Ruin Sentinel retreats when crowded and keeps a longer windup', () => {
    const map = openMap();
    const brain = new EnemyAttackBrain(CAUTIOUS_SKIRMISHER.attack);
    const self = { x: 4, y: 4 };
    const step = stepArchetypeCombat(map, {
      archetype: CAUTIOUS_SKIRMISHER,
      brain,
      self,
      target: { x: 4.4, y: 4 },
      deltaMs: 100,
      rng: () => 0,
    });
    expect(step.intent.type).toBe('retreat');
    expect(step.position.x).toBeLessThan(self.x);
    expect(step.tick.dealDamage).toBe(false);
    expect(CAUTIOUS_SKIRMISHER.attack.windupMs).toBeGreaterThan(
      AGGRESSIVE_MELEE.attack.windupMs,
    );
  });

  it('does not open attacks while the target is dead', () => {
    const map = openMap();
    const brain = new EnemyAttackBrain(AGGRESSIVE_MELEE.attack);
    const step = stepArchetypeCombat(map, {
      archetype: AGGRESSIVE_MELEE,
      brain,
      self: { x: 0, y: 0 },
      target: { x: 0.5, y: 0 },
      deltaMs: 16,
      rng: () => 0,
      targetAlive: false,
    });
    expect(step.tick.phase).not.toBe('windup');
    expect(step.tick.dealDamage).toBe(false);
  });

  it('dead brain never deals damage on subsequent ticks', () => {
    const map = openMap();
    const brain = new EnemyAttackBrain(AGGRESSIVE_MELEE.attack);
    brain.forceDead();
    const step = stepArchetypeCombat(map, {
      archetype: AGGRESSIVE_MELEE,
      brain,
      self: { x: 0, y: 0 },
      target: { x: 0.2, y: 0 },
      deltaMs: 100,
      rng: () => 0,
    });
    expect(step.tick.phase).toBe('dead');
    expect(step.tick.dealDamage).toBe(false);
    expect(step.tick.telegraphing).toBe(false);
    expect(step.position).toEqual({ x: 0, y: 0 });
  });

  it('chase and retreat never tunnel through walls', () => {
    const map = openMap();
    // Vertical wall between enemy and player
    for (let y = 0; y < 16; y++) setTile(map, 5, y, 'wall');

    const chaseBrain = new EnemyAttackBrain(AGGRESSIVE_MELEE.attack);
    let chasePos = { x: 3, y: 8 };
    for (let i = 0; i < 60; i++) {
      const step = stepArchetypeCombat(map, {
        archetype: AGGRESSIVE_MELEE,
        brain: chaseBrain,
        self: chasePos,
        target: { x: 8, y: 8 },
        deltaMs: 50,
        rng: () => 0,
      });
      chasePos = step.position;
    }
    expect(chasePos.x).toBeLessThan(5);
    expect(isWorldBlocked(map, chasePos)).toBe(false);

    const retreatBrain = new EnemyAttackBrain(CAUTIOUS_SKIRMISHER.attack);
    let retreatPos = { x: 6.5, y: 8 };
    // Player crowds from the right; sentinel retreats left into the wall.
    for (let i = 0; i < 40; i++) {
      const step = stepArchetypeCombat(map, {
        archetype: CAUTIOUS_SKIRMISHER,
        brain: retreatBrain,
        self: retreatPos,
        target: { x: 7.2, y: 8 },
        deltaMs: 50,
        rng: () => 0,
      });
      retreatPos = step.position;
    }
    expect(retreatPos.x).toBeGreaterThan(5);
    expect(isWorldBlocked(map, retreatPos)).toBe(false);
  });

  it('keeps crawler and sentinel combat tempos clearly different', () => {
    expect(AGGRESSIVE_MELEE.chase.speed).toBeGreaterThan(CAUTIOUS_SKIRMISHER.chase.speed);
    expect(AGGRESSIVE_MELEE.attack.cooldownMs).toBeLessThan(
      CAUTIOUS_SKIRMISHER.attack.cooldownMs,
    );
    expect(AGGRESSIVE_MELEE.retreatDistance).toBe(0);
    expect(CAUTIOUS_SKIRMISHER.retreatDistance).toBeGreaterThan(0);
    expect(AGGRESSIVE_MELEE.attackCommitChance).toBe(1);
    expect(CAUTIOUS_SKIRMISHER.attackCommitChance).toBeLessThan(1);

    const map = openMap();
    const crawlerBrain = new EnemyAttackBrain(AGGRESSIVE_MELEE.attack);
    const sentinelBrain = new EnemyAttackBrain(CAUTIOUS_SKIRMISHER.attack);

    const crawler = stepArchetypeCombat(map, {
      archetype: AGGRESSIVE_MELEE,
      brain: crawlerBrain,
      self: { x: 0, y: 0 },
      target: { x: 0.9, y: 0 },
      deltaMs: 16,
      rng: () => 0,
    });
    const sentinelHold = stepArchetypeCombat(map, {
      archetype: CAUTIOUS_SKIRMISHER,
      brain: sentinelBrain,
      self: { x: 0, y: 0 },
      target: { x: 2.5, y: 0 },
      deltaMs: 16,
      rng: () => 0.99,
    });

    expect(crawler.intent.type).toBe('attack');
    expect(crawler.tick.telegraphing).toBe(true);
    expect(sentinelHold.intent.type).toBe('idle');
    expect(sentinelHold.tick.telegraphing).toBe(false);
  });
});
