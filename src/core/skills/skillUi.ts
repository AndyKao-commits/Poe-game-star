import type { SkillId } from './definitions';

/** UI-readable skill / resource snapshot (HUD + touch chrome). */
export interface SkillUiState {
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  cooldowns: Record<SkillId, number>;
  cooldownTotal: Record<SkillId, number>;
  canCast: Record<SkillId, boolean>;
  failReason: Record<SkillId, string | null>;
  dead: boolean;
  disabled: boolean;
}
