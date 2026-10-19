/**
 * Ashen Reliquary: Rebirth v0.7.1 — pure combat prototype.
 * Do not import legacy src/core/combat/damage.ts: its defense curve and
 * starting stats belong to the previous game.
 *
 * Values are tuning hypotheses; see docs/rebirth/GAME_CONTRACT.md.
 */
export interface RebirthStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
}

export type RebirthSkillId = 'basic' | 'magicPunch' | 'blink';

export interface RebirthSkill {
  readonly id: RebirthSkillId;
  readonly label: string;
  readonly mpCost: number;
  readonly cooldownMs: number;
  readonly damageMultiplier: number;
}

export const REBIRTH_SKILLS: Readonly<Record<RebirthSkillId, RebirthSkill>> = {
  basic: { id: 'basic', label: '普通攻擊', mpCost: 0, cooldownMs: 450, damageMultiplier: 1 },
  magicPunch: { id: 'magicPunch', label: '魔力衝拳', mpCost: 15, cooldownMs: 5000, damageMultiplier: 2.2 },
  blink: { id: 'blink', label: '瞬步', mpCost: 10, cooldownMs: 7000, damageMultiplier: 0 },
};

export const REBIRTH_PLAYER = {
  maxHp: 120,
  maxMp: 60,
  attack: 12,
  defense: 4,
  movementSpeed: 150,
  critChance: 0.05,
  critMultiplier: 1.5,
  mpRegenPerSecond: 4,
  mpRegenDelayMs: 2000,
  blinkDistance: 100,
  blinkInvulnerabilityMs: 200,
} as const;

export function createRebirthPlayerStats(): RebirthStats {
  return {
    hp: REBIRTH_PLAYER.maxHp,
    maxHp: REBIRTH_PLAYER.maxHp,
    mp: REBIRTH_PLAYER.maxMp,
    maxMp: REBIRTH_PLAYER.maxMp,
    attack: REBIRTH_PLAYER.attack,
    defense: REBIRTH_PLAYER.defense,
  };
}

export const REBIRTH_ENEMIES = {
  fireBrawler: { label: '火拳混混', maxHp: 45, attack: 9, defense: 1 },
  shockCaster: { label: '電擊仔', maxHp: 35, attack: 8, defense: 0 },
  barrierGuard: { label: '結界打手', maxHp: 70, attack: 7, defense: 4 },
  bossBiao: { label: '阿彪', maxHp: 420, attack: 14, defense: 5 },
} as const;

export function createRebirthEnemyStats(
  enemyId: keyof typeof REBIRTH_ENEMIES,
): RebirthStats {
  const enemy = REBIRTH_ENEMIES[enemyId];
  return {
    hp: enemy.maxHp,
    maxHp: enemy.maxHp,
    mp: 0,
    maxMp: 0,
    attack: enemy.attack,
    defense: enemy.defense,
  };
}

export interface RebirthDamageInput {
  attack: number;
  targetDefense: number;
  skillMultiplier?: number;
  critChance?: number;
  critMultiplier?: number;
  /** Inject seeded RNG for reproducible tests. Must return a value in [0,1). */
  rng?: () => number;
}

export interface RebirthDamageResult {
  amount: number;
  isCritical: boolean;
  mitigationFactor: number;
}

/** Defense curve from GDD v0.7: 100 / (100 + 5 * defense). */
export function rebirthMitigationFactor(defense: number): number {
  return 100 / (100 + 5 * Math.max(0, defense));
}

export function calculateRebirthDamage(input: RebirthDamageInput): RebirthDamageResult {
  const attack = Math.max(0, input.attack);
  const skillMultiplier = Math.max(0, input.skillMultiplier ?? 1);
  const chance = Math.min(1, Math.max(0, input.critChance ?? REBIRTH_PLAYER.critChance));
  const roll = input.rng ?? Math.random;
  const isCritical = roll() < chance;
  const mitigationFactor = rebirthMitigationFactor(input.targetDefense);
  const preCritDamage = Math.max(1, Math.floor(attack * skillMultiplier * mitigationFactor));
  const amount = isCritical
    ? Math.max(1, Math.floor(preCritDamage * (input.critMultiplier ?? REBIRTH_PLAYER.critMultiplier)))
    : preCritDamage;
  return { amount, isCritical, mitigationFactor };
}

export interface RebirthSkillState {
  readonly mp: number;
  readonly readyAtMs: Readonly<Record<RebirthSkillId, number>>;
}

export function createRebirthSkillState(mp: number = REBIRTH_PLAYER.maxMp): RebirthSkillState {
  return { mp, readyAtMs: { basic: 0, magicPunch: 0, blink: 0 } };
}

export type SkillAttempt =
  | { ok: true; state: RebirthSkillState }
  | { ok: false; reason: 'cooldown' | 'insufficient-mp' | 'invalid-time'; state: RebirthSkillState };

/** Pure skill gate: no MP/cooldown is consumed on a failed attempt. */
export function tryUseRebirthSkill(
  state: RebirthSkillState,
  id: RebirthSkillId,
  nowMs: number,
): SkillAttempt {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    return { ok: false, reason: 'invalid-time', state };
  }
  const skill = REBIRTH_SKILLS[id];
  if (nowMs < state.readyAtMs[id]) {
    return { ok: false, reason: 'cooldown', state };
  }
  if (state.mp < skill.mpCost) {
    return { ok: false, reason: 'insufficient-mp', state };
  }
  return {
    ok: true,
    state: {
      mp: state.mp - skill.mpCost,
      readyAtMs: { ...state.readyAtMs, [id]: nowMs + skill.cooldownMs },
    },
  };
}

/** Recover MP after no casts for at least 2 seconds; call from a time-based update. */
export function regenerateRebirthMp(
  currentMp: number,
  maxMp: number,
  deltaMs: number,
  timeSinceLastCastMs: number,
): number {
  if (deltaMs <= 0 || timeSinceLastCastMs < REBIRTH_PLAYER.mpRegenDelayMs) return currentMp;
  return Math.min(maxMp, currentMp + (deltaMs / 1000) * REBIRTH_PLAYER.mpRegenPerSecond);
}

/** Boss phase switches on crossing 60% HP, not on absolute damage. */
export function rebirthBossPhase(hp: number, maxHp = REBIRTH_ENEMIES.bossBiao.maxHp): 1 | 2 {
  return hp > maxHp * 0.6 ? 1 : 2;
}
