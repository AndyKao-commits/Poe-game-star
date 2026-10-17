import Phaser from 'phaser';
import { idleInputState, type SharedInputState } from '@core/input/sharedState';
import { movementFromInput } from '@core/movement/direction';
import { screenToWorld, type Vec2 } from '@core/iso/coordinates';
import { isSkillId, type SkillId } from '@core/skills/definitions';

export interface TouchInputSample {
  moveX: number;
  moveY: number;
  moving: boolean;
  attackHeld: boolean;
  active: boolean;
}

/**
 * Unifies desktop (WASD + mouse + Q/E/Space) and mobile overlay into one sample
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
  /** Deduped edge presses from touch / synthetic sources until the next sample(). */
  private pendingSkillPresses: SkillId[] = [];
  /** Previous-frame key downs for reliable edge detection (JustDown can miss short taps). */
  private prevSkillDown: Record<SkillId, boolean> = {
    q: false,
    e: false,
    dodge: false,
  };
  private readonly cursors: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private readonly skillKeys: {
    q: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    dodge: Phaser.Input.Keyboard.Key;
    dodgeAlt: Phaser.Input.Keyboard.Key;
  };

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard!;
    this.cursors = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.skillKeys = {
      q: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      e: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      dodge: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      dodgeAlt: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearTouch();
      this.pendingSkillPresses = [];
      this.prevSkillDown = { q: false, e: false, dodge: false };
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Called by TouchControlsOverlay on pointer changes. */
  setTouchSample(sample: TouchInputSample): void {
    this.touch = { ...sample };
  }

  /**
   * Queue a one-shot skill press (touch button). Duplicate ids in the same
   * sample window are ignored so iOS Pointer+Touch pairs cannot double-cast.
   */
  queueSkillPress(skillId: SkillId | string): void {
    if (!this.enabled) return;
    if (!isSkillId(skillId)) return;
    if (this.pendingSkillPresses.includes(skillId)) return;
    this.pendingSkillPresses.push(skillId);
  }

  clearTouch(): void {
    this.touch = {
      moveX: 0,
      moveY: 0,
      moving: false,
      attackHeld: false,
      active: false,
    };
    this.pendingSkillPresses = [];
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
    const mouseAttack =
      !this.touch.attackHeld &&
      pointer.leftButtonDown() &&
      pointer.wasTouch !== true;

    const moving = this.touch.moving || keyMove.moving;
    const moveX = this.touch.moving ? this.touch.moveX : keyMove.x;
    const moveY = this.touch.moving ? this.touch.moveY : keyMove.y;

    const skillPresses = this.collectSkillPresses();

    return {
      moveX,
      moveY,
      moving,
      attackHeld: this.touch.attackHeld || mouseAttack,
      // Desktop mouse aim is resolved via sampleMouseWorld(); touch uses auto-aim.
      aimAngle: null,
      touchActive: this.touch.active,
      skillPresses,
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

  private collectSkillPresses(): SkillId[] {
    const presses: SkillId[] = [...this.pendingSkillPresses];
    this.pendingSkillPresses = [];

    const qDown = this.skillKeys.q.isDown;
    const eDown = this.skillKeys.e.isDown;
    const dodgeDown = this.skillKeys.dodge.isDown || this.skillKeys.dodgeAlt.isDown;

    if (qDown && !this.prevSkillDown.q && !presses.includes('q')) presses.push('q');
    if (eDown && !this.prevSkillDown.e && !presses.includes('e')) presses.push('e');
    if (dodgeDown && !this.prevSkillDown.dodge && !presses.includes('dodge')) {
      presses.push('dodge');
    }

    this.prevSkillDown = { q: qDown, e: eDown, dodge: dodgeDown };
    return presses;
  }
}
