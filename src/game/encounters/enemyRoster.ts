/**
 * Encounter roster for Phase 2 live AI.
 * Maps spawn slots to named monsters backed by core archetype configs.
 * Kept out of GameScene so integration / UI tracks can stay coordinated.
 */

import {
  AGGRESSIVE_MELEE,
  CAUTIOUS_SKIRMISHER,
  getArchetype,
  type EnemyArchetypeConfig,
  type EnemyArchetypeId,
} from '@core/ai/archetypes';

export type EncounterEnemyRole = 'corrupted_crawler' | 'ruin_sentinel';

export interface EncounterEnemySpec {
  role: EncounterEnemyRole;
  /** Player-facing / debug label. */
  label: string;
  archetypeId: EnemyArchetypeId;
  /** Low-cost telegraph tint synced to windup (no particle FX). */
  telegraphTint: number;
}

export const CORRUPTED_CRAWLER: EncounterEnemySpec = {
  role: 'corrupted_crawler',
  label: 'Corrupted Crawler',
  archetypeId: 'aggressive_melee',
  telegraphTint: 0xffcc44,
};

export const RUIN_SENTINEL: EncounterEnemySpec = {
  role: 'ruin_sentinel',
  label: 'Ruin Sentinel',
  archetypeId: 'cautious_skirmisher',
  telegraphTint: 0xff9966,
};

export const ENCOUNTER_ENEMY_SPECS: Readonly<
  Record<EncounterEnemyRole, EncounterEnemySpec>
> = {
  corrupted_crawler: CORRUPTED_CRAWLER,
  ruin_sentinel: RUIN_SENTINEL,
};

/**
 * Alternate crawlers and sentinels across courtyard spawns so both
 * behaviors appear in the default encounter.
 */
export function encounterRoleForSpawnIndex(index: number): EncounterEnemyRole {
  return index % 2 === 0 ? 'corrupted_crawler' : 'ruin_sentinel';
}

export function encounterSpecForSpawnIndex(index: number): EncounterEnemySpec {
  return ENCOUNTER_ENEMY_SPECS[encounterRoleForSpawnIndex(index)];
}

export function archetypeForEncounter(
  spec: EncounterEnemySpec,
): EnemyArchetypeConfig {
  return getArchetype(spec.archetypeId);
}

/** Sanity: roster roles map to the two shipped archetype configs. */
export function assertRosterArchetypes(): void {
  if (CORRUPTED_CRAWLER.archetypeId !== AGGRESSIVE_MELEE.id) {
    throw new Error('Corrupted Crawler must use aggressive_melee');
  }
  if (RUIN_SENTINEL.archetypeId !== CAUTIOUS_SKIRMISHER.id) {
    throw new Error('Ruin Sentinel must use cautious_skirmisher');
  }
}
