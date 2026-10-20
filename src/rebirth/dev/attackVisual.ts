/** Rebirth-owned visual timing, independent of combat damage and Phaser.
 * Animation is triggered by authoritative attack events, never by button held
 * state, so one strike cannot become an endless swing.
 */
export type AttackVisualKind = 'basic' | 'punch';
export interface AttackVisual {
  frameIndex: number;
  progress: number;
  strength: number;
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
  };
}
