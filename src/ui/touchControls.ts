import {
  clampJoystickOffset,
  JOYSTICK_DEAD_ZONE,
  screenDeltaToWorldMove,
} from '@core/input/screenToIsoMove';
import {
  advanceIdleMs,
  CONTROL_FADE_MS,
  CONTROL_IDLE_DELAY_MS,
  resolveControlOpacity,
  type ControlVisibilityMode,
} from '@core/input/visibility';
import type { InputController } from '../game/input/InputController';

const JOYSTICK_MAX_RADIUS_VH = 0.11;

/**
 * DOM overlay for landscape ARPG touch controls.
 * Hit zones sit under interactive chrome (attack button, mode select).
 */
export class TouchControlsOverlay {
  private readonly root: HTMLElement;
  private readonly layer: HTMLElement;
  private readonly visual: HTMLElement;
  private readonly moveZone: HTMLElement;
  private readonly stickBase: HTMLElement;
  private readonly stickKnob: HTMLElement;
  private readonly attackBtn: HTMLButtonElement;
  private readonly attackZone: HTMLElement;
  private readonly modeSelect: HTMLSelectElement;
  private readonly hint: HTMLElement;

  private movePointerId: number | null = null;
  private attackPointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private moveX = 0;
  private moveY = 0;
  private moving = false;
  private attackHeld = false;
  private idleMs = 0;
  private interacting = false;
  private mode: ControlVisibilityMode = 'fade';
  private enabled = true;
  private visible = true;
  private disposed = false;
  private hintShown = true;
  private maxRadiusPx = 48;
  private lastOpacity = -1;

  private readonly onPointerDown: (e: Event) => void;
  private readonly onPointerMove: (e: Event) => void;
  private readonly onPointerUp: (e: Event) => void;
  private readonly onBlur: () => void;
  private readonly onVisibility: () => void;
  private readonly onModeChange: () => void;

  constructor(
    root: HTMLElement,
    private readonly input: InputController,
  ) {
    this.root = root;
    // Hit zones first (z-index lower); visual chrome later so buttons/select win hit-tests.
    this.root.innerHTML = `
      <div class="touch-layer" data-touch-layer>
        <div class="touch-hit move-zone" data-move-zone></div>
        <div class="touch-hit attack-zone" data-attack-zone></div>
        <div class="touch-visual" data-touch-visual style="transition: opacity ${CONTROL_FADE_MS}ms ease">
          <div class="touch-hint" data-touch-hint>左半拖曳移動 · 右下攻擊 · 可與移動同時操作</div>
          <div class="touch-stick" data-stick hidden>
            <div class="touch-stick-base" data-stick-base></div>
            <div class="touch-stick-knob" data-stick-knob></div>
          </div>
          <div class="touch-actions" data-actions>
            <button type="button" class="touch-skill is-locked" data-skill-q disabled aria-disabled="true">Q</button>
            <button type="button" class="touch-skill is-locked" data-skill-e disabled aria-disabled="true">E</button>
            <button type="button" class="touch-skill is-locked" data-dodge disabled aria-disabled="true">閃</button>
            <button type="button" class="touch-attack" data-attack aria-label="普通攻擊">攻</button>
          </div>
          <label class="touch-mode" data-touch-mode>
            顯示
            <select data-mode>
              <option value="fade">淡出提示</option>
              <option value="hidden">完全隱藏</option>
              <option value="always">永遠顯示</option>
            </select>
          </label>
        </div>
      </div>
    `;

    this.layer = this.root.querySelector('[data-touch-layer]')!;
    this.visual = this.root.querySelector('[data-touch-visual]')!;
    this.moveZone = this.root.querySelector('[data-move-zone]')!;
    this.stickBase = this.root.querySelector('[data-stick]')!;
    this.stickKnob = this.root.querySelector('[data-stick-knob]')!;
    this.attackBtn = this.root.querySelector('[data-attack]')!;
    this.attackZone = this.root.querySelector('[data-attack-zone]')!;
    this.modeSelect = this.root.querySelector('[data-mode]')!;
    this.hint = this.root.querySelector('[data-touch-hint]')!;

    this.onPointerDown = (e) => this.handlePointerDown(e as PointerEvent);
    this.onPointerMove = (e) => this.handlePointerMove(e as PointerEvent);
    this.onPointerUp = (e) => this.handlePointerUp(e as PointerEvent);
    this.onBlur = () => this.resetAllPointers();
    this.onVisibility = () => {
      if (document.hidden) this.resetAllPointers();
    };
    this.onModeChange = () => {
      this.mode = this.modeSelect.value as ControlVisibilityMode;
      this.applyOpacity(true);
    };

    this.moveZone.addEventListener('pointerdown', this.onPointerDown);
    this.attackZone.addEventListener('pointerdown', this.onPointerDown);
    this.attackBtn.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.modeSelect.addEventListener('change', this.onModeChange);

    this.layout();
    this.applyOpacity(true);
    this.pushSample();
  }

  get isVisible(): boolean {
    return this.visible && !this.root.hidden;
  }

  get currentMode(): ControlVisibilityMode {
    return this.mode;
  }

