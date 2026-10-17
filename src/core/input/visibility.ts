export type ControlVisibilityMode = 'fade' | 'hidden' | 'always';

export const CONTROL_ACTIVE_OPACITY = 0.75;
export const CONTROL_IDLE_OPACITY = 0.15;
export const CONTROL_IDLE_DELAY_MS = 3000;
export const CONTROL_FADE_MS = 250;

export interface ControlVisibilityState {
  mode: ControlVisibilityMode;
  /** Time since last interaction (ms). */
  idleMs: number;
  interacting: boolean;
}

/** Pure opacity target for touch overlays. Interaction is never gated by opacity. */
export function resolveControlOpacity(state: ControlVisibilityState): number {
  switch (state.mode) {
    case 'always':
      return CONTROL_ACTIVE_OPACITY;
    case 'hidden':
      return 0;
    case 'fade':
    default:
      if (state.interacting || state.idleMs < CONTROL_IDLE_DELAY_MS) {
        return CONTROL_ACTIVE_OPACITY;
      }
      return CONTROL_IDLE_OPACITY;
  }
}

export function advanceIdleMs(
  idleMs: number,
  deltaMs: number,
  interacting: boolean,
): number {
  if (interacting) return 0;
  return idleMs + Math.max(0, deltaMs);
}
