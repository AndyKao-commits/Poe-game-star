/**
 * Ground-loot ownership contract shared by C inventory, B enemy deaths,
 * D pickup UI and E scene integration. No Phaser dependency.
 *
 * A bag-capacity rejection does not destroy the drop: it stays on the ground.
 */
import { distance, type Vec2 } from '../iso/coordinates';
import { grantLoot, type GearKit } from '../loadout/gearKit';
import type { LootDrop } from './lootTable';

export const PICKUP_RADIUS_TILES = 1.5;
export const MAX_GROUND_DROPS = 32;

export interface GroundDrop {
  readonly id: string;
  readonly loot: LootDrop;
  readonly position: Vec2;
}

export interface GroundLootState {
  readonly drops: readonly GroundDrop[];
}

export function createGroundLootState(): GroundLootState {
  return { drops: [] };
}

/** Queue a unique physical drop. Reject duplicate ids and bounded overflow. */
export function placeGroundDrop(
  state: GroundLootState,
  entry: GroundDrop,
): { ok: true; state: GroundLootState } | { ok: false; reason: 'duplicate' | 'full' | 'invalid'; state: GroundLootState } {
  if (!entry.id || !entry.loot.itemId || !Number.isFinite(entry.position.x) || !Number.isFinite(entry.position.y)) {
    return { ok: false, reason: 'invalid', state };
  }
  if (state.drops.some((drop) => drop.id === entry.id)) {
    return { ok: false, reason: 'duplicate', state };
  }
  if (state.drops.length >= MAX_GROUND_DROPS) {
    return { ok: false, reason: 'full', state };
  }
  return { ok: true, state: { drops: [...state.drops, { ...entry, position: { ...entry.position } }] } };
}

/** Pickup is atomic: remove the world drop only after successful bag insertion. */
export function pickupGroundDrop(
  state: GroundLootState,
  kit: GearKit,
  dropId: string,
  playerPosition: Vec2,
): { ok: true; state: GroundLootState; kit: GearKit } |
   { ok: false; reason: 'missing' | 'too_far' | 'bag_full' | 'invalid'; state: GroundLootState; kit: GearKit } {
  const drop = state.drops.find((entry) => entry.id === dropId);
  if (!drop) return { ok: false, reason: 'missing', state, kit };
  if (!Number.isFinite(playerPosition.x) || !Number.isFinite(playerPosition.y)) {
    return { ok: false, reason: 'invalid', state, kit };
  }
  if (distance(drop.position, playerPosition) > PICKUP_RADIUS_TILES) {
    return { ok: false, reason: 'too_far', state, kit };
  }
  const granted = grantLoot(kit, drop.loot);
  if (!granted.ok) {
    return { ok: false, reason: granted.reason === 'full' ? 'bag_full' : 'invalid', state, kit };
  }
  return {
    ok: true,
    kit: granted.kit,
    state: { drops: state.drops.filter((entry) => entry.id !== dropId) },
  };
}
