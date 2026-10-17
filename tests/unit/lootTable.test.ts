import { describe, expect, it } from 'vitest';
import {
  createSeededRng,
  lootTableWeight,
  rollLoot,
  type LootTable,
} from '../../src/core/loot/lootTable';
import { compareRarity, RARITY_TIERS } from '../../src/core/loot/rarity';

const trashTable: LootTable = {
  id: 'trash-chest',
  entries: [
    { itemId: 'scrap', rarity: 'common', weight: 70 },
    { itemId: 'iron_shard', rarity: 'uncommon', weight: 25 },
    { itemId: 'rune_dust', rarity: 'rare', weight: 5 },
  ],
};

describe('loot rarity tiers', () => {
  it('orders rarities from common to legendary', () => {
    expect(RARITY_TIERS).toEqual([
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
    ]);
    expect(compareRarity('common', 'legendary')).toBeLessThan(0);
    expect(compareRarity('epic', 'rare')).toBeGreaterThan(0);
  });
});

describe('loot tables', () => {
  it('produces deterministic drops for a fixed rng sequence', () => {
    const values = [0.0, 0.69, 0.7, 0.949, 0.95, 0.999];
    let i = 0;
    const rng = () => values[i++]!;

    expect(rollLoot(trashTable, rng)).toEqual({
      itemId: 'scrap',
      rarity: 'common',
    });
    expect(rollLoot(trashTable, rng)).toEqual({
      itemId: 'scrap',
      rarity: 'common',
    });
    expect(rollLoot(trashTable, rng)).toEqual({
      itemId: 'iron_shard',
      rarity: 'uncommon',
    });
    expect(rollLoot(trashTable, rng)).toEqual({
      itemId: 'iron_shard',
      rarity: 'uncommon',
    });
    expect(rollLoot(trashTable, rng)).toEqual({
      itemId: 'rune_dust',
      rarity: 'rare',
    });
    expect(rollLoot(trashTable, rng)).toEqual({
      itemId: 'rune_dust',
      rarity: 'rare',
    });
  });

  it('is reproducible with a seeded rng', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    const dropsA = Array.from({ length: 20 }, () => rollLoot(trashTable, a));
    const dropsB = Array.from({ length: 20 }, () => rollLoot(trashTable, b));
    expect(dropsA).toEqual(dropsB);
    expect(dropsA.some((d) => d?.itemId === 'scrap')).toBe(true);
  });

  it('honors emptyChance before weighted selection', () => {
    const table: LootTable = {
      id: 'maybe-empty',
      emptyChance: 0.5,
      entries: [{ itemId: 'orb', rarity: 'epic', weight: 1 }],
    };
    expect(rollLoot(table, () => 0.49)).toBeNull();
    expect(rollLoot(table, () => 0.5)).toEqual({
      itemId: 'orb',
      rarity: 'epic',
    });
  });

  it('returns null for empty tables and validates inputs', () => {
    expect(rollLoot({ id: 'empty', entries: [] }, () => 0.5)).toBeNull();
    expect(lootTableWeight(trashTable)).toBe(100);
    expect(() =>
      rollLoot(
        {
          id: 'bad',
          entries: [{ itemId: 'x', rarity: 'common', weight: 0 }],
        },
        () => 0,
      ),
    ).toThrow(RangeError);
    expect(() => rollLoot(trashTable, () => 1.1)).toThrow(RangeError);
  });
});
