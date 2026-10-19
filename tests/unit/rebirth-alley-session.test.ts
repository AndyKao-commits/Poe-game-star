import { describe, expect, it } from 'vitest';
import { createPlayer } from '../../src/rebirth/combat/alphaCombat';
import { RebirthAlleyEncounter, createAlleyEnemies } from '../../src/rebirth/combat/alleyEncounter';
import { RebirthAlleySession } from '../../src/rebirth/dev/alleySession';
import type { StickVector } from '../../src/rebirth/input/touchControls';

const idle: StickVector = { x: 0, y: 0, magnitude: 0 };
const right: StickVector = { x: 1, y: 0, magnitude: 1 };
function sessionWithEnemy(hp = 120): RebirthAlleySession {
  const enemy = createAlleyEnemies()[0];
  enemy.hp = hp; enemy.maxHp = hp;
  enemy.position = { x: 130, y: 140 };
  return new RebirthAlleySession(new RebirthAlleyEncounter(
    createPlayer({ x: 100, y: 140 }), [enemy],
  ));
}
describe('Rebirth input-to-encounter session', () => {
  it('moves player using live joystick state', () => {
    const session = sessionWithEnemy();
    session.tick(0);
    session.setInput({ stick: right, basicHeld: false });
    expect(session.tick(50).state.player.position.x).toBeCloseTo(107.5);
    session.resetInput();
    expect(session.tick(100).state.player.position.x).toBeCloseTo(107.5);
  });
  it('hold basic fires once immediately and repeats on 450ms cadence', () => {
    const session = sessionWithEnemy();
    session.setInput({ stick: idle, basicHeld: true });
    expect(session.tick(0).actions[0].ok).toBe(true);
    expect(session.tick(100).actions).toHaveLength(0);
    expect(session.tick(449).actions).toHaveLength(0);
    expect(session.tick(450).actions[0].ok).toBe(true);
    expect(session.tick(900).actions[0].ok).toBe(true);
  });
  it('tap release and re-press respects combat cooldown', () => {
    const session = sessionWithEnemy();
    session.setInput({ stick: idle, basicHeld: true });
    session.tick(0);
    session.setInput({ stick: idle, basicHeld: false });
    session.tick(50);
    session.setInput({ stick: idle, basicHeld: true });
    expect(session.tick(100).actions[0].reason).toBe('cooldown');
    expect(session.tick(450).actions[0].ok).toBe(true);
  });
  it('skills work while moving and expose combat results', () => {
    const session = sessionWithEnemy();
    session.setInput({ stick: right, basicHeld: false });
    session.tick(0);
    expect(session.trigger('punch', 50).ok).toBe(true);
    expect(session.encounter.player.mp).toBe(45);
    expect(session.consumeActions().map(x => x.action)).toEqual(['punch']);
    expect(session.consumeActions()).toEqual([]);
    expect(session.tick(50).state.player.position.x).toBeGreaterThan(100);
  });
  it('dash changes location while preserving world bounds', () => {
    const session = sessionWithEnemy();
    session.encounter.player.facing = { x: 1, y: 0 };
    const result = session.trigger('dash', 0);
    expect(result.ok).toBe(true);
    expect(session.encounter.player.position.x).toBe(200);
  });
  it('empty target does not consume mana or suppress later attacks', () => {
    const session = sessionWithEnemy();
    session.encounter.enemies[0].position = { x: 440, y: 200 };
    session.setInput({ stick: idle, basicHeld: true });
    expect(session.tick(0).actions[0].reason).toBe('no-target');
    session.encounter.enemies[0].position = { x: 120, y: 140 };
    expect(session.tick(50).actions[0].ok).toBe(true);
  });
  it('ends session when final enemy is defeated and rejects further skills', () => {
    const session = sessionWithEnemy(10);
    session.setInput({ stick: idle, basicHeld: true });
    const state = session.tick(0);
    expect(state.state.cleared).toBe(true);
    expect(session.isEnded).toBe(true);
    expect(session.trigger('punch', 50).ok).toBe(false);
    expect(session.tick(50).actions).toHaveLength(0);
  });
  it('rejects malformed stick and nonmonotonic clocks', () => {
    const session = sessionWithEnemy();
    expect(() => session.setInput({ stick: { x: NaN, y: 0, magnitude: 0 }, basicHeld: false })).toThrow();
    session.tick(100);
    expect(() => session.tick(99)).toThrow();
    expect(() => session.trigger('dash', 99)).toThrow();
  });
});
