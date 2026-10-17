/** Cap frame delta to avoid huge jumps after tab backgrounding. */
export const MAX_DELTA_MS = 50;

export function clampDeltaMs(deltaMs: number, maxMs: number = MAX_DELTA_MS): number {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return 0;
  return Math.min(deltaMs, maxMs);
}
