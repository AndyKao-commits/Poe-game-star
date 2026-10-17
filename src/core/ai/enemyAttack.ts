import { distance, type Vec2 } from '../iso/coordinates';

export const ENEMY_WINDUP_MS = 400;
export const ENEMY_ATTACK_STRIKE_MS = 120;
export const ENEMY_RECOVERY_MS = 280;
export const ENEMY_ATTACK_COOLDOWN_MS = 900;
export const ENEMY_MELEE_RANGE = 0.85;
export const ENEMY_ENGAGE_RANGE = 1.05;

export type EnemyCombatPhase =
  | 'idle'
  | 'chase'
  | 'windup'
  | 'attack'
  | 'recovery'
  | 'hurt'
  | 'dead';

export interface EnemyAttackConfig {
  windupMs: number;
  strikeMs: number;
  recoveryMs: number;
  cooldownMs: number;
  meleeRange: number;
  engageRange: number;
}

export const DEFAULT_ENEMY_ATTACK: EnemyAttackConfig = {
  windupMs: ENEMY_WINDUP_MS,
  strikeMs: ENEMY_ATTACK_STRIKE_MS,
  recoveryMs: ENEMY_RECOVERY_MS,
  cooldownMs: ENEMY_ATTACK_COOLDOWN_MS,
  meleeRange: ENEMY_MELEE_RANGE,
  engageRange: ENEMY_ENGAGE_RANGE,
};

export interface EnemyAttackTickResult {
  phase: EnemyCombatPhase;
  /** True once when the strike frame resolves and the target is still in range. */
  dealDamage: boolean;
  /** True once when the strike frame resolves but the target left range (whiff). */
  missed: boolean;
  /** Whether locomotion chase should run this frame. */
  canMove: boolean;
  telegraphing: boolean;
}

/**
 * Per-enemy melee brain: idle/chase → windup → strike → recovery → cooldown.
 * Cooldown is instance-local (not shared across enemies).
 */
export class EnemyAttackBrain {
  private phase: EnemyCombatPhase = 'idle';
  private phaseMs = 0;
  private cooldownMs = 0;

  constructor(private readonly config: EnemyAttackConfig = DEFAULT_ENEMY_ATTACK) {}

  get state(): EnemyCombatPhase {
    return this.phase;
  }

  get cooldownRemaining(): number {
    return this.cooldownMs;
  }

  get isDead(): boolean {
    return this.phase === 'dead';
  }

  forceDead(): void {
    this.phase = 'dead';
    this.phaseMs = 0;
  }

  forceHurt(durationMs = 220): void {
    if (this.phase === 'dead') return;
    this.phase = 'hurt';
    this.phaseMs = durationMs;
  }

  reset(): void {
    this.phase = 'idle';
    this.phaseMs = 0;
    this.cooldownMs = 0;
  }

  update(deltaMs: number, self: Vec2, target: Vec2): EnemyAttackTickResult {
    if (this.phase === 'dead') {
      return this.result(false, false, false, false);
    }

    if (this.cooldownMs > 0) {
      this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs);
    }

    const dist = distance(self, target);

    if (this.phase === 'hurt') {
      this.phaseMs = Math.max(0, this.phaseMs - deltaMs);
      if (this.phaseMs <= 0) {
        this.phase = 'chase';
      }
      return this.result(false, false, false, false);
    }

    if (this.phase === 'windup') {
      this.phaseMs -= deltaMs;
      if (this.phaseMs > 0) {
        return this.result(false, false, false, true);
      }
      // Hit frame: resolve damage the instant windup completes.
      this.phase = 'attack';
      this.phaseMs = this.config.strikeMs;
      this.cooldownMs = this.config.cooldownMs;
      const inRange = dist <= this.config.meleeRange;
      return this.result(inRange, !inRange, false, false);
    }

    if (this.phase === 'attack') {
      this.phaseMs -= deltaMs;
      if (this.phaseMs <= 0) {
        this.phase = 'recovery';
        this.phaseMs = this.config.recoveryMs;
      }
      return this.result(false, false, false, false);
    }

    if (this.phase === 'recovery') {
      this.phaseMs -= deltaMs;
      if (this.phaseMs <= 0) {
        this.phase = dist <= this.config.engageRange ? 'chase' : 'idle';
      }
      return this.result(false, false, false, false);
    }

    if (this.cooldownMs <= 0 && dist <= this.config.engageRange) {
      this.phase = 'windup';
      this.phaseMs = this.config.windupMs;
      return this.result(false, false, false, true);
    }

    if (dist <= this.config.engageRange) {
      this.phase = 'chase';
      return this.result(false, false, false, false);
    }

    this.phase = dist > 0.01 ? 'chase' : 'idle';
    return this.result(false, false, true, false);
  }

  private result(
    dealDamage: boolean,
    missed: boolean,
    canMove: boolean,
    telegraphing: boolean,
  ): EnemyAttackTickResult {
    return {
      phase: this.phase,
      dealDamage,
      missed,
      canMove,
      telegraphing,
    };
  }
}
