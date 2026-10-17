/**
 * Item definitions bridging loot/inventory stacks and equipment instances.
 * Pure / engine-independent.
 */

import type { EquipmentSlot, StatBonuses } from '../equipment/equipment';
import { isRarity, type Rarity } from '../loot/rarity';

export type ItemKind = 'material' | 'equipment';

export interface ItemDefinition {
  itemId: string;
  displayName: string;
  kind: ItemKind;
  /** Present when kind === 'equipment'. */
  slot?: EquipmentSlot;
  /** Bonuses keyed by rarity; missing rarity means not craftable/droppable at that tier. */
  bonusesByRarity?: Readonly<Partial<Record<Rarity, Readonly<StatBonuses>>>>;
}

const DEFINITIONS: Record<string, ItemDefinition> = {
  scrap: {
    itemId: 'scrap',
    displayName: '廢鐵碎片',
    kind: 'material',
  },
  iron_shard: {
    itemId: 'iron_shard',
    displayName: '鐵屑',
    kind: 'material',
  },
  rune_dust: {
    itemId: 'rune_dust',
    displayName: '符文粉塵',
    kind: 'material',
  },
  ashen_blade: {
    itemId: 'ashen_blade',
    displayName: '灰燼之刃',
    kind: 'equipment',
    slot: 'weapon',
    bonusesByRarity: {
      common: { attack: 3 },
      uncommon: { attack: 5 },
      rare: { attack: 8 },
      epic: { attack: 12 },
      legendary: { attack: 18 },
    },
  },
  ruin_mail: {
    itemId: 'ruin_mail',
    displayName: '遺跡鎧甲',
    kind: 'equipment',
    slot: 'armor',
    bonusesByRarity: {
      common: { maxHp: 15, defense: 2 },
      uncommon: { maxHp: 25, defense: 3 },
      rare: { maxHp: 40, defense: 5 },
      epic: { maxHp: 55, defense: 7 },
      legendary: { maxHp: 80, defense: 10 },
    },
  },
  ember_charm: {
    itemId: 'ember_charm',
    displayName: '餘燼護符',
    kind: 'equipment',
    slot: 'accessory',
    bonusesByRarity: {
      common: { maxMp: 5, attack: 1 },
      uncommon: { maxMp: 10, attack: 2 },
      rare: { maxMp: 15, attack: 3 },
      epic: { maxMp: 20, attack: 4 },
      legendary: { maxMp: 30, attack: 6 },
    },
  },
};

export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return DEFINITIONS[itemId];
}

export function requireItemDefinition(itemId: string): ItemDefinition {
  const def = DEFINITIONS[itemId];
  if (!def) {
    throw new RangeError(`Unknown itemId: ${itemId}`);
  }
  return def;
}

export function listItemDefinitions(): readonly ItemDefinition[] {
  return Object.values(DEFINITIONS);
}

export function isEquippable(itemId: string, rarity: Rarity): boolean {
  if (!isRarity(rarity)) return false;
  const def = DEFINITIONS[itemId];
  if (!def || def.kind !== 'equipment' || !def.slot) return false;
  return def.bonusesByRarity?.[rarity] !== undefined;
}

export function equipmentBonusesFor(
  itemId: string,
  rarity: Rarity,
): Readonly<StatBonuses> | null {
  if (!isEquippable(itemId, rarity)) return null;
  return DEFINITIONS[itemId]!.bonusesByRarity![rarity]!;
}
