/** Brief grace after full encounter reset so no leftover strike lands instantly. */
export const RESPAWN_GRACE_MS = 400;

export interface EncounterResetRequest {
  enemySpawnCount: number;
  isPlayerDead: boolean;
}

export interface EncounterResetPlan {
  allowed: boolean;
  destroyAllEnemies: boolean;
  respawnEnemyCount: number;
  clearTweens: boolean;
  clearTimers: boolean;
  graceMs: number;
}

/**
 * Pure planner for death → restart. Controllers execute the side effects.
 * Full reset: wipe every enemy and rebuild from map spawns.
 */
export function planEncounterReset(request: EncounterResetRequest): EncounterResetPlan {
  if (!request.isPlayerDead) {
    return {
      allowed: false,
      destroyAllEnemies: false,
      respawnEnemyCount: 0,
      clearTweens: false,
      clearTimers: false,
      graceMs: 0,
    };
  }

  return {
    allowed: true,
    destroyAllEnemies: true,
    respawnEnemyCount: request.enemySpawnCount,
    clearTweens: true,
    clearTimers: true,
    graceMs: RESPAWN_GRACE_MS,
  };
}

export function tickSpawnGrace(remainingMs: number, deltaMs: number): number {
  if (remainingMs <= 0) return 0;
  return Math.max(0, remainingMs - Math.max(0, deltaMs));
}

export function canReceiveEncounterDamage(graceRemainingMs: number): boolean {
  return graceRemainingMs <= 0;
}
