import Phaser from 'phaser';
import { idleInputState, type SharedInputState } from '@core/input/sharedState';
import { movementFromInput } from '@core/movement/direction';
import { screenToWorld, type Vec2 } from '@core/iso/coordinates';

export interface TouchInputSample {
  moveX: number;
  moveY: number;
  moving: boolean;
  attackHeld: boolean;
  active: boolean;
}

/**
 * Unifies desktop (WASD + mouse) and mobile overlay into one sample
 * consumed by PlayerController. Touch UI pushes samples; keyboard is polled.
 */
export class InputController {
  private touch: TouchInputSample = {
    moveX: 0,
    moveY: 0,
    moving: false,
    attackHeld: false,
    active: false,
  };
  private enabled = true;
  /** After modal close, ignore attack until the pointer is fully released. */
  private suppressAttackUntilRelease = false;
  private readonly cursors: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard!;
    this.cursors = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearTouch();
      this.suppressAttackUntilRelease = true;
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Called by TouchControlsOverlay on pointer changes. */
  setTouchSample(sample: TouchInputSample): void {
    this.touch = { ...sample };
  }

  clearTouch(): void {
    this.touch = {
      moveX: 0,
      moveY: 0,
      moving: false,
      attackHeld: false,
      active: false,
    };
  }

  sample(): SharedInputState {
    if (!this.enabled) {
      return idleInputState();
    }

    const keyMove = movementFromInput({
      up: this.cursors.up.isDown,
      down: this.cursors.down.isDown,
      left: this.cursors.left.isDown,
      right: this.cursors.right.isDown,
    });

    const pointer = this.scene.input.activePointer;
    const mouseDown =
      pointer.leftButtonDown() && pointer.wasTouch !== true;
    if (this.suppressAttackUntilRelease) {
      const touchAttacking = this.touch.attackHeld;
      if (!mouseDown && !touchAttacking) {
        this.suppressAttackUntilRelease = false;
      }
    }
    const mouseAttack =
      !this.suppressAttackUntilRelease &&
      !this.touch.attackHeld &&
      mouseDown;
    const touchAttack =
      !this.suppressAttackUntilRelease && this.touch.attackHeld;

    const moving = this.touch.moving || keyMove.moving;
    const moveX = this.touch.moving ? this.touch.moveX : keyMove.x;
    const moveY = this.touch.moving ? this.touch.moveY : keyMove.y;

    return {
      moveX,
      moveY,
      moving,
      attackHeld: touchAttack || mouseAttack,
      // Desktop mouse aim is resolved via sampleMouseWorld(); touch uses auto-aim.
      aimAngle: null,
      touchActive: this.touch.active,
    };
  }

  /** Desktop mouse cursor in world tile space, or null when touch-attacking. */
  sampleMouseWorld(): Vec2 | null {
    if (!this.enabled || this.touch.attackHeld) return null;
    const cam = this.scene.cameras.main;
    const pointer = this.scene.input.activePointer;
    if (pointer.wasTouch) return null;
    const screen = {
      x: pointer.worldX,
      y: pointer.worldY,
    };
    if (!Number.isFinite(screen.x) || !Number.isFinite(screen.y)) {
      screen.x = pointer.x / cam.zoom + cam.scrollX;
      screen.y = pointer.y / cam.zoom + cam.scrollY;
    }
    return screenToWorld(screen);
  }

  destroy(): void {
    this.clearTouch();
  }
}
