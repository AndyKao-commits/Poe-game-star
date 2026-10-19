import { describe, expect, it } from 'vitest';
import {
  COMBAT_RULES, createPlayer, damageFor, nearestTarget, performAction, regenerateMana,
  type CombatEnemy,
} from '../../src/rebirth/combat/alphaCombat';

const enemies = (): CombatEnemy[] => [
  { id: 'b', position: { x: 30, y: 0 }, hp: 45, defense: 1 },
  { id: 'a', position: { x: 30, y: 0 }, hp: 45, defense: 1 },
  { id: 'far', position: { x: 200, y: 0 }, hp: 45, defense: 1 },
];

describe('Rebirth Alpha combat core', () => {
  it('creates player with approved provisional Chapter 1 stats', () => {
    const actor = createPlayer();
    expect([actor.hp, actor.mp, actor.attack, actor.defense]).toEqual([120, 60, 12, 4]);
  });
  it('selects nearest living target and stable ID on equal distance', () => {
    expect(nearestTarget({ x: 0, y: 0 }, enemies(), 72)?.id).toBe('a');
    expect(nearestTarget({ x: 0, y: 0 }, enemies(), 20)).toBeUndefined();
  });
  it('basic attack deals defense-reduced damage and respects cooldown', () => {
    const actor = createPlayer(); const targets = enemies();
    const first = performAction(actor, 'basic', targets, 0);
    expect(first).toEqual({ ok: true, action: 'basic', targetId: 'a', damage: 11 });
    expect(targets[1].hp).toBe(34);
    expect(performAction(actor, 'basic', targets, 100).reason).toBe('cooldown');
    expect(performAction(actor, 'basic', targets, 450).ok).toBe(true);
    expect(actor.mp).toBe(60);
  });
  it('punch consumes mana, applies stronger damage and respects cooldown', () => {
    const actor = createPlayer(); const targets = enemies();
    const first = performAction(actor, 'punch', targets, 1000);
    expect(first.ok).toBe(true);
    expect(first.damage).toBe(25);
    expect(actor.mp).toBe(45);
    expect(actor.lastCastAt).toBe(1000);
    expect(performAction(actor, 'punch', targets, 1001).reason).toBe('cooldown');
    expect(actor.readyAt.punch).toBe(1000 + COMBAT_RULES.punch.cooldown);
  });
  it('dash moves exactly 100 units in normalized facing direction', () => {
    const actor = createPlayer();
    actor.facing = { x: 3, y: 4 };
    const result = performAction(actor, 'dash', [], 2000);
    expect(result.destination).toEqual({ x: 60, y: 80 });
    expect(actor.mp).toBe(50);
    expect(performAction(actor, 'dash', [], 2001).reason).toBe('cooldown');
  });
  it('failed actions do not spend mana or cooldown', () => {
    const actor = createPlayer();
    expect(performAction(actor, 'punch', [], 0).reason).toBe('no-target');
    expect(actor.mp).toBe(60);
    expect(actor.readyAt.punch).toBe(0);
    actor.mp = 0;
    expect(performAction(actor, 'dash', [], 0).reason).toBe('mana');
    actor.hp = 0;
    expect(performAction(actor, 'basic', enemies(), 0).reason).toBe('dead');
  });
  it('regenerates mana after casting delay and caps at maximum', () => {
    const actor = createPlayer();
    actor.mp = 30; actor.lastCastAt = 1000;
    regenerateMana(actor, 1000, 2500);
    expect(actor.mp).toBe(30);
    regenerateMana(actor, 1000, 3000);
    expect(actor.mp).toBe(34);
    regenerateMana(actor, 100000, 4000);
    expect(actor.mp).toBe(60);
  });
  it('validates invalid time and damage parameters', () => {
    expect(performAction(createPlayer(), 'basic', enemies(), NaN).reason).toBe('invalid-time');
    expect(() => damageFor(-1, 1, 0)).toThrow();
    expect(() => regenerateMana(createPlayer(), -1, 0)).toThrow();
  });
});
