import { describe, expect, it } from 'vitest';
import { createProgression } from '../../src/core/progression/experience';
import {
  claimKillReward,
  createKillRewardLedger,
  hasClaimedKill,
} from '../../src/core/progression/killRewards';

describe('kill reward exactly-once claims', () => {
  it('awards XP and gold on first claim', () => {
    const ledger = createKillRewardLedger();
    const progression = createProgression();
    const result = claimKillReward(ledger, progression, 'enemy-1', {
      xp: 40,
      gold: 5,
    });

    expect(result).not.toBeNull();
    expect(result!.claimed).toBe(true);
    expect(result!.progression.state).toEqual({ level: 1, xp: 40, totalXp: 40 });
    expect(result!.ledger.gold).toBe(5);
    expect(hasClaimedKill(result!.ledger, 'enemy-1')).toBe(true);
    // Inputs remain unchanged.
    expect(hasClaimedKill(ledger, 'enemy-1')).toBe(false);
    expect(progression.xp).toBe(0);
  });

  it('rejects duplicate kill claims (no double XP / gold)', () => {
    const first = claimKillReward(
      createKillRewardLedger(),
      createProgression(),
      'enemy-1',
      { xp: 40, gold: 5 },
    )!;
    const duplicate = claimKillReward(
      first.ledger,
      first.progression.state,
      'enemy-1',
      { xp: 40, gold: 5 },
    );

    expect(duplicate).toBeNull();
    expect(first.ledger.gold).toBe(5);
    expect(first.progression.state.totalXp).toBe(40);
  });

  it('allows zero XP kills while still marking the kill claimed', () => {
    const result = claimKillReward(
      createKillRewardLedger(),
      createProgression(),
      'dummy-0',
      { xp: 0, gold: 0 },
    );

    expect(result).not.toBeNull();
    expect(result!.progression.levelsGained).toBe(0);
    expect(result!.progression.state.totalXp).toBe(0);
    expect(hasClaimedKill(result!.ledger, 'dummy-0')).toBe(true);
    expect(
      claimKillReward(result!.ledger, result!.progression.state, 'dummy-0', {
        xp: 100,
        gold: 10,
      }),
    ).toBeNull();
  });

  it('supports multi-level-up from a single kill reward', () => {
    const result = claimKillReward(
      createKillRewardLedger(),
      createProgression(),
      'elite-1',
      { xp: 300, gold: 20 },
    );

    expect(result!.progression).toEqual({
      state: { level: 3, xp: 75, totalXp: 300 },
      levelsGained: 2,
    });
    expect(result!.ledger.gold).toBe(20);
  });

  it('rejects invalid kill ids and rewards', () => {
    const ledger = createKillRewardLedger();
    const progression = createProgression();
    expect(() =>
      claimKillReward(ledger, progression, '', { xp: 1, gold: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      claimKillReward(ledger, progression, 'x', { xp: -1, gold: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      claimKillReward(ledger, progression, 'x', { xp: 1, gold: 1.5 }),
    ).toThrow(RangeError);
  });
});
