export interface DashVisual {
  progress: number;
  alpha: number;
  trailLength: number;
}

/** Short, readable afterimage timing for the instant-movement skill. */
export function dashVisualAt(elapsedMs: number): DashVisual | null {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs >= 260) return null;
  const progress = elapsedMs / 260;
  return {
    progress,
    alpha: Math.min(1, progress * 8) * Math.min(1, (1 - progress) * 3),
    trailLength: 18 + 18 * Math.sin(Math.PI * progress),
  };
}