  setVisible(visible: boolean): void {
    if (this.visible === visible && this.root.hidden === !visible) {
      if (!visible) this.resetAllPointers();
      return;
    }
    this.visible = visible;
    this.root.hidden = !visible;
    if (!visible) {
      this.resetAllPointers();
    }
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) {
      if (!enabled) this.resetAllPointers();
      return;
    }
    this.enabled = enabled;
    this.layer.classList.toggle('is-disabled', !enabled);
    if (!enabled) {
      this.resetAllPointers();
    }
  }

  layout(): void {
    const h = window.innerHeight || 1;
    this.maxRadiusPx = Math.max(36, Math.min(72, h * JOYSTICK_MAX_RADIUS_VH));
  }

  /** Advance idle fade clock; call from the game loop. */
  update(deltaMs: number): void {
    if (this.disposed || !this.visible) return;
    this.interacting = this.movePointerId !== null || this.attackPointerId !== null;
    this.idleMs = advanceIdleMs(this.idleMs, deltaMs, this.interacting);
    this.applyOpacity(false);
    if (this.hintShown && this.idleMs > CONTROL_IDLE_DELAY_MS) {
      this.hint.hidden = true;
      this.hintShown = false;
    }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resetAllPointers();
    this.moveZone.removeEventListener('pointerdown', this.onPointerDown);
    this.attackZone.removeEventListener('pointerdown', this.onPointerDown);
    this.attackBtn.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.modeSelect.removeEventListener('change', this.onModeChange);
    this.root.innerHTML = '';
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this.enabled || !this.visible) return;
    const target = e.target as HTMLElement;
    // Never steal events from the visibility mode control
    if (target.closest('[data-touch-mode]') || target.closest('select')) return;

    const inMove = Boolean(target.closest('[data-move-zone]'));
    const inAttack = Boolean(
      target.closest('[data-attack-zone]') || target.closest('[data-attack]'),
    );

    if (inMove && this.movePointerId === null) {
      e.preventDefault();
      this.movePointerId = e.pointerId;
      this.originX = e.clientX;
      this.originY = e.clientY;
      this.stickBase.hidden = false;
      this.stickBase.style.left = `${e.clientX}px`;
      this.stickBase.style.top = `${e.clientY}px`;
      this.stickKnob.style.transform = 'translate(-50%, -50%)';
      try {
        this.moveZone.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      this.markInteract();
      this.updateMoveVector(0, 0);
      this.pushSample();
      return;
    }

    if (inAttack && this.attackPointerId === null) {
      e.preventDefault();
      this.attackPointerId = e.pointerId;
      this.attackHeld = true;
      this.attackBtn.classList.add('is-active');
      try {
        this.attackBtn.setPointerCapture(e.pointerId);
      } catch {
        try {
          this.attackZone.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      this.markInteract();
      this.pushSample();
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (e.pointerId !== this.movePointerId) return;
    e.preventDefault();
    const dx = e.clientX - this.originX;
    const dy = e.clientY - this.originY;
    const clamped = clampJoystickOffset(dx, dy, this.maxRadiusPx);
    this.stickKnob.style.transform = `translate(calc(-50% + ${clamped.x}px), calc(-50% + ${clamped.y}px))`;
    this.updateMoveVector(clamped.x, clamped.y);
    this.markInteract();
    this.pushSample();
  }

  private handlePointerUp(e: PointerEvent): void {
    if (e.pointerId === this.movePointerId) {
      this.clearMove();
      this.pushSample();
    }
    if (e.pointerId === this.attackPointerId) {
      this.clearAttack();
      this.pushSample();
    }
  }

  private updateMoveVector(dx: number, dy: number): void {
    const normX = dx / this.maxRadiusPx;
    const normY = dy / this.maxRadiusPx;
    const world = screenDeltaToWorldMove(normX, normY, {
      analog: true,
      deadZone: JOYSTICK_DEAD_ZONE,
    });
    this.moveX = world.x;
    this.moveY = world.y;
    this.moving = world.moving;
  }

  private clearMove(): void {
    this.movePointerId = null;
    this.moveX = 0;
    this.moveY = 0;
    this.moving = false;
    this.stickBase.hidden = true;
  }

  private clearAttack(): void {
    this.attackPointerId = null;
    this.attackHeld = false;
    this.attackBtn.classList.remove('is-active');
  }

  private resetAllPointers(): void {
    this.clearMove();
    this.clearAttack();
    this.pushSample();
  }

  private markInteract(): void {
    this.interacting = true;
    this.idleMs = 0;
    this.hint.hidden = true;
    this.hintShown = false;
    this.applyOpacity(true);
  }

  private applyOpacity(immediate: boolean): void {
    const opacity = resolveControlOpacity({
      mode: this.mode,
      idleMs: this.idleMs,
      interacting: this.interacting,
    });
    if (!immediate && opacity === this.lastOpacity) return;
    this.lastOpacity = opacity;
    if (immediate) {
      this.visual.style.transition = 'none';
      this.visual.style.opacity = String(opacity);
      void this.visual.offsetHeight;
      this.visual.style.transition = `opacity ${CONTROL_FADE_MS}ms ease`;
    } else {
      this.visual.style.opacity = String(opacity);
    }
  }

  private pushSample(): void {
    this.input.setTouchSample({
      moveX: this.moveX,
      moveY: this.moveY,
      moving: this.moving,
      attackHeld: this.attackHeld,
      active: this.movePointerId !== null || this.attackPointerId !== null,
    });
  }
}
