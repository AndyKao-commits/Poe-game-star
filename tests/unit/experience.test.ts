import { describe, expect, it } from 'vitest';
import {
  awardExperience,
  createProgression,
  xpToNextLevel,
} from '../../src/core/progression/experience';

describe('Phase 2 experience progression', () => {
  it('starts at level 1 with no experience', () => {
    expect(createProgression()).toEqual({ level: 1, xp: 0, totalXp: 0 });
    expect(xpToNextLevel(1)).toBe(85);
  });

  it('awards partial XP without mutating the original', () => {
    const initial = createProgression();
    const award = awardExperience(initial, 40);
    expect(award).toEqual({
      state: { level: 1, xp: 40, totalXp: 40 },
      levelsGained: 0,
    });
    expect(initial.xp).toBe(0);
  });

  it('levels up at threshold and carries over excess XP', () => {
    const award = awardExperience(createProgression(), 100);
    expect(award).toEqual({
      state: { level: 2, xp: 15, totalXp: 100 },
      levelsGained: 1,
    });
  });

  it('supports multiple level-ups from a single reward', () => {
    const award = awardExperience(createProgression(), 300);
    // level 1: 85; level 2: 140; remainder 75
    expect(award).toEqual({
      state: { level: 3, xp: 75, totalXp: 300 },
      levelsGained: 2,
    });
  });

  it('rejects negative, fractional and invalid state values', () => {
    expect(() => awardExperience(createProgression(), -1)).toThrow(RangeError);
    expect(() => awardExperience(createProgression(), 1.5)).toThrow(RangeError);
    expect(() => awardExperience({ level: 1, xp: 85, totalXp: 85 }, 1)).toThrow(RangeError);
    expect(() => xpToNextLevel(0)).toThrow(RangeError);
  });
});
