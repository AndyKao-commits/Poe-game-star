import { distance, type Vec2 } from '../combat/alphaCombat';
import type { AlleyObjectivePhase } from './alleyObjective';

/** The existing ENV-01 drain tile at grid (8,5) is the inspection landmark.
 * We do not invent an art prop: the interaction is contextual text on original ground.
 */
export const ALLEY_CLUE_POSITION: Readonly<Vec2> = Object.freeze({ x: 272, y: 176 });
export const ALLEY_CLUE_RADIUS = 30;

export interface AlleyClueState {
  discovered: boolean;
  justDiscovered: boolean;
  nearby: boolean;
  hint: string | null;
}

export function inspectAlleyClue(
  player: Vec2, phase: AlleyObjectivePhase, discovered: boolean,
): AlleyClueState {
  if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) {
    throw new Error('Invalid alley clue position');
  }
  const nearby = distance(player, ALLEY_CLUE_POSITION) <= ALLEY_CLUE_RADIUS;
  const justDiscovered = nearby && phase === 'reach-exit' && !discovered;
  const found = discovered || justDiscovered;
  return {
    discovered: found,
    justDiscovered,
    nearby,
    hint: justDiscovered
      ? '排水溝旁的燒焦標籤：B2 停車場／增幅器'
      : found ? '線索已記錄：B2 停車場' : null,
  };
}
