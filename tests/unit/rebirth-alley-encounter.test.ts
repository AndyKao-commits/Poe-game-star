import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/rebirth/combat/alphaCombat';
import {
  ALLEY_BOUNDS, RebirthAlleyEncounter, createAlleyEnemies,
} from '../../src/rebirth/combat/alleyEncounter';
import type { StickVector } from '../../src/rebirth/input/touchControls';

const idle: StickVector = { x: 0, y: 0, magnitude: 0 };
const right: StickVector = { x: 1, y: 0, magnitude: 1 };

describe('Rebirth first alley encounter simulation', () => {
  it('spawns two new-design enemy domain records and player within alley', () => {
    const fight = new RebirthAlleyEncounter();
    const state = fight.snapshot();
    expect(state.enemies).toHaveLength(2);
    expect(state.player.hp).toBe(120);
    expect(state.cleared).toBe(false);
  });

  it('moves with joystick at 150 units/s and updates facing', () => {
    const fight = new RebirthAlleyEncounter();
    fight.tick(0, idle);
    const before = fight.player.position.x;
    const state = fight.tick(50, right);
    expect(state.player.position.x - before).toBeCloseTo(7.5);
    expect(state.player.facing).toEqual({ x: 1, y: 0 });
  });

  it('caps frame delta after app backgrounding and clamps world edges', () => {
    const fight = new RebirthAlleyEncounter(createPlayer({ x: 454, y: 140 }), []);
    fight.tick(0, idle);
    fight.tick(100000, right);
    expect(fight.player.position.x).toBe(ALLEY_BOUNDS.maxX);
    expect(fight.snapshot().cleared).toBe(true);
  });

  it('enemy pursues player until melee reach without teleporting', () => {
    const player = createPlayer({ x: 100, y: 140 });
    const enemies = createAlleyEnemies();
    enemies.splice(1);
    enemies[0].position = { x: 180, y: 140 };
    const fight = new RebirthAlleyEncounter(player, enemies);
    fight.tick(0, idle);
    const state = fight.tick(50, idle);
    expect(state.enemies[0].position.x).toBeLessThan(180);
    expect(state.enemies[0].position.x).toBeGreaterThan(175);
    expect(state.enemies[0].phase).toBe('chase');
  });

  it('telegraphs before hit, then deals damage once and enters recovery', () => {
    const player = createPlayer({ x: 100, y: 140 });
    const enemies = createAlleyEnemies();
    enemies.splice(1);
    enemies[0].position = { x: 124, y: 140 };
    const fight = new RebirthAlleyEncounter(player, enemies);
    const windup = fight.tick(0, idle);
    expect(windup.events).toEqual([{ kind: 'windup', enemyId: 'fire-brawler-01', until: 500 }]);
    expect(windup.player.hp).toBe(120);
    expect(fight.tick(499, idle).player.hp).toBe(120);
    const hit = fight.tick(500, idle);
    expect(hit.player.hp).toBe(113);
    expect(hit.events.filter(e => e.kind === 'player-hit')).toHaveLength(1);
    expect(fight.tick(501, idle).player.hp).toBe(113);
  });

  it('dodging out of reach during telegraph prevents hit', () => {
    const player = createPlayer({ x: 100, y: 140 });
    const enemies = createAlleyEnemies();
    enemies.splice(1);
    enemies[0].position = { x: 124, y: 140 };
    const fight = new RebirthAlleyEncounter(player, enemies);
    fight.tick(0, idle);
    fight.player.position = { x: 230, y: 140 };
    const state = fight.tick(500, idle);
    expect(state.player.hp).toBe(120);
    expect(state.enemies[0].phase).toBe('recovery');
  });

  it('punch defeats low-HP enemy and emits a single defeat event', () => {
    const enemies = createAlleyEnemies();
    enemies.splice(1);
    enemies[0].hp = 20;
    enemies[0].position = { x: 135, y: 140 };
    const fight = new RebirthAlleyEncounter(createPlayer({ x: 100, y: 140 }), enemies);
    expect(fight.action('punch', 0).ok).toBe(true);
    const state = fight.tick(0, idle);
    expect(state.cleared).toBe(true);
    expect(state.events.filter(e => e.kind === 'enemy-defeated')).toHaveLength(1);
    expect(fight.tick(50, idle).events).toEqual([]);
  });

  it('dash cannot leave arena and preserves resource cost', () => {
    const player = createPlayer({ x: 455, y: 140 });
    player.facing = { x: 1, y: 0 };
    const fight = new RebirthAlleyEncounter(player, []);
    const result = fight.action('dash', 0);
    expect(result.ok).toBe(true);
    expect(fight.player.position.x).toBe(ALLEY_BOUNDS.maxX);
    expect(fight.player.mp).toBe(50);
  });

  it('rejects nonmonotonic and invalid frame timestamps', () => {
    const fight = new RebirthAlleyEncounter();
    expect(() => fight.tick(-1, idle)).toThrow();
    fight.tick(200, idle);
    expect(() => fight.tick(100, idle)).toThrow();
    expect(() => fight.tick(NaN, idle)).toThrow();
  });

  it('snapshot returns defensive copies and drains event queue', () => {
    const fight = new RebirthAlleyEncounter();
    const snap = fight.snapshot();
    snap.player.position.x = -900;
    snap.enemies[0].position.x = -900;
    expect(fight.player.position.x).not.toBe(-900);
    expect(fight.enemies[0].position.x).not.toBe(-900);
    expect(fight.snapshot().events).toEqual([]);
  });
});
