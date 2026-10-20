/** Keep the alley's 270-unit vertical composition while filling extra-wide
 * landscape phones with additional ORIGINAL environment tiles, not black bars.
 * Aspect is measured at boot after Safari's browser chrome has settled.
 */
export function alphaViewport(width: number, height: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Invalid Alpha viewport');
  }
  return { width: Math.max(480, Math.ceil(270 * width / height)), height: 270 };
}
