import { describe, expect, it } from 'vitest';
import { createPlayerStats } from '../../src/core/combat/damage';
import { deriveCombatStats, equipItem, unequipItem } from '../../src/core/equipment/equipment';

describe('Phase 2 equipment core', () => {
  const sword = { id: 'sword-1', slot: 'weapon' as const, bonuses: { attack: 7 } };
  const armor = { id: 'armor-1', slot: 'armor' as const, bonuses: { maxHp: 30, defense: 4 } };

  it('equips immutably and computes bonuses once from base', () => {
    const base = createPlayerStats();
    const initial = {};
    const withSword = equipItem(initial, sword);
    const withBoth = equipItem(withSword, armor);
    expect(initial).toEqual({});
    expect(withSword.armor).toBeUndefined();
    expect(deriveCombatStats(base, withBoth)).toMatchObject({
      hp: 100, maxHp: 130, attack: 19, defense: 9,
    });
    expect(deriveCombatStats(base, withBoth).attack).toBe(19);
    expect(base.attack).toBe(12);
  });

  it('replaces an occupied slot and unequips without mutating', () => {
    const first = equipItem({}, sword);
    const second = equipItem(first, { id: 'sword-2', slot: 'weapon', bonuses: { attack: 2 } });
    expect(first.weapon?.id).toBe('sword-1');
    expect(second.weapon?.id).toBe('sword-2');
    expect(unequipItem(second, 'weapon').weapon).toBeUndefined();
    expect(second.weapon?.id).toBe('sword-2');
  });

  it('rejects duplicate instance IDs across slots', () => {
    expect(() => equipItem(equipItem({}, sword), {
      id: 'sword-1', slot: 'armor', bonuses: {},
    })).toThrow(RangeError);
  });

  it('rejects invalid bonuses and empty IDs', () => {
    expect(() => equipItem({}, { id: '', slot: 'weapon', bonuses: {} })).toThrow(RangeError);
    expect(() => equipItem({}, {
      id: 'bad', slot: 'weapon', bonuses: { attack: Number.POSITIVE_INFINITY },
    })).toThrow(RangeError);
  });

  it('clamps derived stats without healing current HP', () => {
    const base = { ...createPlayerStats(), hp: 90, mp: 40 };
    const state = equipItem({}, {
      id: 'cursed', slot: 'armor',
      bonuses: { maxHp: -200, maxMp: -100, attack: -30, defense: -30 },
    });
    expect(deriveCombatStats(base, state)).toMatchObject({
      hp: 1, maxHp: 1, mp: 0, maxMp: 0, attack: 0, defense: 0,
    });
  });
});
