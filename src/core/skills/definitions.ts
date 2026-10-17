/**
 * Engine-independent skill definitions for Phase 2 combat (Q / E / dodge).
 * Pure data — no Phaser, DOM, or UI coupling.
 */

export type SkillId = 'q' | 'e' | 'dodge';

export type SkillKind = 'attack' | 'utility' | 'mobility';

export interface SkillDefinition {
  id: SkillId;
  /** Human-readable label for HUD / debug (not used by core validation). */
  name: string;
  kind: SkillKind;
  cooldownMs: number;
  manaCost: number;
  staminaCost: number;
  /**
   * Multiplier fed into `calculateDamage` when the skill deals damage.
   * Utility / mobility skills use 0 (no damage roll).
   */
  skillMultiplier: number;
  /**
   * Invulnerability window duration in ms after a successful dodge.
   * Only meaningful for mobility skills; others leave this at 0.
   */
  iframeMs: number;
}

/** Default Phase 2 skill kit: Q (heavy strike), E (burst), dodge (i-frames). */
export const SKILL_DEFINITIONS: Readonly<Record<SkillId, SkillDefinition>> = {
  q: {
    id: 'q',
    name: 'Heavy Strike',
    kind: 'attack',
    cooldownMs: 2500,
    manaCost: 12,
    staminaCost: 0,
    skillMultiplier: 1.6,
    iframeMs: 0,
  },
  e: {
    id: 'e',
    name: 'Arc Burst',
    kind: 'attack',
    cooldownMs: 4500,
    manaCost: 22,
    staminaCost: 0,
    skillMultiplier: 2.2,
    iframeMs: 0,
  },
  dodge: {
    id: 'dodge',
    name: 'Dodge',
    kind: 'mobility',
    cooldownMs: 800,
    manaCost: 0,
    staminaCost: 18,
    skillMultiplier: 0,
    iframeMs: 280,
  },
} as const;

export const ALL_SKILL_IDS: readonly SkillId[] = ['q', 'e', 'dodge'];

export function getSkillDefinition(id: SkillId): SkillDefinition {
  return SKILL_DEFINITIONS[id];
}

export function isSkillId(value: string): value is SkillId {
  return value === 'q' || value === 'e' || value === 'dodge';
}
