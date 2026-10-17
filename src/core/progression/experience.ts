/** Deterministic, engine-independent experience progression. */
export interface ProgressionState {
  level: number;
  xp: number;
  totalXp: number;
}

export interface ExperienceAward {
  state: ProgressionState;
  levelsGained: number;
}

/** XP required to advance from the given level to the next. */
export function xpToNextLevel(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new RangeError('level must be a positive safe integer');
  }
  return Math.floor(50 + 25 * level + 10 * level * level);
}

export function createProgression(): ProgressionState {
  return { level: 1, xp: 0, totalXp: 0 };
}

/** Adds XP, including multiple level-ups in a single award. Never mutates input. */
export function awardExperience(
  current: ProgressionState,
  amount: number,
): ExperienceAward {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError('XP award must be a nonnegative safe integer');
  }
  if (!Number.isSafeInteger(current.level) || current.level < 1 ||
      !Number.isSafeInteger(current.xp) || current.xp < 0 ||
      !Number.isSafeInteger(current.totalXp) || current.totalXp < 0 ||
      current.xp >= xpToNextLevel(current.level)) {
    throw new RangeError('Invalid progression state');
  }
  if (!Number.isSafeInteger(current.totalXp + amount)) {
    throw new RangeError('Total XP exceeds safe integer range');
  }
  let level = current.level;
  let xp = current.xp + amount;
  let levelsGained = 0;
  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level++;
    levelsGained++;
  }
  return { state: { level, xp, totalXp: current.totalXp + amount }, levelsGained };
}
