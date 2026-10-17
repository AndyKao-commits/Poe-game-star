/**
 * Bounded inventory data model.
 * Pure / immutable — no Phaser.
 */

import { isRarity, type Rarity } from '../loot/rarity';

export interface InventoryItem {
  itemId: string;
  rarity: Rarity;
  /** Stack size in this slot. Must be a positive safe integer. */
  quantity: number;
}

export interface Inventory {
  /** Maximum number of occupied slots. */
  readonly capacity: number;
  readonly slots: readonly InventoryItem[];
}

export type InventoryAddResult =
  | { ok: true; inventory: Inventory }
  | { ok: false; reason: 'full'; inventory: Inventory };

export type InventoryRemoveResult =
  | { ok: true; inventory: Inventory; removed: InventoryItem }
  | { ok: false; reason: 'missing' | 'insufficient'; inventory: Inventory };

function assertItem(item: InventoryItem): void {
  if (typeof item.itemId !== 'string' || item.itemId.length === 0) {
    throw new RangeError('itemId must be a nonempty string');
  }
  if (!isRarity(item.rarity)) {
    throw new RangeError(`invalid rarity: ${item.rarity}`);
  }
  if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
    throw new RangeError('quantity must be a positive safe integer');
  }
}

export function createInventory(capacity: number): Inventory {
  if (!Number.isSafeInteger(capacity) || capacity < 0) {
    throw new RangeError('capacity must be a nonnegative safe integer');
  }
  return { capacity, slots: [] };
}

export function inventoryIsFull(inventory: Inventory): boolean {
  return inventory.slots.length >= inventory.capacity;
}

/**
 * Adds an item stack.
 * Stacks with an existing slot that shares the same itemId + rarity.
 * Rejects with `{ ok: false, reason: 'full' }` when a new slot is required and capacity is reached.
 * Never mutates the input inventory.
 */
export function addItem(inventory: Inventory, item: InventoryItem): InventoryAddResult {
  assertItem(item);
  const existingIndex = inventory.slots.findIndex(
    (slot) => slot.itemId === item.itemId && slot.rarity === item.rarity,
  );

  if (existingIndex >= 0) {
    const slots = inventory.slots.map((slot, index) => {
      if (index !== existingIndex) {
        return slot;
      }
      const quantity = slot.quantity + item.quantity;
      if (!Number.isSafeInteger(quantity)) {
        throw new RangeError('stacked quantity exceeds safe integer range');
      }
      return { ...slot, quantity };
    });
    return { ok: true, inventory: { capacity: inventory.capacity, slots } };
  }

  if (inventoryIsFull(inventory)) {
    return { ok: false, reason: 'full', inventory };
  }

  return {
    ok: true,
    inventory: {
      capacity: inventory.capacity,
      slots: [...inventory.slots, { ...item }],
    },
  };
}

/**
 * Removes quantity from the first matching itemId + rarity slot.
 * Drops the slot when quantity reaches zero.
 */
export function removeItem(
  inventory: Inventory,
  itemId: string,
  quantity: number,
  rarity?: Rarity,
): InventoryRemoveResult {
  if (typeof itemId !== 'string' || itemId.length === 0) {
    throw new RangeError('itemId must be a nonempty string');
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new RangeError('quantity must be a positive safe integer');
  }
  if (rarity !== undefined && !isRarity(rarity)) {
    throw new RangeError(`invalid rarity: ${rarity}`);
  }

  const index = inventory.slots.findIndex(
    (slot) =>
      slot.itemId === itemId && (rarity === undefined || slot.rarity === rarity),
  );
  if (index < 0) {
    return { ok: false, reason: 'missing', inventory };
  }

  const slot = inventory.slots[index]!;
  if (slot.quantity < quantity) {
    return { ok: false, reason: 'insufficient', inventory };
  }

  const remaining = slot.quantity - quantity;
  const slots =
    remaining === 0
      ? inventory.slots.filter((_, i) => i !== index)
      : inventory.slots.map((s, i) =>
          i === index ? { ...s, quantity: remaining } : s,
        );

  return {
    ok: true,
    inventory: { capacity: inventory.capacity, slots },
    removed: { itemId: slot.itemId, rarity: slot.rarity, quantity },
  };
}

export function countItem(
  inventory: Inventory,
  itemId: string,
  rarity?: Rarity,
): number {
  return inventory.slots
    .filter(
      (slot) =>
        slot.itemId === itemId && (rarity === undefined || slot.rarity === rarity),
    )
    .reduce((sum, slot) => sum + slot.quantity, 0);
}
