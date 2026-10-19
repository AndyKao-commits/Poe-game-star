/**
 * Skill button presentation helpers for HUD / touch chrome.
 * Maps authoritative caster state → distinct UI states (no fabricated timers).
 * Touch cast wiring lives in engineering A (touchControls); this module is display-only.
 */

import {
  getSkillDefinition,
  validateCast,
  type CastFailReason,
  type SkillCasterState,
  type SkillId,
} from '@core/skills';

export type SkillUiAvailability =
  | 'ready'
  | 'cooldown'
  | 'insufficient_mana'
  | 'insufficient_stamina'
  | 'disabled'
  | 'dead'
  | 'unavailable';

export interface SkillUiSnapshot {
  id: SkillId;
  label: string;
  shortLabel: string;
  availability: SkillUiAvailability;
  /** Remaining cooldown ms from caster (0 when ready / unavailable). */
  cooldownRemainingMs: number;
  /** Definition cooldown for radial / progress mask. */
  cooldownTotalMs: number;
  manaCost: number;
  staminaCost: number;
  /** Whole-second countdown for button label; null when not on cooldown. */
  cooldownDisplaySec: number | null;
}

const SHORT_LABEL: Record<SkillId, string> = {
  q: 'Q',
  e: 'E',
  dodge: '閃',
};

function availabilityFromFail(reason: CastFailReason): SkillUiAvailability {
  switch (reason) {
    case 'on_cooldown':
      return 'cooldown';
    case 'insufficient_mana':
      return 'insufficient_mana';
    case 'insufficient_stamina':
      return 'insufficient_stamina';
    case 'dead':
      return 'dead';
    case 'disabled':
      return 'disabled';
    case 'unknown_skill':
      return 'unavailable';
  }
}

/**
 * Build a skill UI snapshot from live caster state.
 * Pass `null` when the skills runtime is not yet integrated — yields `unavailable`.
 */
export function skillUiFromCaster(
  caster: SkillCasterState | null | undefined,
  id: SkillId,
): SkillUiSnapshot {
  const def = getSkillDefinition(id);
  const base: SkillUiSnapshot = {
    id,
    label: def.name,
    shortLabel: SHORT_LABEL[id],
    availability: 'unavailable',
    cooldownRemainingMs: 0,
    cooldownTotalMs: def.cooldownMs,
    manaCost: def.manaCost,
    staminaCost: def.staminaCost,
    cooldownDisplaySec: null,
  };

  if (!caster) {
    return base;
  }

  const remaining = Math.max(0, caster.cooldowns[id] ?? 0);
  const check = validateCast(caster, id);
  const availability = check.ok ? 'ready' : availabilityFromFail(check.reason);

  return {
    ...base,
    availability,
    cooldownRemainingMs: remaining,
    cooldownDisplaySec:
      availability === 'cooldown' && remaining > 0
        ? Math.max(1, Math.ceil(remaining / 1000))
        : null,
  };
}

export function allSkillUiSnapshots(
  caster: SkillCasterState | null | undefined,
): SkillUiSnapshot[] {
  return (['q', 'e', 'dodge'] as const).map((id) => skillUiFromCaster(caster, id));
}

/** Cooldown progress 0..1 for radial mask (1 = just started, 0 = ready). */
export function skillCooldownProgress(snap: SkillUiSnapshot): number {
  if (snap.cooldownTotalMs <= 0 || snap.cooldownRemainingMs <= 0) return 0;
  return Math.max(0, Math.min(1, snap.cooldownRemainingMs / snap.cooldownTotalMs));
}

const AVAILABILITY_CLASSES: readonly SkillUiAvailability[] = [
  'ready',
  'cooldown',
  'insufficient_mana',
  'insufficient_stamina',
  'disabled',
  'dead',
  'unavailable',
];

/**
 * Apply presentation classes / ARIA / countdown to a skill button element.
 * Safe to call from HUD or touchControls without inventing cooldown values.
 */
export function applySkillButtonDom(el: HTMLElement, snap: SkillUiSnapshot): void {
  for (const name of AVAILABILITY_CLASSES) {
    el.classList.toggle(`is-${name.replace(/_/g, '-')}`, snap.availability === name);
  }
  // Legacy lock class used by existing touch chrome until A rewires casts.
  el.classList.toggle('is-locked', snap.availability === 'unavailable');

  const ready = snap.availability === 'ready';
  if (el instanceof HTMLButtonElement) {
    el.disabled = !ready;
  }
  el.setAttribute('aria-disabled', ready ? 'false' : 'true');
  el.setAttribute('data-skill-id', snap.id);
  el.setAttribute('data-skill-state', snap.availability);
  el.setAttribute('aria-label', skillAriaLabel(snap));

  const progress = skillCooldownProgress(snap);
  el.style.setProperty('--skill-cd', String(progress));

  const cdEl = el.querySelector('[data-skill-cd]');
  if (cdEl) {
    cdEl.textContent =
      snap.cooldownDisplaySec !== null ? String(snap.cooldownDisplaySec) : '';
  }

  // Unavailable = not wired (no hit target). Other blocked states keep hit target for feedback.
  el.style.pointerEvents = snap.availability === 'unavailable' ? 'none' : 'auto';
}

export function skillAriaLabel(snap: SkillUiSnapshot): string {
  const costBits: string[] = [];
  if (snap.manaCost > 0) costBits.push(`MP ${snap.manaCost}`);
  if (snap.staminaCost > 0) costBits.push(`耐力 ${snap.staminaCost}`);
  const cost = costBits.length ? `（${costBits.join(' · ')}）` : '';

  switch (snap.availability) {
    case 'ready':
      return `${snap.label}${cost}，可用`;
    case 'cooldown':
      return `${snap.label}，冷卻 ${snap.cooldownDisplaySec ?? 0} 秒`;
    case 'insufficient_mana':
      return `${snap.label}，魔力不足`;
    case 'insufficient_stamina':
      return `${snap.label}，耐力不足`;
    case 'disabled':
      return `${snap.label}，暫時無法使用`;
    case 'dead':
      return `${snap.label}，角色已死亡`;
    case 'unavailable':
      return `${snap.label}，尚未接入`;
  }
}
