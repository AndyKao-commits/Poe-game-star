/**
 * Runtime loadout: bounded inventory + equipment slots.
 * Pure / immutable transitions — no Phaser.
 *
 * Guarantees:
 * - Equipment bonuses are always derived from naked base (no stacking).
 * - Each equipment instance id is unique across slots.
 * - Unequip restores the prior bag identity (itemId + rarity).
 * - Loot grants respect inventory capacity.
 */

import { createPlayerStats, type CombatStats } from '../combat/damage';
import {
  deriveCombatStats,
  equipItem,
  unequipItem,
  type EquipmentItem,
  type EquipmentSlot,
  type EquipmentState,
} from '../equipment/equipment';
import {
  addItem,
  createInventory,
  removeItem,
  type Inventory,
  type InventoryItem,
} from '../inventory/inventory';
import {
  equipmentBonusesFor,
  isEquippable,
  requireItemDefinition,
} from '../items/catalog';
import type { LootDrop } from '../loot/lootTable';
import { isRarity, type Rarity } from '../loot/rarity';

export const DEFAULT_INVENTORY_CAPACITY = 16;

export interface EquippedMeta {
  itemId: string;
  rarity: Rarity;
}

export interface GearKit {
  readonly inventory: Inventory;
  readonly equipment: EquipmentState;
  /** Maps equipment instance id → bag identity for safe unequip restore. */
  readonly equippedMeta: Readonly<Record<string, EquippedMeta>>;
  readonly nextInstanceSeq: number;
}

export type GrantLootResult =
  | { ok: true; kit: GearKit; item: InventoryItem }
  | { ok: false; reason: 'full' | 'invalid'; kit: GearKit };

export type EquipResult =
  | { ok: true; kit: GearKit; equipped: EquipmentItem; swapped?: InventoryItem }
  | {
      ok: false;
      reason: 'missing' | 'not_equippable' | 'inventory_full';
      kit: GearKit;
    };

export type UnequipResult =
  | { ok: true; kit: GearKit; returned: InventoryItem }
  | { ok: false; reason: 'empty' | 'inventory_full' | 'orphan'; kit: GearKit };

function cloneMeta(
  meta: Readonly<Record<string, EquippedMeta>>,
): Record<string, EquippedMeta> {
  return { ...meta };
}

export function createGearKit(
  capacity = DEFAULT_INVENTORY_CAPACITY,
): GearKit {
  return {
    inventory: createInventory(capacity),
    equipment: {},
    equippedMeta: {},
    nextInstanceSeq: 1,
  };
}

/** Grant a loot drop into the bag (quantity 1). Rejects when a new slot is needed and bag is full. */
export function grantLoot(kit: GearKit, drop: LootDrop): GrantLootResult {
  if (typeof drop.itemId !== 'string' || drop.itemId.length === 0) {
    return { ok: false, reason: 'invalid', kit };
  }
  if (!isRarity(drop.rarity)) {
    return { ok: false, reason: 'invalid', kit };
  }
  try {
    requireItemDefinition(drop.itemId);
  } catch {
    return { ok: false, reason: 'invalid', kit };
  }

  const item: InventoryItem = {
    itemId: drop.itemId,
    rarity: drop.rarity,
    quantity: 1,
  };
  const added = addItem(kit.inventory, item);
  if (!added.ok) {
    return { ok: false, reason: 'full', kit };
  }
  return {
    ok: true,
    kit: { ...kit, inventory: added.inventory },
    item,
  };
}

function mintInstanceId(kit: GearKit, itemId: string, rarity: Rarity): {
  id: string;
  nextInstanceSeq: number;
} {
  const id = `${itemId}:${rarity}:${kit.nextInstanceSeq}`;
  return { id, nextInstanceSeq: kit.nextInstanceSeq + 1 };
}

/**
 * Equip one stack unit from the bag into its equipment slot.
 * Replaced gear returns to the bag; fails if that would overflow capacity.
 */
export function equipFromInventory(
  kit: GearKit,
  itemId: string,
  rarity: Rarity,
): EquipResult {
  if (!isEquippable(itemId, rarity)) {
    return { ok: false, reason: 'not_equippable', kit };
  }
  const def = requireItemDefinition(itemId);
  const slot = def.slot!;
  const bonuses = equipmentBonusesFor(itemId, rarity)!;

  const removed = removeItem(kit.inventory, itemId, 1, rarity);
  if (!removed.ok) {
    return { ok: false, reason: 'missing', kit };
  }

  let inventory = removed.inventory;
  let equipment = kit.equipment;
  let equippedMeta = cloneMeta(kit.equippedMeta);
  let swapped: InventoryItem | undefined;
  let nextInstanceSeq = kit.nextInstanceSeq;

  const previous = equipment[slot];
  if (previous) {
    const prevMeta = equippedMeta[previous.id];
    if (!prevMeta) {
      // Restore the removed bag item — refuse orphaned slot data.
      const restore = addItem(inventory, { itemId, rarity, quantity: 1 });
      return {
        ok: false,
        reason: 'not_equippable',
        kit: restore.ok ? { ...kit, inventory: restore.inventory } : kit,
      };
    }
    const returned = addItem(inventory, {
      itemId: prevMeta.itemId,
      rarity: prevMeta.rarity,
      quantity: 1,
    });
    if (!returned.ok) {
      // Bag full — put the candidate back and abort (no item loss).
      const restore = addItem(inventory, { itemId, rarity, quantity: 1 });
      return {
        ok: false,
        reason: 'inventory_full',
        kit: restore.ok ? { ...kit, inventory: restore.inventory } : { ...kit, inventory },
      };
    }
    inventory = returned.inventory;
    swapped = {
      itemId: prevMeta.itemId,
      rarity: prevMeta.rarity,
      quantity: 1,
    };
    delete equippedMeta[previous.id];
    equipment = unequipItem(equipment, slot);
  }

  const minted = mintInstanceId(
    { ...kit, nextInstanceSeq },
    itemId,
    rarity,
  );
  nextInstanceSeq = minted.nextInstanceSeq;
  const equipped: EquipmentItem = {
    id: minted.id,
    slot,
    bonuses: { ...bonuses },
  };
  equipment = equipItem(equipment, equipped);
  equippedMeta[equipped.id] = { itemId, rarity };

  return {
    ok: true,
    kit: {
      inventory,
      equipment,
      equippedMeta,
      nextInstanceSeq,
    },
    equipped,
    swapped,
  };
}

