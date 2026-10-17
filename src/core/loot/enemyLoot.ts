/**
 * Default enemy loot table for Phase 2 runtime.
 * Uses injectable RNG via rollLoot — deterministic under seeded rng.
 */

import type { LootTable } from './lootTable';

/** Weighted drops for ruin scavenger enemies. */
export const ENEMY_LOOT_TABLE: LootTable = {
  id: 'ruin-enemy',
  emptyChance: 0.2,
  entries: [
    { itemId: 'scrap', rarity: 'common', weight: 36 },
    { itemId: 'iron_shard', rarity: 'uncommon', weight: 18 },
    { itemId: 'ashen_blade', rarity: 'common', weight: 12 },
    { itemId: 'ashen_blade', rarity: 'uncommon', weight: 6 },
    { itemId: 'ruin_mail', rarity: 'common', weight: 10 },
    { itemId: 'ruin_mail', rarity: 'uncommon', weight: 5 },
    { itemId: 'ember_charm', rarity: 'uncommon', weight: 8 },
    { itemId: 'rune_dust', rarity: 'rare', weight: 5 },
  ],
};
