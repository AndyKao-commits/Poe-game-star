import { describe, expect, it } from 'vitest';
import {
  addItem,
  countItem,
  createInventory,
  inventoryIsFull,
  removeItem,
} from '../../src/core/inventory/inventory';

describe('bounded inventory', () => {
  it('adds items until capacity and rejects when full', () => {
    const empty = createInventory(2);
    const first = addItem(empty, {
      itemId: 'scrap',
      rarity: 'common',
      quantity: 1,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = addItem(first.inventory, {
      itemId: 'orb',
      rarity: 'rare',
      quantity: 1,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(inventoryIsFull(second.inventory)).toBe(true);

    const rejected = addItem(second.inventory, {
      itemId: 'sword',
      rarity: 'uncommon',
      quantity: 1,
    });
    expect(rejected).toEqual({
      ok: false,
      reason: 'full',
      inventory: second.inventory,
    });
    // Original inventory unchanged by failed add.
    expect(second.inventory.slots).toHaveLength(2);
  });

  it('stacks matching itemId + rarity without consuming a new slot', () => {
    const base = createInventory(1);
    const stacked = addItem(base, {
      itemId: 'scrap',
      rarity: 'common',
      quantity: 3,
    });
    expect(stacked.ok).toBe(true);
    if (!stacked.ok) return;

    const again = addItem(stacked.inventory, {
      itemId: 'scrap',
      rarity: 'common',
      quantity: 2,
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.inventory.slots).toEqual([
      { itemId: 'scrap', rarity: 'common', quantity: 5 },
    ]);
    expect(countItem(again.inventory, 'scrap')).toBe(5);
  });

  it('removes quantity and frees the slot at zero', () => {
    let inv = createInventory(2);
    const added = addItem(inv, {
      itemId: 'scrap',
      rarity: 'common',
      quantity: 4,
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    inv = added.inventory;

    const partial = removeItem(inv, 'scrap', 1);
    expect(partial.ok).toBe(true);
    if (!partial.ok) return;
    expect(partial.inventory.slots[0]?.quantity).toBe(3);

    const cleared = removeItem(partial.inventory, 'scrap', 3, 'common');
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.inventory.slots).toEqual([]);
    expect(removeItem(cleared.inventory, 'scrap', 1)).toEqual({
      ok: false,
      reason: 'missing',
      inventory: cleared.inventory,
    });
  });

  it('rejects insufficient remove and invalid capacity', () => {
    const added = addItem(createInventory(1), {
      itemId: 'orb',
      rarity: 'epic',
      quantity: 1,
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(removeItem(added.inventory, 'orb', 2)).toEqual({
      ok: false,
      reason: 'insufficient',
      inventory: added.inventory,
    });
    expect(() => createInventory(-1)).toThrow(RangeError);
  });
});
