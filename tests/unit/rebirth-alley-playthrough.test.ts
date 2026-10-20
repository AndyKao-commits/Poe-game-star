import { describe, expect, it } from 'vitest';
import { RebirthAlleySession } from '../../src/rebirth/dev/alleySession';
import { RebirthAlleyEncounter } from '../../src/rebirth/combat/alleyEncounter';
import { advanceAlleyObjective, ALLEY_EXIT } from '../../src/rebirth/dev/alleyObjective';
import { inspectAlleyClue, ALLEY_CLUE_POSITION } from '../../src/rebirth/dev/alleyClue';
import { createPlayer } from '../../src/rebirth/combat/alphaCombat';

const idle = { x: 0, y: 0, magnitude: 0 };
const east = { x: 1, y: 0, magnitude: 1 };

describe('Chapter 1 alley acceptance: independent gameplay domain integration', () => {
  it('combat victory opens exit, optional evidence persists, and reaching exit completes', () => {
    // Real encounter rules and default enemy HP/damage; position is a deterministic
    // test fixture to isolate the complete mission state machine from browser input.
    const player = createPlayer({ x: 260, y: 176 });
    const encounter = new RebirthAlleyEncounter(player);
    encounter.enemies[0].position = { x: 288, y: 176 };
    encounter.enemies[1].position = { x: 298, y: 176 };
    const session = new RebirthAlleySession(encounter);
    session.setInput({ stick: idle, basicHeld: true });
    let phase = 'fight' as const;
    let time = 0;
    let state = session.tick(time).state;
    // Advance at the actual game simulation cadence; use normal held-basic combat.
    for (time = 50; time <= 30000 && !state.cleared && !state.defeated; time += 50) {
      state = session.tick(time).state;
    }
    expect(state.defeated).toBe(false);
    expect(state.cleared).toBe(true);
    let objective = advanceAlleyObjective(phase, state.player.position, 0, state.player.hp);
    expect(objective.phase).toBe('reach-exit');
    expect(objective.exitVisible).toBe(true);
    const firstClue = inspectAlleyClue(ALLEY_CLUE_POSITION, objective.phase, false);
    expect(firstClue.justDiscovered).toBe(true);
    expect(inspectAlleyClue(ALLEY_EXIT, objective.phase, firstClue.discovered).discovered).toBe(true);
    objective = advanceAlleyObjective(objective.phase, ALLEY_EXIT, 0, state.player.hp);
    expect(objective.phase).toBe('complete');
    expect(objective.exitReached).toBe(true);
    expect(advanceAlleyObjective(objective.phase, { x: 24, y: 24 }, 2, state.player.hp).phase).toBe('complete');
    // A new run must have fresh enemies, a reset clock, and no prior evidence.
    const replay = new RebirthAlleySession(new RebirthAlleyEncounter());
    const replayState = replay.tick(0).state;
    expect(replayState.enemies.filter(e => e.hp > 0)).toHaveLength(2);
    expect(advanceAlleyObjective('fight', replayState.player.position, 2, replayState.player.hp).phase).toBe('fight');
    expect(inspectAlleyClue(replayState.player.position, 'fight', false).discovered).toBe(false);
  });

  it('defeat takes precedence over reaching the exit, and cannot be bypassed by replaying objective', () => {
    const objective = advanceAlleyObjective('fight', ALLEY_EXIT, 0, 0);
    expect(objective.phase).toBe('defeated');
    expect(objective.exitVisible).toBe(false);
    expect(advanceAlleyObjective('defeated', ALLEY_EXIT, 0, 120).phase).toBe('defeated');
  });
});
