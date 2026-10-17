import { describe, expect, it } from 'vitest';
import {
  canReceiveEncounterDamage,
  planEncounterReset,
  RESPAWN_GRACE_MS,
  tickSpawnGrace,
} from '../../src/core/encounter/reset';

describe('encounter full reset planner', () => {
  it('rejects restart while the player is alive', () => {
    const plan = planEncounterReset({ enemySpawnCount: 5, isPlayerDead: false });
    expect(plan.allowed).toBe(false);
    expect(plan.respawnEnemyCount).toBe(0);
  });

  it('plans a full wipe and rebuild from map spawns', () => {
    const plan = planEncounterReset({ enemySpawnCount: 5, isPlayerDead: true });
    expect(plan.allowed).toBe(true);
    expect(plan.destroyAllEnemies).toBe(true);
    expect(plan.respawnEnemyCount).toBe(5);
    expect(plan.clearTweens).toBe(true);
    expect(plan.clearTimers).toBe(true);
    expect(plan.graceMs).toBe(RESPAWN_GRACE_MS);
  });

  it('supports repeated death → reset cycles with identical plans', () => {
    for (let i = 0; i < 3; i++) {
      const plan = planEncounterReset({ enemySpawnCount: 5, isPlayerDead: true });
      expect(plan.respawnEnemyCount).toBe(5);
      expect(plan.destroyAllEnemies).toBe(true);
    }
  });

  it('blocks encounter damage during spawn grace', () => {
    expect(canReceiveEncounterDamage(RESPAWN_GRACE_MS)).toBe(false);
    expect(tickSpawnGrace(RESPAWN_GRACE_MS, 100)).toBe(300);
    expect(canReceiveEncounterDamage(0)).toBe(true);
  });
});
