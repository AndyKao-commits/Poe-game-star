export interface CombatStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
}

export interface DamageRoll {
  amount: number;
  isCrit: boolean;
  rawDamage: number;
  mitigation: number;
}

/** GDD V0.1 player default crit chance. */
export const DEFAULT_CRIT_CHANCE = 0.05;
/** Crit multiplier when a crit lands (non-crit uses 1). */
export const DEFAULT_CRIT_MULTIPLIER = 1.5;
/** Phase-1 enemies do not crit unless overridden. */
export const ENEMY_CRIT_CHANCE = 0;

export interface DamageInput {
  baseAttack: number;
  defense: number;
  skillMultiplier?: number;
  increasedDamage?: number;
  flatDamage?: number;
  critChance?: number;
  /** Multiplier applied only when the roll crits. Non-crit always uses 1. */
  critMultiplier?: number;
  rng?: () => number;
}

export function createPlayerStats(): CombatStats {
  return {
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    attack: 12,
    defense: 5,
  };
}

export function createEnemyStats(maxHp = 40, attack = 8, defense = 2): CombatStats {
  return {
    hp: maxHp,
    maxHp,
    mp: 0,
    maxMp: 0,
    attack,
    defense,
  };
}

/**
 * Shared mitigation curve: defense / (defense + 100).
 * Negative defense is clamped to 0.
 */
export function computeMitigation(defense: number): number {
  const d = Math.max(0, defense);
  return d / (d + 100);
}

/**
 * Unified GDD V0.1 damage entry for players, monsters, and skills.
 *
 * rawDamage = baseAttack * skillMultiplier * (1 + increasedDamage) + flatDamage
 * mitigation = defense / (defense + 100)
 * finalDamage = max(1, floor(rawDamage * (1 - mitigation) * critMultiplier))
 *
 * Non-crit critMultiplier is always 1.
 */
export function calculateDamage(input: DamageInput): DamageRoll {
  const skillMultiplier = input.skillMultiplier ?? 1;
  const increasedDamage = input.increasedDamage ?? 0;
  const flatDamage = input.flatDamage ?? 0;
  const rawDamage =
    input.baseAttack * skillMultiplier * (1 + increasedDamage) + flatDamage;
  const mitigation = computeMitigation(input.defense);

  const critChance = input.critChance ?? DEFAULT_CRIT_CHANCE;
  const critOnHit = input.critMultiplier ?? DEFAULT_CRIT_MULTIPLIER;
  const rng = input.rng ?? Math.random;
  const isCrit = rng() < critChance;
  const critMultiplier = isCrit ? critOnHit : 1;

  const amount = Math.max(1, Math.floor(rawDamage * (1 - mitigation) * critMultiplier));
  return { amount, isCrit, rawDamage, mitigation };
}

/**
 * Convenience wrapper: basic auto-attack with no skill modifiers.
 * Prefer `calculateDamage` for skills.
 */
export function rollDamage(
  baseAttack: number,
  defense: number,
  options: {
    skillMultiplier?: number;
    increasedDamage?: number;
    flatDamage?: number;
    critChance?: number;
    critMultiplier?: number;
    rng?: () => number;
  } = {},
): DamageRoll {
  return calculateDamage({
    baseAttack,
    defense,
    ...options,
  });
}

/**
 * Non-crit damage helper (critChance forced to 0) for deterministic previews.
 * @deprecated Prefer calculateDamage / rollDamage with an injected rng.
 */
export function computeDamage(baseAttack: number, defense: number): number {
  return calculateDamage({
    baseAttack,
    defense,
    critChance: 0,
    rng: () => 1,
  }).amount;
}

export function applyDamage(stats: CombatStats, rawDamage: number): CombatStats {
  return {
    ...stats,
    hp: Math.max(0, stats.hp - rawDamage),
  };
}

export function isDead(stats: CombatStats): boolean {
  return stats.hp <= 0;
}

export function restoreVitals(stats: CombatStats): CombatStats {
  return {
    ...stats,
    hp: stats.maxHp,
    mp: stats.maxMp,
  };
}
