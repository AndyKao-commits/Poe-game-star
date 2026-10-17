import {
  createPlayerStats,
  type CombatStats,
} from '../combat/damage';
import type { Vec2 } from '../iso/coordinates';

export type PlayerLifeState = 'alive' | 'dead';

export interface PlayerSnapshot {
  stats: CombatStats;
  position: Vec2;
  life: PlayerLifeState;
}

/**
 * Pure death / respawn gate. Controllers consult this before accepting input.
 */
export class PlayerLifecycle {
  private life: PlayerLifeState = 'alive';
  private deathEventEmitted = false;

  get state(): PlayerLifeState {
    return this.life;
  }

  get isDead(): boolean {
    return this.life === 'dead';
  }

  get canMove(): boolean {
    return this.life === 'alive';
  }

  get canAttack(): boolean {
    return this.life === 'alive';
  }

  /** Returns true only on the first transition into dead. */
  tryDie(stats: CombatStats): boolean {
    if (this.life === 'dead' || stats.hp > 0) return false;
    this.life = 'dead';
    this.deathEventEmitted = true;
    return true;
  }

  /** Consume one-shot death notification for HUD / scene. */
  consumeDeathEvent(): boolean {
    if (!this.deathEventEmitted) return false;
    this.deathEventEmitted = false;
    return true;
  }

  /**
   * Restore combat vitals and clear dead flag.
   * Returns fresh stats + spawn position for the controller to apply.
   */
  respawn(spawn: Vec2): { stats: CombatStats; position: Vec2 } {
    this.life = 'alive';
    this.deathEventEmitted = false;
    return {
      stats: createPlayerStats(),
      position: { ...spawn },
    };
  }
}
