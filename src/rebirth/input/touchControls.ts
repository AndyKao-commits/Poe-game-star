/**
 * Rebirth mobile landscape controls: pure, testable input math.
 * No Phaser, DOM, legacy game code or provisional artwork dependency.
 * Gameplay remains gated until T04 art + mobile QA.
 */
export interface Point { x: number; y: number }
export interface StickVector extends Point { magnitude: number }
export interface JoystickConfig {
  radius: number;
  deadZone: number; // normalized, [0,1)
}
export interface TouchControlLayout {
  joystickCenter: Point;
  joystickRadius: number;
  basicAttackCenter: Point;
  skillOneCenter: Point;
  skillTwoCenter: Point;
  actionRadius: number;
}

export const DEFAULT_JOYSTICK: Readonly<JoystickConfig> = Object.freeze({
  radius: 56,
  deadZone: 0.16,
});

export function joystickVector(
  center: Point,
  pointer: Point,
  config: JoystickConfig = DEFAULT_JOYSTICK,
): StickVector {
  if (!Number.isFinite(config.radius) || config.radius <= 0 ||
      !Number.isFinite(config.deadZone) || config.deadZone < 0 || config.deadZone >= 1 ||
      ![center.x, center.y, pointer.x, pointer.y].every(Number.isFinite)) {
    throw new Error('Invalid Rebirth joystick input');
  }
  const dx = pointer.x - center.x;
  const dy = pointer.y - center.y;
  const length = Math.hypot(dx, dy);
  const normalized = Math.min(1, length / config.radius);
  if (normalized <= config.deadZone || length === 0) {
    return { x: 0, y: 0, magnitude: 0 };
  }
  const magnitude = (normalized - config.deadZone) / (1 - config.deadZone);
  return {
    x: (dx / length) * magnitude,
    y: (dy / length) * magnitude,
    magnitude,
  };
}

/** Converts an analog stick to velocity without diagonal speed advantage. */
export function movementVelocity(stick: StickVector, speed = 150): Point {
  if (!Number.isFinite(speed) || speed < 0 ||
      ![stick.x, stick.y, stick.magnitude].every(Number.isFinite)) {
    throw new Error('Invalid Rebirth movement velocity');
  }
  const length = Math.hypot(stick.x, stick.y);
  if (length === 0) return { x: 0, y: 0 };
  const strength = Math.min(1, Math.max(0, stick.magnitude));
  return { x: stick.x / length * strength * speed, y: stick.y / length * strength * speed };
}

/**
 * Virtual controls are sized and positioned in CSS viewport pixels.
 * safeInsets account for device cutouts; layout is not tied to art assets.
 */
export function touchControlLayout(
  viewportWidth: number,
  viewportHeight: number,
  safeInsets: { left: number; right: number; bottom: number },
): TouchControlLayout {
  if (![viewportWidth, viewportHeight, safeInsets.left, safeInsets.right, safeInsets.bottom]
    .every(Number.isFinite) ||
    viewportWidth <= 0 || viewportHeight <= 0 ||
    Math.min(safeInsets.left, safeInsets.right, safeInsets.bottom) < 0 ||
    safeInsets.left + safeInsets.right >= viewportWidth ||
    safeInsets.bottom >= viewportHeight) {
    throw new Error('Invalid Rebirth viewport or safe insets');
  }
  const margin = 20;
  const radius = Math.min(56, Math.max(28, viewportHeight * 0.13));
  const actionRadius = Math.min(32, Math.max(20, viewportHeight * 0.065));
  const bottom = viewportHeight - safeInsets.bottom - margin;
  const right = viewportWidth - safeInsets.right - margin;
  return {
    joystickCenter: { x: safeInsets.left + margin + radius, y: bottom - radius },
    joystickRadius: radius,
    basicAttackCenter: { x: right - actionRadius, y: bottom - actionRadius },
    skillOneCenter: { x: right - actionRadius * 3.2, y: bottom - actionRadius * 1.1 },
    skillTwoCenter: { x: right - actionRadius * 1.1, y: bottom - actionRadius * 3.2 },
    actionRadius,
  };
}
