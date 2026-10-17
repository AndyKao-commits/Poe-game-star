import { describe, expect, it } from 'vitest';
import {
  AGGRESSIVE_MELEE,
  CAUTIOUS_SKIRMISHER,
} from '../../src/core/ai/archetypes';
import {
  archetypeForEncounter,
  assertRosterArchetypes,
  CORRUPTED_CRAWLER,
  encounterRoleForSpawnIndex,
  encounterSpecForSpawnIndex,
  RUIN_SENTINEL,
} from '../../src/game/encounters/enemyRoster';

describe('encounter enemy roster', () => {
  it('maps Corrupted Crawler and Ruin Sentinel to distinct archetypes', () => {
    assertRosterArchetypes();
    expect(CORRUPTED_CRAWLER.label).toBe('Corrupted Crawler');
    expect(RUIN_SENTINEL.label).toBe('Ruin Sentinel');
    expect(archetypeForEncounter(CORRUPTED_CRAWLER)).toBe(AGGRESSIVE_MELEE);
    expect(archetypeForEncounter(RUIN_SENTINEL)).toBe(CAUTIOUS_SKIRMISHER);
    expect(CORRUPTED_CRAWLER.telegraphTint).not.toBe(RUIN_SENTINEL.telegraphTint);
  });

  it('alternates roles across spawn indices so both appear in the courtyard', () => {
    const roles = [0, 1, 2, 3, 4].map(encounterRoleForSpawnIndex);
    expect(roles).toEqual([
      'corrupted_crawler',
      'ruin_sentinel',
      'corrupted_crawler',
      'ruin_sentinel',
      'corrupted_crawler',
    ]);
    expect(encounterSpecForSpawnIndex(1).label).toBe('Ruin Sentinel');
  });
});
