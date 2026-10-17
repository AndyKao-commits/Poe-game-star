/** Ordered rarity tiers for loot / inventory (lowest → highest). */
export const RARITY_TIERS = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
] as const;

export type Rarity = (typeof RARITY_TIERS)[number];

const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export function isRarity(value: string): value is Rarity {
  return (RARITY_TIERS as readonly string[]).includes(value);
}

export function compareRarity(a: Rarity, b: Rarity): number {
  return RARITY_RANK[a] - RARITY_RANK[b];
}
