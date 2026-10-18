import { describe, expect, it } from 'vitest';
import { createGearKit, grantLoot } from '../../src/core/loadout/gearKit';
import {
  createGroundLootState,
  placeGroundDrop,
  pickupGroundDrop,
  MAX_GROUND_DROPS,
} from '../../src/core/loot/groundDrops';

const drop = { id: 'enemy-1', loot: { itemId: 'ashen_blade', rarity: 'common' as const }, position: { x: 3, y: 4 } };

describe('ground drop pickup contract', () => {
  it('places a drop once and refuses duplicate identity', () => {
    const first = placeGroundDrop(createGroundLootState(), drop);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(placeGroundDrop(first.state, drop)).toMatchObject({ ok: false, reason: 'duplicate' });
  });

  it('only removes a drop after a successful nearby pickup', () => {
    const placed = placeGroundDrop(createGroundLootState(), drop);
    if (!placed.ok) throw new Error('setup failed');
    const tooFar = pickupGroundDrop(placed.state, createGearKit(1), drop.id, { x: 0, y: 0 });
    expect(tooFar).toMatchObject({ ok: false, reason: 'too_far' });
    expect(tooFar.state.drops).toHaveLength(1);
    const picked = pickupGroundDrop(placed.state, createGearKit(1), drop.id, { x: 3, y: 4 });
    expect(picked.ok).toBe(true);
    if (!picked.ok) return;
    expect(picked.state.drops).toHaveLength(0);
    expect(picked.kit.inventory.slots[0]?.itemId).toBe('ashen_blade');
    expect(pickupGroundDrop(picked.state, picked.kit, drop.id, { x: 3, y: 4 }))
      .toMatchObject({ ok: false, reason: 'missing' });
  });

  it('preserves a drop on full bag until there is capacity', () => {
    const placed = placeGroundDrop(createGroundLootState(), drop);
    if (!placed.ok) throw new Error('setup failed');
    const occupied = grantLoot(createGearKit(1), { itemId: 'scrap', rarity: 'common' });
    if (!occupied.ok) throw new Error('setup failed');
    const blocked = pickupGroundDrop(placed.state, occupied.kit, drop.id, { x: 3, y: 4 });
    expect(blocked).toMatchObject({ ok: false, reason: 'bag_full' });
    expect(blocked.state.drops).toHaveLength(1);
    expect(blocked.kit).toBe(occupied.kit);
  });

  it('caps pending world objects to avoid unbounded sprite growth', () => {
    let state = createGroundLootState();
    for (let i = 0; i < MAX_GROUND_DROPS; i++) {
      const next = placeGroundDrop(state, { ...drop, id: String(i) });
      if (!next.ok) throw new Error('setup failed');
      state = next.state;
    }
    expect(placeGroundDrop(state, { ...drop, id: 'overflow' }))
      .toMatchObject({ ok: false, reason: 'full' });
  });
});
