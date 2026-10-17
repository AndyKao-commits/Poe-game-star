/**
 * Weighted loot tables with injectable RNG (0..1).
 * Engine-independent — no Phaser.
 */

import { isRarity, type Rarity } from './rarity';

export type Rng = () => number;

export interface LootEntry {
  itemId: string;
  rarity: Rarity;
  /** Relative weight among entries that can drop. Must be a positive finite number. */
  weight: number;
}

export interface LootTable {
  id: string;
  entries: readonly LootEntry[];
  /**
   * Chance in [0, 1] that the roll produces no drop.
   * Defaults to 0 (always drop something when entries exist).
   */
  emptyChance?: number;
}

export interface LootDrop {
  itemId: string;
  rarity: Rarity;
}

function assertRng(rng: Rng): number {
  const value = rng();
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 1) {
    throw new RangeError('rng must return a number in [0, 1]');
  }
  return value;
}

function assertEntry(entry: LootEntry): void {
  if (typeof entry.itemId !== 'string' || entry.itemId.length === 0) {
    throw new RangeError('itemId must be a nonempty string');
  }
  if (!isRarity(entry.rarity)) {
    throw new RangeError(`invalid rarity: ${entry.rarity}`);
  }
  if (!Number.isFinite(entry.weight) || entry.weight <= 0) {
    throw new RangeError('weight must be a positive finite number');
  }
}

function assertTable(table: LootTable): void {
  if (typeof table.id !== 'string' || table.id.length === 0) {
    throw new RangeError('loot table id must be a nonempty string');
  }
  const emptyChance = table.emptyChance ?? 0;
  if (!Number.isFinite(emptyChance) || emptyChance < 0 || emptyChance > 1) {
    throw new RangeError('emptyChance must be in [0, 1]');
  }
  for (const entry of table.entries) {
    assertEntry(entry);
  }
}

/** Total weight of all entries. */
export function lootTableWeight(table: LootTable): number {
  assertTable(table);
  return table.entries.reduce((sum, entry) => sum + entry.weight, 0);
}

/**
 * Rolls one drop from the table.
 * Returns `null` when the empty roll wins or the table has no entries.
 * Deterministic for a given sequence of `rng` outputs.
 */
export function rollLoot(table: LootTable, rng: Rng): LootDrop | null {
  assertTable(table);
  const emptyChance = table.emptyChance ?? 0;
  if (table.entries.length === 0) {
    return null;
  }
  if (emptyChance > 0 && assertRng(rng) < emptyChance) {
    return null;
  }

  const total = lootTableWeight(table);
  const pick = assertRng(rng) * total;
  let cursor = 0;
  for (const entry of table.entries) {
    cursor += entry.weight;
    if (pick < cursor) {
      return { itemId: entry.itemId, rarity: entry.rarity };
    }
  }
  // Floating-point edge: rng() === 1 maps to the last entry.
  const last = table.entries[table.entries.length - 1]!;
  return { itemId: last.itemId, rarity: last.rarity };
}

/** Creates a simple mulberry32 PRNG from a uint32 seed (for tests / offline sims). */
export function createSeededRng(seed: number): Rng {
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError('seed must be a safe integer');
  }
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
