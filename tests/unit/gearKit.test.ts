import { describe, expect, it } from 'vitest';
import { createPlayerStats } from '../../src/core/combat/damage';
import {
  claimKillLoot,
  createGearKit,
  createLootClaimLedger,
  deriveLoadoutStats,
  equipFromInventory,
  grantLoot,
  unequipToInventory,
} from '../../src/core/loadout/gearKit';
import { addItem, createInventory } from '../../src/core/inventory/inventory';

describe('gearKit loadout', () => {
  it('grants loot until capacity and rejects when full', () => {
    let kit = createGearKit(2);
    const first = grantLoot(kit, { itemId: 'scrap', rarity: 'common' });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    kit = first.kit;

    const second = grantLoot(kit, { itemId: 'ashen_blade', rarity: 'common' });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    kit = second.kit;

    const rejected = grantLoot(kit, { itemId: 'ruin_mail', rarity: 'common' });
    expect(rejected).toMatchObject({ ok: false, reason: 'full' });
    expect(rejected.kit.inventory.slots).toHaveLength(2);
  });

  it('equips from bag, updates derived attack once, and unequips without loss', () => {
    let kit = createGearKit(4);
    const granted = grantLoot(kit, { itemId: 'ashen_blade', rarity: 'uncommon' });
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;
    kit = granted.kit;

    const equipped = equipFromInventory(kit, 'ashen_blade', 'uncommon');
    expect(equipped.ok).toBe(true);
    if (!equipped.ok) return;
    kit = equipped.kit;
    expect(kit.inventory.slots).toHaveLength(0);
    expect(kit.equipment.weapon?.bonuses.attack).toBe(5);

    const base = createPlayerStats();
    const once = deriveLoadoutStats(kit, { hp: base.hp, mp: base.mp });
    const twice = deriveLoadoutStats(kit, { hp: base.hp, mp: base.mp });
    expect(once.attack).toBe(base.attack + 5);
    expect(twice.attack).toBe(once.attack);

    const unequipped = unequipToInventory(kit, 'weapon');
    expect(unequipped.ok).toBe(true);
    if (!unequipped.ok) return;
    expect(unequipped.kit.equipment.weapon).toBeUndefined();
    expect(unequipped.kit.inventory.slots).toEqual([
      { itemId: 'ashen_blade', rarity: 'uncommon', quantity: 1 },
    ]);
  });

  it('swaps occupied slot gear back into the bag', () => {
    const a = grantLoot(createGearKit(4), { itemId: 'ashen_blade', rarity: 'common' });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const b = grantLoot(a.kit, { itemId: 'ashen_blade', rarity: 'uncommon' });
    expect(b.ok).toBe(true);
    if (!b.ok) return;

    const first = equipFromInventory(b.kit, 'ashen_blade', 'common');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = equipFromInventory(first.kit, 'ashen_blade', 'uncommon');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.kit.equipment.weapon?.bonuses.attack).toBe(5);
    expect(second.swapped).toEqual({
      itemId: 'ashen_blade',
      rarity: 'common',
      quantity: 1,
    });
    expect(second.kit.inventory.slots).toEqual([
      { itemId: 'ashen_blade', rarity: 'common', quantity: 1 },
    ]);
  });

  it('claims loot exactly once per kill id', () => {
    let ledger = createLootClaimLedger();
    let kit = createGearKit(8);
    const drop = { itemId: 'scrap' as const, rarity: 'common' as const };

    const first = claimKillLoot(ledger, kit, 'enemy-1', drop);
    expect(first.duplicate).toBe(false);
    expect(first.granted).toEqual({ itemId: 'scrap', rarity: 'common', quantity: 1 });
    ledger = first.ledger;
    kit = first.kit;

    const second = claimKillLoot(ledger, kit, 'enemy-1', drop);
    expect(second.duplicate).toBe(true);
    expect(second.granted).toBeNull();
    expect(second.kit.inventory.slots).toEqual(kit.inventory.slots);
  });

  it('reports bagFull without losing claim identity', () => {
    const fullInv = createInventory(0);
    const kit = { ...createGearKit(0), inventory: fullInv };
    const ledger = createLootClaimLedger();
    const result = claimKillLoot(ledger, kit, 'enemy-2', {
      itemId: 'scrap',
      rarity: 'common',
    });
    expect(result.duplicate).toBe(false);
    expect(result.bagFull).toBe(true);
    expect(result.ledger.claimedKillIds.has('enemy-2')).toBe(true);
    expect(result.kit.inventory.slots).toHaveLength(0);

    const replay = claimKillLoot(result.ledger, result.kit, 'enemy-2', {
      itemId: 'scrap',
      rarity: 'common',
    });
    expect(replay.duplicate).toBe(true);
  });

  it('restores full vitals with equipment bonuses after respawn derive', () => {
    let kit = createGearKit(4);
    const granted = grantLoot(kit, { itemId: 'ruin_mail', rarity: 'rare' });
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;
    const equipped = equipFromInventory(granted.kit, 'ruin_mail', 'rare');
    expect(equipped.ok).toBe(true);
    if (!equipped.ok) return;
    kit = equipped.kit;

    const wounded = deriveLoadoutStats(kit, { hp: 20, mp: 10 });
    expect(wounded.hp).toBe(20);
    expect(wounded.maxHp).toBe(140);

    const respawned = deriveLoadoutStats(kit, 'full');
    expect(respawned.hp).toBe(140);
    expect(respawned.maxHp).toBe(140);
    expect(respawned.defense).toBe(createPlayerStats().defense + 5);
  });

  it('rejects non-equippable materials', () => {
    let kit = createGearKit(2);
    const granted = grantLoot(kit, { itemId: 'scrap', rarity: 'common' });
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;
    kit = granted.kit;
    expect(equipFromInventory(kit, 'scrap', 'common').ok).toBe(false);
  });
});

describe('gearKit inventory helpers', () => {
  it('stacks scrap without consuming extra capacity', () => {
    const base = createInventory(1);
    const a = addItem(base, { itemId: 'scrap', rarity: 'common', quantity: 1 });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const b = addItem(a.inventory, { itemId: 'scrap', rarity: 'common', quantity: 2 });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.inventory.slots).toEqual([
      { itemId: 'scrap', rarity: 'common', quantity: 3 },
    ]);
  });
});
