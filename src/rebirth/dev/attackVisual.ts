/** Rebirth-owned visual timing, independent of combat damage and Phaser.
 * Animation is triggered by authoritative attack events, never by button held
 * state, so one strike cannot become an endless swing.
 */
export type AttackVisualKind = 'basic' | 'punch';
export interface AttackVisual {
  frameIndex: number;
  progress: number;
  strength: number;
  /** 0–1 silhouette displacement for a readable wind-up / follow-through. */
  lunge: number;
  /** Trail opacity peaks during the strike rather than on the first frame. */
  trailAlpha: number;
  /** Angular position of the leading slash edge, radians relative to facing. */
  sweepAngle: number;
}
export function attackVisualAt(kind: AttackVisualKind, elapsedMs: number): AttackVisual | null {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return null;
  const duration = kind === 'punch' ? 330 : 270;
  if (elapsedMs >= duration) return null;
  const progress = elapsedMs / duration;
  return {
    frameIndex: Math.min(2, Math.floor(progress * 3)),
    progress,
    strength: kind === 'punch' ? 1.5 : 1,
    lunge: Math.sin(Math.PI * progress) * (kind === 'punch' ? 1 : 0.75),
    trailAlpha: Math.min(1, progress * 7) * Math.min(1, (1 - progress) * 4),
    sweepAngle: -1.35 + progress * 2.7,
  };
}
