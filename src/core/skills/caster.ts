/**
 * Pure skill caster state transitions for later GameScene integration.
 * Cooldown / mana / stamina policy and cast validation — no engine coupling.
 */

import { calculateDamage, type DamageRoll } from '../combat/damage';
import {
  ALL_SKILL_IDS,
  getSkillDefinition,
  isSkillId,
  type SkillDefinition,
  type SkillId,
} from './definitions';

export type CastFailReason =
  | 'unknown_skill'
  | 'dead'
  | 'disabled'
  | 'on_cooldown'
  | 'insufficient_mana'
  | 'insufficient_stamina';

export interface SkillResources {
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
}

export interface SkillCasterState {
  resources: SkillResources;
  /** Remaining cooldown ms per skill id. */
  cooldowns: Record<SkillId, number>;
  /** Remaining i-frame ms from the most recent successful dodge (or similar). */
  iframeRemainingMs: number;
  dead: boolean;
  /** Soft lock (stun / silence / cutscene) — blocks casting without death. */
  disabled: boolean;
}

export interface CreateCasterOptions {
  maxMana?: number;
  maxStamina?: number;
  mana?: number;
  stamina?: number;
  dead?: boolean;
  disabled?: boolean;
}

export interface CastContext {
  /** Attacker base attack for damage formula (attack skills only). */
  baseAttack: number;
  /** Target defense for damage formula (attack skills only). */
  defense: number;
  increasedDamage?: number;
  flatDamage?: number;
  critChance?: number;
  critMultiplier?: number;
  rng?: () => number;
}

export interface CastSuccess {
  ok: true;
  skill: SkillDefinition;
  state: SkillCasterState;
  /** Present when skillMultiplier > 0. */
  damage: DamageRoll | null;
  /** I-frame duration granted by this cast (0 if none). */
  iframeGrantedMs: number;
}

export interface CastFailure {
  ok: false;
  reason: CastFailReason;
  skill: SkillDefinition | null;
  state: SkillCasterState;
}

export type CastResult = CastSuccess | CastFailure;

function emptyCooldowns(): Record<SkillId, number> {
  return { q: 0, e: 0, dodge: 0 };
}

/** Snapshot-friendly deep clone of caster state. */
export function cloneCasterState(state: SkillCasterState): SkillCasterState {
  return {
    resources: { ...state.resources },
    cooldowns: { ...state.cooldowns },
    iframeRemainingMs: state.iframeRemainingMs,
    dead: state.dead,
    disabled: state.disabled,
  };
}

export function createCasterState(options: CreateCasterOptions = {}): SkillCasterState {
  const maxMana = options.maxMana ?? 50;
  const maxStamina = options.maxStamina ?? 100;
  return {
    resources: {
      mana: options.mana ?? maxMana,
      maxMana,
      stamina: options.stamina ?? maxStamina,
      maxStamina,
    },
    cooldowns: emptyCooldowns(),
    iframeRemainingMs: 0,
    dead: options.dead ?? false,
    disabled: options.disabled ?? false,
  };
}

/**
 * Validate whether a cast would succeed without mutating state.
 * Prefer `tryCast` for the state transition; use this for UI gating.
 */
export function validateCast(
  state: SkillCasterState,
  skillId: string,
): { ok: true; skill: SkillDefinition } | { ok: false; reason: CastFailReason; skill: SkillDefinition | null } {
  if (!isSkillId(skillId)) {
    return { ok: false, reason: 'unknown_skill', skill: null };
  }
  const skill = getSkillDefinition(skillId);
  if (state.dead) {
    return { ok: false, reason: 'dead', skill };
  }
  if (state.disabled) {
    return { ok: false, reason: 'disabled', skill };
  }
  if ((state.cooldowns[skillId] ?? 0) > 0) {
    return { ok: false, reason: 'on_cooldown', skill };
  }
  if (state.resources.mana < skill.manaCost) {
    return { ok: false, reason: 'insufficient_mana', skill };
  }
  if (state.resources.stamina < skill.staminaCost) {
    return { ok: false, reason: 'insufficient_stamina', skill };
  }
  return { ok: true, skill };
}

/**
 * Attempt to cast a skill. On success: deduct resources, start cooldown,
 * optionally grant i-frames and compute damage via the shared GDD formula.
 * Always returns a new state object (immutable transition).
 */
export function tryCast(
  state: SkillCasterState,
  skillId: string,
  context: CastContext = { baseAttack: 0, defense: 0 },
): CastResult {
  const check = validateCast(state, skillId);
  if (!check.ok) {
    return {
      ok: false,
      reason: check.reason,
      skill: check.skill,
      state: cloneCasterState(state),
    };
  }

  const skill = check.skill;
  const next = cloneCasterState(state);
  next.resources.mana = Math.max(0, next.resources.mana - skill.manaCost);
  next.resources.stamina = Math.max(0, next.resources.stamina - skill.staminaCost);
  next.cooldowns[skill.id] = skill.cooldownMs;

  let iframeGrantedMs = 0;
  if (skill.iframeMs > 0) {
    iframeGrantedMs = skill.iframeMs;
    next.iframeRemainingMs = Math.max(next.iframeRemainingMs, skill.iframeMs);
  }

  let damage: DamageRoll | null = null;
  if (skill.skillMultiplier > 0) {
    damage = calculateDamage({
      baseAttack: context.baseAttack,
      defense: context.defense,
      skillMultiplier: skill.skillMultiplier,
      increasedDamage: context.increasedDamage,
      flatDamage: context.flatDamage,
      critChance: context.critChance,
      critMultiplier: context.critMultiplier,
      rng: context.rng,
    });
  }

  return {
    ok: true,
    skill,
    state: next,
    damage,
    iframeGrantedMs,
  };
}

/**
 * Tick cooldowns and i-frame timers. Pure: returns a new state.
 */
export function tickCooldowns(state: SkillCasterState, deltaMs: number): SkillCasterState {
  const dt = Math.max(0, deltaMs);
  const next = cloneCasterState(state);
  for (const id of ALL_SKILL_IDS) {
    next.cooldowns[id] = Math.max(0, (next.cooldowns[id] ?? 0) - dt);
  }
  next.iframeRemainingMs = Math.max(0, next.iframeRemainingMs - dt);
  return next;
}

/** Whether the caster currently has dodge / skill i-frames. */
export function isInvulnerable(state: SkillCasterState): boolean {
  return state.iframeRemainingMs > 0;
}

export function setDead(state: SkillCasterState, dead: boolean): SkillCasterState {
  const next = cloneCasterState(state);
  next.dead = dead;
  return next;
}

export function setDisabled(state: SkillCasterState, disabled: boolean): SkillCasterState {
  const next = cloneCasterState(state);
  next.disabled = disabled;
  return next;
}

/**
 * Restore mana/stamina (clamped). Useful for potions / regen ticks later.
 */
export function restoreResources(
  state: SkillCasterState,
  amounts: { mana?: number; stamina?: number },
): SkillCasterState {
  const next = cloneCasterState(state);
  if (amounts.mana !== undefined) {
    next.resources.mana = Math.min(
      next.resources.maxMana,
      Math.max(0, next.resources.mana + amounts.mana),
    );
  }
  if (amounts.stamina !== undefined) {
    next.resources.stamina = Math.min(
      next.resources.maxStamina,
      Math.max(0, next.resources.stamina + amounts.stamina),
    );
  }
  return next;
}
