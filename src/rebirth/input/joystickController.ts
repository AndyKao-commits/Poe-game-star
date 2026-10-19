import {
  joystickVector, type JoystickConfig, type Point, type StickVector,
} from './touchControls';

/**
 * Pure multitouch controller for the Rebirth development preview.
 * Default fixed mode; floating mode is retained as an A/B experiment.
 * Neither mode is wired into the public release-gated scene.
 */
export type JoystickMode = 'fixed' | 'floating';
export interface JoystickSnapshot {
  mode: JoystickMode;
  center: Point;
  pointerId: number | null;
  stick: StickVector;
}
export interface JoystickControllerConfig extends JoystickConfig {
  captureRadius: number;
}
const ZERO: StickVector = { x: 0, y: 0, magnitude: 0 };

export class RebirthJoystickController {
  private pointerId: number | null = null;
  private center: Point;
  private stick: StickVector = { ...ZERO };

  constructor(
    private readonly fixedCenter: Point,
    private readonly config: JoystickControllerConfig,
    private mode: JoystickMode = 'fixed',
  ) {
    if (!Number.isFinite(config.captureRadius) || config.captureRadius <= 0 ||
        !Number.isFinite(config.radius) || config.radius <= 0 ||
        !Number.isFinite(config.deadZone) || config.deadZone < 0 || config.deadZone >= 1 ||
        ![fixedCenter.x, fixedCenter.y].every(Number.isFinite)) {
      throw new Error('Invalid Rebirth joystick controller configuration');
    }
    this.center = { ...fixedCenter };
  }

  /**
   * Capture the first pointer within the left-side activation zone.
   * A second finger is free to attack/cast and cannot steal the joystick.
   */
  pointerDown(id: number, point: Point): boolean {
    if (this.pointerId !== null || !Number.isInteger(id) || id < 0 ||
        ![point.x, point.y].every(Number.isFinite) ||
        Math.abs(point.x - this.fixedCenter.x) > this.config.captureRadius ||
        Math.abs(point.y - this.fixedCenter.y) > this.config.captureRadius) {
      return false;
    }
    this.pointerId = id;
    this.center = this.mode === 'floating' ? { ...point } : { ...this.fixedCenter };
    this.stick = joystickVector(this.center, point, this.config);
    return true;
  }

  pointerMove(id: number, point: Point): void {
    if (id !== this.pointerId || ![point.x, point.y].every(Number.isFinite)) return;
    this.stick = joystickVector(this.center, point, this.config);
  }

  pointerUp(id: number): void {
    if (id !== this.pointerId) return;
    this.reset();
  }

  /** Call on blur, touchcancel, orientation change or scene shutdown. */
  reset(): void {
    this.pointerId = null;
    this.center = { ...this.fixedCenter };
    this.stick = { ...ZERO };
  }

  setMode(mode: JoystickMode): void {
    if (mode !== 'fixed' && mode !== 'floating') throw new Error('Unsupported joystick mode');
    this.reset();
    this.mode = mode;
  }

  snapshot(): JoystickSnapshot {
    return {
      mode: this.mode,
      center: { ...this.center },
      pointerId: this.pointerId,
      stick: { ...this.stick },
    };
  }
}
