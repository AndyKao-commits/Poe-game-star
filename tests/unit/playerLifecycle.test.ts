import { describe, expect, it } from 'vitest';
import { createPlayerStats } from '../../src/core/combat/damage';
import { PlayerLifecycle } from '../../src/core/entities/playerLifecycle';
import { AttackTimeline } from '../../src/core/combat/attackTimeline';
import { AttackCooldown } from '../../src/core/combat/attackCone';

describe('player death and respawn', () => {
  it('locks input after death and only emits death once', () => {
    const life = new PlayerLifecycle();
    const stats = createPlayerStats();
    stats.hp = 0;
    expect(life.tryDie(stats)).toBe(true);
    expect(life.tryDie(stats)).toBe(false);
    expect(life.canMove).toBe(false);
    expect(life.canAttack).toBe(false);
    expect(life.consumeDeathEvent()).toBe(true);
    expect(life.consumeDeathEvent()).toBe(false);
  });

  it('does not die while hp remains', () => {
    const life = new PlayerLifecycle();
    expect(life.tryDie(createPlayerStats())).toBe(false);
    expect(life.isDead).toBe(false);
  });

  it('respawns with full vitals at spawn and clears attack state', () => {
    const life = new PlayerLifecycle();
    const stats = createPlayerStats();
    stats.hp = 0;
    life.tryDie(stats);

    const timeline = new AttackTimeline();
    timeline.tryBegin(0.5);
    const cooldown = new AttackCooldown(550);
    cooldown.tryStart();

    const restored = life.respawn({ x: 4.5, y: 4.5 });
    cooldown.reset();
    timeline.reset();

    expect(life.isDead).toBe(false);
    expect(life.canAttack).toBe(true);
    expect(restored.stats.hp).toBe(100);
    expect(restored.stats.mp).toBe(50);
    expect(restored.position).toEqual({ x: 4.5, y: 4.5 });
    expect(cooldown.ready).toBe(true);
    expect(timeline.isActive).toBe(false);
  });
});
