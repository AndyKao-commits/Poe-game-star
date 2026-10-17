import type { CombatStats } from '../combat/damage';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';

export interface StatBonuses {
  maxHp?: number;
  maxMp?: number;
  attack?: number;
  defense?: number;
}

export interface EquipmentItem {
  /** Unique instance ID, not the shared item definition ID. */
  id: string;
  slot: EquipmentSlot;
  bonuses: Readonly<StatBonuses>;
}

export type EquipmentState = Readonly<Partial<Record<EquipmentSlot, EquipmentItem>>>;

const SLOTS: readonly EquipmentSlot[] = ['weapon', 'armor', 'accessory'];
const BONUS_KEYS: readonly (keyof StatBonuses)[] = ['maxHp', 'maxMp', 'attack', 'defense'];

function validateItem(item: EquipmentItem): void {
  if (!item.id.trim() || !SLOTS.includes(item.slot)) {
    throw new RangeError('Invalid equipment ID or slot');
  }
  for (const key of BONUS_KEYS) {
    const value = item.bonuses[key];
    if (value !== undefined && (!Number.isFinite(value) || !Number.isInteger(value))) {
      throw new RangeError('Equipment bonuses must be finite integers');
    }
  }
}

/** Equip an item in its declared slot, returning a new state. */
export function equipItem(state: EquipmentState, item: EquipmentItem): EquipmentState {
  validateItem(item);
  for (const slot of SLOTS) {
    if (slot !== item.slot && state[slot]?.id === item.id) {
      throw new RangeError('An equipment instance cannot occupy multiple slots');
    }
  }
  return { ...state, [item.slot]: { ...item, bonuses: { ...item.bonuses } } };
}

export function unequipItem(state: EquipmentState, slot: EquipmentSlot): EquipmentState {
  if (!SLOTS.includes(slot)) throw new RangeError('Invalid equipment slot');
  const next = { ...state };
  delete next[slot];
  return next;
}

/**
 * Recompute stats from the original base, avoiding stacking bonuses each frame.
 * Current HP/MP are capped to derived maxima; equipment never heals the player.
 */
export function deriveCombatStats(base: CombatStats, equipment: EquipmentState): CombatStats {
  const result = { ...base };
  for (const slot of SLOTS) {
    const item = equipment[slot];
    if (!item) continue;
    validateItem(item);
    for (const key of BONUS_KEYS) {
      result[key] += item.bonuses[key] ?? 0;
    }
  }
  result.maxHp = Math.max(1, result.maxHp);
  result.maxMp = Math.max(0, result.maxMp);
  result.attack = Math.max(0, result.attack);
  result.defense = Math.max(0, result.defense);
  result.hp = Math.min(Math.max(0, result.hp), result.maxHp);
  result.mp = Math.min(Math.max(0, result.mp), result.maxMp);
  return result;
}