/** Unequip a slot back into the bag. */
export function unequipToInventory(
  kit: GearKit,
  slot: EquipmentSlot,
): UnequipResult {
  const current = kit.equipment[slot];
  if (!current) {
    return { ok: false, reason: 'empty', kit };
  }
  const meta = kit.equippedMeta[current.id];
  if (!meta) {
    return { ok: false, reason: 'orphan', kit };
  }

  const added = addItem(kit.inventory, {
    itemId: meta.itemId,
    rarity: meta.rarity,
    quantity: 1,
  });
  if (!added.ok) {
    return { ok: false, reason: 'inventory_full', kit };
  }

  const equippedMeta = cloneMeta(kit.equippedMeta);
  delete equippedMeta[current.id];

  return {
    ok: true,
    kit: {
      inventory: added.inventory,
      equipment: unequipItem(kit.equipment, slot),
      equippedMeta,
      nextInstanceSeq: kit.nextInstanceSeq,
    },
    returned: { itemId: meta.itemId, rarity: meta.rarity, quantity: 1 },
  };
}

/**
 * Derive live combat stats from naked base + equipment.
 * Pass current hp/mp via `vitals` to avoid healing on equip.
 */
export function deriveLoadoutStats(
  kit: GearKit,
  vitals: { hp: number; mp: number } | 'full' = 'full',
): CombatStats {
  const naked = createPlayerStats();
  const base: CombatStats =
    vitals === 'full'
      ? naked
      : { ...naked, hp: vitals.hp, mp: vitals.mp };
  const derived = deriveCombatStats(base, kit.equipment);
  if (vitals === 'full') {
    return {
      ...derived,
      hp: derived.maxHp,
      mp: derived.maxMp,
    };
  }
  return derived;
}

/** Snapshot helpers for UI / HUD. */
export function listBagSlots(kit: GearKit): readonly InventoryItem[] {
  return kit.inventory.slots;
}

export function getEquippedMeta(
  kit: GearKit,
  slot: EquipmentSlot,
): EquippedMeta | null {
  const item = kit.equipment[slot];
  if (!item) return null;
  return kit.equippedMeta[item.id] ?? null;
}

/** Exactly-once loot claim ledger (parallel to kill XP/gold claims). */
export interface LootClaimLedger {
  readonly claimedKillIds: ReadonlySet<string>;
}

export function createLootClaimLedger(): LootClaimLedger {
  return { claimedKillIds: new Set() };
}

export interface ClaimLootResult {
  ledger: LootClaimLedger;
  kit: GearKit;
  /** True when this killId was already claimed (no second roll/grant). */
  duplicate: boolean;
  /** Drop rolled for a first-time claim; null when empty roll or duplicate. */
  drop: LootDrop | null;
  /** Item actually placed in the bag. */
  granted: InventoryItem | null;
  /** True when a drop existed but the bag rejected it. */
  bagFull: boolean;
}

/**
 * Claims loot for a kill exactly once.
 * Callers supply the already-rolled `drop` (or null for empty). Duplicate killIds
 * return the prior kit unchanged and never re-grant.
 */
export function claimKillLoot(
  ledger: LootClaimLedger,
  kit: GearKit,
  killId: string,
  drop: LootDrop | null,
): ClaimLootResult {
  if (typeof killId !== 'string' || killId.length === 0) {
    throw new RangeError('killId must be a nonempty string');
  }
  if (ledger.claimedKillIds.has(killId)) {
    return {
      ledger,
      kit,
      duplicate: true,
      drop: null,
      granted: null,
      bagFull: false,
    };
  }

  const claimedKillIds = new Set(ledger.claimedKillIds);
  claimedKillIds.add(killId);
  const nextLedger: LootClaimLedger = { claimedKillIds };

  if (!drop) {
    return {
      ledger: nextLedger,
      kit,
      duplicate: false,
      drop: null,
      granted: null,
      bagFull: false,
    };
  }

  const granted = grantLoot(kit, drop);
  if (!granted.ok) {
    return {
      ledger: nextLedger,
      kit,
      duplicate: false,
      drop,
      granted: null,
      bagFull: granted.reason === 'full',
    };
  }

  return {
    ledger: nextLedger,
    kit: granted.kit,
    duplicate: false,
    drop,
    granted: granted.item,
    bagFull: false,
  };
}
