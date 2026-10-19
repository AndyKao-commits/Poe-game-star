import { distance, type Vec2 } from '../combat/alphaCombat';

export type AlleyObjectivePhase = 'fight' | 'reach-exit' | 'complete' | 'defeated';
export const ALLEY_EXIT = Object.freeze({ x: 430, y: 135 });
export const ALLEY_EXIT_RADIUS = 24;

export interface AlleyObjectiveState {
  phase: AlleyObjectivePhase;
  instruction: string;
  exitVisible: boolean;
  exitReached: boolean;
}

/** Chapter 1 private Alpha objective: clear the threat, then escape the alley.
 * Pure domain logic: no art assets, DOM, Phaser or release-gate dependencies.
 * Defeat takes precedence over escape and completion is terminal.
 */
export function advanceAlleyObjective(
  phase: AlleyObjectivePhase,
  player: Vec2,
  enemiesAlive: number,
  playerHp: number,
): AlleyObjectiveState {
  if (!Number.isFinite(player.x) || !Number.isFinite(player.y) ||
      !Number.isFinite(enemiesAlive) || enemiesAlive < 0 || !Number.isFinite(playerHp)) {
    throw new Error('Invalid alley objective state');
  }
  if (phase === 'complete') return {
    phase, instruction: '安全抵達巷口', exitVisible: true, exitReached: true,
  };
  if (phase === 'defeated' || playerHp <= 0) return {
    phase: 'defeated', instruction: '挑戰失敗', exitVisible: false, exitReached: false,
  };
  if (enemiesAlive > 0) return {
    phase: 'fight', instruction: `擊退攔路混混（剩餘 ${enemiesAlive} 人）`,
    exitVisible: false, exitReached: false,
  };
  const reached = distance(player, ALLEY_EXIT) <= ALLEY_EXIT_RADIUS;
  return {
    phase: reached ? 'complete' : 'reach-exit',
    instruction: reached ? '安全抵達巷口' : '前往巷口的出口標記',
    exitVisible: true,
    exitReached: reached,
  };
}
