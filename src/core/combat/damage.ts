export interface CombatStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
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

/** Flat damage: max(1, attack - defense). */
export function computeDamage(attackerAttack: number, defenderDefense: number): number {
  return Math.max(1, Math.floor(attackerAttack - defenderDefense));
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
