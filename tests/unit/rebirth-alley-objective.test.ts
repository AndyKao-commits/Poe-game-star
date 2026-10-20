import { describe, expect, it } from 'vitest';
import { advanceAlleyObjective, ALLEY_EXIT, ALLEY_EXIT_RADIUS } from '../../src/rebirth/dev/alleyObjective';
import { RebirthAlleySession } from '../../src/rebirth/dev/alleySession';
import { RebirthAlleyEncounter } from '../../src/rebirth/combat/alleyEncounter';
import { createPlayer } from '../../src/rebirth/combat/alphaCombat';

const right = { x: 1, y: 0, magnitude: 1 };

describe('Chapter 1 alley objective and post-combat exploration', () => {
  it('requires defeating all enemies before the exit appears', () => {
    const state = advanceAlleyObjective('fight', ALLEY_EXIT, 1, 120);
    expect(state.phase).toBe('fight');
    expect(state.exitVisible).toBe(false);
  });

  it('reveals an exit only after all enemies are defeated', () => {
    const state = advanceAlleyObjective('fight', { x: 110, y: 140 }, 0, 120);
    expect(state.phase).toBe('reach-exit');
    expect(state.exitVisible).toBe(true);
    expect(state.exitReached).toBe(false);
  });

  it('completes the mission when entering the exit radius', () => {
    const state = advanceAlleyObjective('reach-exit',
      { x: ALLEY_EXIT.x - ALLEY_EXIT_RADIUS + 1, y: ALLEY_EXIT.y }, 0, 120);
    expect(state.phase).toBe('complete');
    expect(state.exitReached).toBe(true);
    expect(advanceAlleyObjective('complete', { x: 0, y: 0 }, 2, 120).phase).toBe('complete');
  });

  it('player defeat overrides escape even while inside exit marker', () => {
    expect(advanceAlleyObjective('reach-exit', ALLEY_EXIT, 0, 0).phase).toBe('defeated');
    expect(advanceAlleyObjective('defeated', ALLEY_EXIT, 0, 120).phase).toBe('defeated');
  });

  it('allows joystick movement and air combat after clearing the fight', () => {
    const encounter = new RebirthAlleyEncounter(createPlayer({ x: 100, y: 140 }), []);
    const session = new RebirthAlleySession(encounter);
    session.tick(0);
    session.setInput({ stick: right, basicHeld: true });
    const result = session.tick(50);
    expect(result.state.cleared).toBe(true);
    expect(result.state.player.position.x).toBeGreaterThan(100);
    expect(session.isEnded).toBe(false);
    expect(session.trigger('punch', 50).ok).toBe(true);
    expect(session.tapBasic(50).reason).toBe('cooldown');
    expect(session.tick(100).state.player.position.x).toBeGreaterThan(result.state.player.position.x);
  });

  it('rejects invalid objective state inputs', () => {
    expect(() => advanceAlleyObjective('fight', { x: NaN, y: 0 }, 0, 1)).toThrow();
    expect(() => advanceAlleyObjective('fight', ALLEY_EXIT, -1, 1)).toThrow();
  });
});
