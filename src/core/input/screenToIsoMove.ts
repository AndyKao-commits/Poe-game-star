import { TILE_HEIGHT, TILE_WIDTH } from '../iso/coordinates';

export const JOYSTICK_DEAD_ZONE = 0.12;

/**
 * Convert a screen-space drag vector into an isometric world move.
 * Direction follows screen→iso mapping; magnitude can be analog (0..1).
 */
export function screenDeltaToWorldMove(
  screenDx: number,
  screenDy: number,
  options: { analog?: boolean; deadZone?: number } = {},
): { x: number; y: number; moving: boolean; intensity: number } {
  if (screenDx === 0 && screenDy === 0) {
    return { x: 0, y: 0, moving: false, intensity: 0 };
  }

  const deadZone = options.deadZone ?? JOYSTICK_DEAD_ZONE;
  const screenMag = Math.hypot(screenDx, screenDy);
  const intensity = options.analog === false ? 1 : joystickIntensity(screenMag, deadZone);
  if (intensity <= 0) {
    return { x: 0, y: 0, moving: false, intensity: 0 };
  }

  // Differentials of screenToWorld (inverse of worldToScreen)
  let wx = screenDx / TILE_WIDTH + screenDy / TILE_HEIGHT;
  let wy = screenDy / TILE_HEIGHT - screenDx / TILE_WIDTH;
  const len = Math.hypot(wx, wy);
  if (len < 1e-8) {
    return { x: 0, y: 0, moving: false, intensity: 0 };
  }
  // Unit direction × analog intensity (full deflection = original max speed)
  return {
    x: (wx / len) * intensity,
    y: (wy / len) * intensity,
    moving: true,
    intensity,
  };
}

/**
 * Map normalized stick magnitude to 0..1 after a dead zone.
 * mag <= deadZone → 0; mag >= 1 → 1; linear in between.
 */
export function joystickIntensity(magnitude: number, deadZone = JOYSTICK_DEAD_ZONE): number {
  if (magnitude <= deadZone) return 0;
  if (magnitude >= 1) return 1;
  return (magnitude - deadZone) / (1 - deadZone);
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
