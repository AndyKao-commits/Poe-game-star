export interface SharedInputState {
  /** Normalized world-space move vector. */
  moveX: number;
  moveY: number;
  moving: boolean;
  /** True while attack is held (mouse or touch). */
  attackHeld: boolean;
  /**
   * World aim angle when provided by desktop mouse.
   * Touch leaves this null so combat can auto-aim.
   */
  aimAngle: number | null;
  /** True when the active move/attack came from touch this frame. */
  touchActive: boolean;
}

export function idleInputState(): SharedInputState {
  return {
    moveX: 0,
    moveY: 0,
    moving: false,
    attackHeld: false,
    aimAngle: null,
    touchActive: false,
  };
}
