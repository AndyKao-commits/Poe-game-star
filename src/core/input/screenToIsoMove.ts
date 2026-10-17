import { TILE_HEIGHT, TILE_WIDTH } from '../iso/coordinates';

/**
 * Convert a screen-space drag vector into a normalized isometric world move.
 * Dragging right/up on screen should move the character visually that way.
 */
export function screenDeltaToWorldMove(
  screenDx: number,
  screenDy: number,
): { x: number; y: number; moving: boolean } {
  if (screenDx === 0 && screenDy === 0) {
    return { x: 0, y: 0, moving: false };
  }

  // Differentials of screenToWorld (inverse of worldToScreen)
  let wx = screenDx / TILE_WIDTH + screenDy / TILE_HEIGHT;
  let wy = screenDy / TILE_HEIGHT - screenDx / TILE_WIDTH;
  const len = Math.hypot(wx, wy);
  if (len < 1e-8) {
    return { x: 0, y: 0, moving: false };
  }
  return { x: wx / len, y: wy / len, moving: true };
}

/** Clamp joystick knob offset to a max radius. */
export function clampJoystickOffset(
  dx: number,
  dy: number,
  maxRadius: number,
): { x: number; y: number; magnitude: number } {
  const mag = Math.hypot(dx, dy);
  if (mag <= maxRadius || mag < 1e-8) {
    return { x: dx, y: dy, magnitude: mag };
  }
  const scale = maxRadius / mag;
  return { x: dx * scale, y: dy * scale, magnitude: maxRadius };
}
