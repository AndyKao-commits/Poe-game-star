import type { Vec2 } from '../iso/coordinates';

export interface CombatFeedbackConfig {
  enabled: boolean;
  flash: boolean;
  floatingText: boolean;
  knockback: boolean;
  hitPauseMs: number;
  knockbackDistance: number;
}

export const DEFAULT_COMBAT_FEEDBACK: CombatFeedbackConfig = {
  enabled: true,
  flash: true,
  floatingText: true,
  knockback: true,
  hitPauseMs: 40,
  knockbackDistance: 0.35,
};

export interface DamageFloatEvent {
  amount: number;
  isCrit: boolean;
  world: Vec2;
}

/** Direction from attacker → target, scaled to knockback distance. */
export function knockbackDelta(
  attacker: Vec2,
  target: Vec2,
  distance = DEFAULT_COMBAT_FEEDBACK.knockbackDistance,
): Vec2 {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return { x: 0, y: -distance };
  }
  return { x: (dx / len) * distance, y: (dy / len) * distance };
}
