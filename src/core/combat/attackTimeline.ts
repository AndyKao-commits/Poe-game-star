import { ATTACK_COOLDOWN_MS } from './attackCone';

/** How long movement is locked after starting an attack (configurable). */
export const ATTACK_MOVE_LOCK_MS = 280;

/** Elapsed time into the attack when damage is resolved. */
export const ATTACK_HIT_FRAME_MS = 120;

/** Total attack animation / action length before returning to idle/run. */
export const ATTACK_ACTION_MS = 320;

export { ATTACK_COOLDOWN_MS };

export interface AttackTimelineConfig {
  moveLockMs: number;
  hitFrameMs: number;
  actionMs: number;
}

export const DEFAULT_ATTACK_TIMELINE: AttackTimelineConfig = {
  moveLockMs: ATTACK_MOVE_LOCK_MS,
  hitFrameMs: ATTACK_HIT_FRAME_MS,
  actionMs: ATTACK_ACTION_MS,
};

export type AttackTimelineEvent = 'none' | 'hit' | 'finished';

/**
 * Tracks a single player attack action so hit resolution stays synced
 * with the animation hit frame (not the press instant).
 */
export class AttackTimeline {
  private elapsedMs = 0;
  private active = false;
  private hitFired = false;
  private aimAngle = 0;

  constructor(private readonly config: AttackTimelineConfig = DEFAULT_ATTACK_TIMELINE) {}

  get isActive(): boolean {
    return this.active;
  }

  get moveLocked(): boolean {
    return this.active && this.elapsedMs < this.config.moveLockMs;
  }

  get currentAimAngle(): number {
    return this.aimAngle;
  }

  get hitFrameMs(): number {
    return this.config.hitFrameMs;
  }

  get moveLockMs(): number {
    return this.config.moveLockMs;
  }

  /** Begin a new attack. Returns false if one is already in progress. */
  tryBegin(aimAngle: number): boolean {
    if (this.active) return false;
    this.active = true;
    this.elapsedMs = 0;
    this.hitFired = false;
    this.aimAngle = aimAngle;
    return true;
  }

  /**
   * Advance the timeline. Emits `hit` exactly once when crossing the hit frame,
   * then `finished` when the action ends.
   */
  update(deltaMs: number): AttackTimelineEvent {
    if (!this.active) return 'none';
    const prev = this.elapsedMs;
    this.elapsedMs += deltaMs;

    let event: AttackTimelineEvent = 'none';
    if (!this.hitFired && prev < this.config.hitFrameMs && this.elapsedMs >= this.config.hitFrameMs) {
      this.hitFired = true;
      event = 'hit';
    }

    if (this.elapsedMs >= this.config.actionMs) {
      this.active = false;
      this.elapsedMs = 0;
      // Prefer reporting the hit on the same frame it lands; finished is implied by !isActive
      return event === 'hit' ? 'hit' : 'finished';
    }

    return event;
  }

  reset(): void {
    this.active = false;
    this.elapsedMs = 0;
    this.hitFired = false;
    this.aimAngle = 0;
  }
}
