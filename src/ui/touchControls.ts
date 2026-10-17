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
import type { SkillId } from '@core/skills/definitions';
import type { SkillUiState } from '@core/skills/skillUi';
import type { InputController } from '../game/input/InputController';

const JOYSTICK_MAX_RADIUS_VH = 0.11;
const SKILL_BUTTONS: Array<{ id: SkillId; attr: string; label: string }> = [
  { id: 'q', attr: 'data-skill-q', label: 'Q' },
  { id: 'e', attr: 'data-skill-e', label: 'E' },
  { id: 'dodge', attr: 'data-dodge', label: '閃' },
];

export interface TouchControlsDebugState {
  movePointerId: number | null;
  moveTouchId: number | null;
  stickX: number;
  stickY: number;
  moveX: number;
  moveY: number;
  moving: boolean;
  attackHeld: boolean;
  mode: ControlVisibilityMode;
}

/**
 * DOM overlay for landscape ARPG touch controls.
 *
 * Hit zones use both Pointer Events and Touch Events: iOS Safari frequently
 * fails to deliver window-level pointermove after setPointerCapture, while
 * touchmove remains reliable. Settings chrome lives outside the fade/hide
 * visual layer so "完全隱藏" never removes the recovery control.
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
  private readonly skillButtons: Record<SkillId, HTMLButtonElement>;
  private readonly settings: HTMLElement;
  private readonly modeSelect: HTMLSelectElement;
  private readonly hint: HTMLElement;

  private movePointerId: number | null = null;
  private moveTouchId: number | null = null;
  private attackPointerId: number | null = null;
  private attackTouchId: number | null = null;
  /** Active skill contact source — blocks iOS Pointer+Touch double-cast. */
  private readonly skillHeld: Partial<Record<SkillId, 'pointer' | 'touch'>> = {};
  private lastSkillUi: SkillUiState | null = null;
  private originX = 0;
  private originY = 0;
  private stickX = 0;
  private stickY = 0;
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
  private readonly onTouchStart: (e: Event) => void;
  private readonly onTouchMove: (e: Event) => void;
  private readonly onTouchEnd: (e: Event) => void;
  private readonly onBlur: () => void;
  private readonly onVisibility: () => void;
  private readonly onModeChange: () => void;
  private readonly onSkillPointerDown: (e: Event) => void;
  private readonly onSkillPointerUp: (e: Event) => void;
  private readonly onSkillTouchStart: (e: Event) => void;
  private readonly onSkillTouchEnd: (e: Event) => void;

  constructor(
    root: HTMLElement,
    private readonly input: InputController,
  ) {
    this.root = root;
    // Hit zones first; visual chrome next; settings last so they always win hit-tests.
    this.root.innerHTML = `
      <div class="touch-layer" data-touch-layer>
        <div class="touch-hit move-zone" data-move-zone></div>
        <div class="touch-hit attack-zone" data-attack-zone></div>
        <div class="touch-visual" data-touch-visual style="transition: opacity ${CONTROL_FADE_MS}ms ease">
          <div class="touch-hint" data-touch-hint>左半移動 · 右下攻擊 · Q/E/閃可與搖桿同時操作</div>
          <div class="touch-stick" data-stick hidden>
            <div class="touch-stick-base" data-stick-base></div>
            <div class="touch-stick-knob" data-stick-knob></div>
          </div>
          <div class="touch-actions" data-actions>
            <button type="button" class="touch-skill" data-skill-q aria-label="Heavy Strike">Q</button>
            <button type="button" class="touch-skill" data-skill-e aria-label="Arc Burst">E</button>
            <button type="button" class="touch-skill" data-dodge aria-label="閃避">閃</button>
            <button type="button" class="touch-attack" data-attack aria-label="普通攻擊">攻</button>
          </div>
        </div>
        <div class="touch-settings" data-touch-settings>
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
    this.skillButtons = {
      q: this.root.querySelector('[data-skill-q]')!,
      e: this.root.querySelector('[data-skill-e]')!,
      dodge: this.root.querySelector('[data-dodge]')!,
    };
    this.settings = this.root.querySelector('[data-touch-settings]')!;
    this.modeSelect = this.root.querySelector('[data-mode]')!;
    this.hint = this.root.querySelector('[data-touch-hint]')!;

    this.onPointerDown = (e) => this.handlePointerDown(e as PointerEvent);
    this.onPointerMove = (e) => this.handlePointerMove(e as PointerEvent);
    this.onPointerUp = (e) => this.handlePointerUp(e as PointerEvent);
    this.onTouchStart = (e) => this.handleTouchStart(e as TouchEvent);
    this.onTouchMove = (e) => this.handleTouchMove(e as TouchEvent);
    this.onTouchEnd = (e) => this.handleTouchEnd(e as TouchEvent);
    this.onSkillPointerDown = (e) => this.handleSkillPointerDown(e as PointerEvent);
    this.onSkillPointerUp = (e) => this.handleSkillPointerUp(e as PointerEvent);
    this.onSkillTouchStart = (e) => this.handleSkillTouchStart(e as TouchEvent);
    this.onSkillTouchEnd = (e) => this.handleSkillTouchEnd(e as TouchEvent);
    this.onBlur = () => this.resetAllPointers();
    this.onVisibility = () => {
      if (document.hidden) this.resetAllPointers();
    };
    this.onModeChange = () => {
      this.mode = this.modeSelect.value as ControlVisibilityMode;
      this.applyOpacity(true);
    };

    const touchOpts: AddEventListenerOptions = { passive: false, capture: false };

    this.moveZone.addEventListener('pointerdown', this.onPointerDown);
    this.attackZone.addEventListener('pointerdown', this.onPointerDown);
    this.attackBtn.addEventListener('pointerdown', this.onPointerDown);
    this.moveZone.addEventListener('touchstart', this.onTouchStart, touchOpts);
    this.attackZone.addEventListener('touchstart', this.onTouchStart, touchOpts);
    this.attackBtn.addEventListener('touchstart', this.onTouchStart, touchOpts);

    for (const { id } of SKILL_BUTTONS) {
      const btn = this.skillButtons[id];
      btn.addEventListener('pointerdown', this.onSkillPointerDown);
      btn.addEventListener('pointerup', this.onSkillPointerUp);
      btn.addEventListener('pointercancel', this.onSkillPointerUp);
      btn.addEventListener('touchstart', this.onSkillTouchStart, touchOpts);
      btn.addEventListener('touchend', this.onSkillTouchEnd, touchOpts);
      btn.addEventListener('touchcancel', this.onSkillTouchEnd, touchOpts);
    }

    // Window-level move/up: pointer capture is unreliable on iOS Safari.
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('touchmove', this.onTouchMove, touchOpts);
    window.addEventListener('touchend', this.onTouchEnd, touchOpts);
    window.addEventListener('touchcancel', this.onTouchEnd, touchOpts);
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

  getDebugState(): TouchControlsDebugState {
    return {
      movePointerId: this.movePointerId,
      moveTouchId: this.moveTouchId,
      stickX: this.stickX,
      stickY: this.stickY,
      moveX: this.moveX,
      moveY: this.moveY,
      moving: this.moving,
      attackHeld: this.attackHeld,
      mode: this.mode,
    };
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

  /**
   * Refresh skill button cooldown / resource chrome from PlayerController.
   * Called once per frame from GameScene (shared file — minimal one-liner).
   */
  setSkillUi(state: SkillUiState): void {
    this.lastSkillUi = state;
    for (const { id } of SKILL_BUTTONS) {
      const btn = this.skillButtons[id];
      const remaining = state.cooldowns[id] ?? 0;
      const total = Math.max(1, state.cooldownTotal[id] ?? 1);
      const ratio = remaining > 0 ? remaining / total : 0;
      btn.style.setProperty('--cd-ratio', String(ratio));
      btn.classList.toggle('is-cooldown', remaining > 0);
      const reason = state.failReason[id];
      const noResource =
        reason === 'insufficient_mana' || reason === 'insufficient_stamina';
      btn.classList.toggle('is-no-resource', Boolean(noResource) && remaining <= 0);
      const blocked = state.dead || state.disabled || !this.enabled;
      btn.disabled = blocked;
      btn.setAttribute('aria-disabled', blocked ? 'true' : 'false');
      btn.classList.toggle('is-ready', state.canCast[id] && !blocked);
      // Match desktop HUD accessibility without blocking resource/cooldown feedback.
      const status = state.dead ? '角色已死亡'
        : blocked ? '暫時無法使用'
        : remaining > 0 ? `冷卻 ${Math.ceil(remaining / 1000)} 秒`
        : noResource ? (reason === 'insufficient_mana' ? '魔力不足' : '耐力不足')
        : '可用';
      const label = id === 'q' ? 'Heavy Strike' : id === 'e' ? 'Arc Burst' : '閃避';
      btn.setAttribute('aria-label', `${label}，${status}`);
      btn.setAttribute('data-skill-state', state.dead ? 'dead' : blocked ? 'disabled' : remaining > 0 ? 'cooldown' : noResource ? String(reason) : 'ready');
    }
  }

  /** Advance idle fade clock; call from the game loop. */
  update(deltaMs: number): void {
    if (this.disposed || !this.visible) return;
    this.interacting =
      this.hasMoveContact() || this.hasAttackContact() || Object.keys(this.skillHeld).length > 0;
    this.idleMs = advanceIdleMs(this.idleMs, deltaMs, this.interacting);
    this.applyOpacity(false);
    if (this.hintShown && this.idleMs > CONTROL_IDLE_DELAY_MS) {
      this.hint.hidden = true;
      this.hintShown = false;
    }
    if (this.lastSkillUi) {
      this.setSkillUi(this.lastSkillUi);
    }
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resetAllPointers();
    const touchOpts: AddEventListenerOptions = { passive: false, capture: false };
    this.moveZone.removeEventListener('pointerdown', this.onPointerDown);
    this.attackZone.removeEventListener('pointerdown', this.onPointerDown);
    this.attackBtn.removeEventListener('pointerdown', this.onPointerDown);
    this.moveZone.removeEventListener('touchstart', this.onTouchStart, touchOpts);
    this.attackZone.removeEventListener('touchstart', this.onTouchStart, touchOpts);
    this.attackBtn.removeEventListener('touchstart', this.onTouchStart, touchOpts);
    for (const { id } of SKILL_BUTTONS) {
      const btn = this.skillButtons[id];
      btn.removeEventListener('pointerdown', this.onSkillPointerDown);
      btn.removeEventListener('pointerup', this.onSkillPointerUp);
      btn.removeEventListener('pointercancel', this.onSkillPointerUp);
      btn.removeEventListener('touchstart', this.onSkillTouchStart, touchOpts);
      btn.removeEventListener('touchend', this.onSkillTouchEnd, touchOpts);
      btn.removeEventListener('touchcancel', this.onSkillTouchEnd, touchOpts);
    }
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('touchmove', this.onTouchMove, touchOpts);
    window.removeEventListener('touchend', this.onTouchEnd, touchOpts);
    window.removeEventListener('touchcancel', this.onTouchEnd, touchOpts);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.modeSelect.removeEventListener('change', this.onModeChange);
    this.root.innerHTML = '';
  }

  private hasMoveContact(): boolean {
    return this.movePointerId !== null || this.moveTouchId !== null;
  }

  private hasAttackContact(): boolean {
    return this.attackPointerId !== null || this.attackTouchId !== null;
  }

  private skillIdFromTarget(target: EventTarget | null): SkillId | null {
    if (!(target instanceof Element)) return null;
    if (target.closest('[data-skill-q]')) return 'q';
    if (target.closest('[data-skill-e]')) return 'e';
    if (target.closest('[data-dodge]')) return 'dodge';
    return null;
  }

  private handleSkillPointerDown(e: PointerEvent): void {
    if (!this.enabled || !this.visible) return;
    const id = this.skillIdFromTarget(e.target);
    if (!id) return;
    // Touch path already claimed this press — ignore twin pointerdown (iOS).
    if (this.skillHeld[id]) return;
    e.preventDefault();
    e.stopPropagation();
    this.skillHeld[id] = 'pointer';
    this.input.queueSkillPress(id);
    this.skillButtons[id].classList.add('is-active');
    this.markInteract();
  }

  private handleSkillPointerUp(e: PointerEvent): void {
    const id = this.skillIdFromTarget(e.target);
    if (!id) return;
    if (this.skillHeld[id] === 'pointer') {
      delete this.skillHeld[id];
      this.skillButtons[id].classList.remove('is-active');
    }
  }

  private handleSkillTouchStart(e: TouchEvent): void {
    if (!this.enabled || !this.visible) return;
    const id = this.skillIdFromTarget(e.target);
    if (!id) return;
    if (this.skillHeld[id]) return;
    e.preventDefault();
    e.stopPropagation();
    this.skillHeld[id] = 'touch';
    this.input.queueSkillPress(id);
    this.skillButtons[id].classList.add('is-active');
    this.markInteract();
  }

  private handleSkillTouchEnd(e: TouchEvent): void {
    const id = this.skillIdFromTarget(e.target);
    if (!id) return;
    if (this.skillHeld[id] === 'touch' || this.skillHeld[id] === 'pointer') {
      delete this.skillHeld[id];
      this.skillButtons[id].classList.remove('is-active');
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this.enabled || !this.visible) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-touch-settings]') || target.closest('[data-touch-mode]') || target.closest('select')) {
      return;
    }
    // Skill buttons have dedicated handlers; never treat them as attack-zone.
    if (this.skillIdFromTarget(target)) return;

    const inMove = Boolean(target.closest('[data-move-zone]'));
    const inAttack = Boolean(
      target.closest('[data-attack-zone]') || target.closest('[data-attack]'),
    );

    // On real iOS, touchstart usually wins first; ignore duplicate pointerdown.
    if (inMove && !this.hasMoveContact()) {
      e.preventDefault();
      this.movePointerId = e.pointerId;
      this.beginMove(e.clientX, e.clientY);
      try {
        this.moveZone.setPointerCapture(e.pointerId);
      } catch {
        /* iOS Safari often rejects capture; touchmove fallback covers this. */
      }
      return;
    }

    if (inAttack && !this.hasAttackContact()) {
      e.preventDefault();
      this.attackPointerId = e.pointerId;
      this.beginAttack();
      try {
        this.attackBtn.setPointerCapture(e.pointerId);
      } catch {
        try {
          this.attackZone.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (e.pointerId !== this.movePointerId) return;
    e.preventDefault();
    this.applyMoveFromClient(e.clientX, e.clientY);
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

  private handleTouchStart(e: TouchEvent): void {
    if (!this.enabled || !this.visible) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-touch-settings]') || target.closest('[data-touch-mode]') || target.closest('select')) {
      return;
    }
    if (this.skillIdFromTarget(target)) return;

    const inMove = Boolean(target.closest('[data-move-zone]'));
    const inAttack = Boolean(
      target.closest('[data-attack-zone]') || target.closest('[data-attack]'),
    );

    for (let i = 0; i < e.changedTouches.length; i += 1) {
      const touch = this.touchAt(e.changedTouches, i);
      if (!touch) continue;

      if (inMove && !this.hasMoveContact()) {
        e.preventDefault();
        this.moveTouchId = touch.identifier;
        // Drop any stale pointer twin from the same finger.
        this.movePointerId = null;
        this.beginMove(touch.clientX, touch.clientY);
        continue;
      }

      if (inAttack && !this.hasAttackContact()) {
        e.preventDefault();
        this.attackTouchId = touch.identifier;
        this.attackPointerId = null;
        this.beginAttack();
      }
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.hasMoveContact()) return;
    const touch = this.findTrackedTouch(e);
    if (!touch) return;
    e.preventDefault();
    this.applyMoveFromClient(touch.clientX, touch.clientY);
  }

  private handleTouchEnd(e: TouchEvent): void {
    let changed = false;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      const touch = this.touchAt(e.changedTouches, i);
      if (!touch) continue;

      if (this.moveTouchId !== null && touch.identifier === this.moveTouchId) {
        this.clearMove();
        changed = true;
      } else if (
        this.movePointerId !== null &&
        this.moveTouchId === null &&
        this.isLikelyMoveTouch(touch)
      ) {
        // Pointer-started move on iOS: lift arrives as touchend without matching touch id.
        this.clearMove();
        changed = true;
      }

      if (this.attackTouchId !== null && touch.identifier === this.attackTouchId) {
        this.clearAttack();
        changed = true;
      } else if (
        this.attackPointerId !== null &&
        this.attackTouchId === null &&
        this.pointInAttackZone(touch.clientX, touch.clientY)
      ) {
        this.clearAttack();
        changed = true;
      }
    }

    // Safety: if move was pointer-started and no remaining fingers are near origin, stop.
    if (
      this.hasMoveContact() &&
      this.moveTouchId === null &&
      !this.anyTouchNearOrigin(e.touches)
    ) {
      this.clearMove();
      changed = true;
    }

    if (changed) this.pushSample();
  }

  private findTrackedTouch(e: TouchEvent): Touch | null {
    const list = e.touches.length > 0 ? e.touches : e.changedTouches;
    if (this.moveTouchId !== null) {
      for (let i = 0; i < list.length; i += 1) {
        const t = this.touchAt(list, i);
        if (t && t.identifier === this.moveTouchId) return t;
      }
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const t = this.touchAt(e.changedTouches, i);
        if (t && t.identifier === this.moveTouchId) return t;
      }
      return null;
    }
    // Pointer-started move: follow the touch nearest the stick origin (iOS fallback).
    if (this.movePointerId !== null) {
      let best: Touch | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < list.length; i += 1) {
        const t = this.touchAt(list, i);
        if (!t) continue;
        if (this.attackTouchId !== null && t.identifier === this.attackTouchId) continue;
        const dist = Math.hypot(t.clientX - this.originX, t.clientY - this.originY);
        if (dist < bestDist) {
          best = t;
          bestDist = dist;
        }
      }
      if (best) {
        // Promote to touch tracking so subsequent events are stable.
        this.moveTouchId = best.identifier;
        this.movePointerId = null;
        return best;
      }
    }
    return null;
  }

  /** Support real TouchList.item and array-like test doubles. */
  private touchAt(list: TouchList, index: number): Touch | null {
    if (typeof list.item === 'function') {
      return list.item(index);
    }
    return (list as unknown as Array<Touch | undefined>)[index] ?? null;
  }

  private isLikelyMoveTouch(touch: Touch): boolean {
    return Math.hypot(touch.clientX - this.originX, touch.clientY - this.originY) < this.maxRadiusPx * 3;
  }

  private anyTouchNearOrigin(touches: TouchList): boolean {
    for (let i = 0; i < touches.length; i += 1) {
      const t = this.touchAt(touches, i);
      if (!t) continue;
      if (this.isLikelyMoveTouch(t)) return true;
    }
    return false;
  }

  private pointInAttackZone(x: number, y: number): boolean {
    const rect = this.attackZone.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  private beginMove(clientX: number, clientY: number): void {
    this.originX = clientX;
    this.originY = clientY;
    this.stickX = 0;
    this.stickY = 0;
    this.stickBase.hidden = false;
    this.stickBase.style.left = `${clientX}px`;
    this.stickBase.style.top = `${clientY}px`;
    this.stickKnob.style.transform = 'translate(-50%, -50%)';
    this.markInteract();
    this.updateMoveVector(0, 0);
    this.pushSample();
  }

  private beginAttack(): void {
    this.attackHeld = true;
    this.attackBtn.classList.add('is-active');
    this.markInteract();
    this.pushSample();
  }

  private applyMoveFromClient(clientX: number, clientY: number): void {
    const dx = clientX - this.originX;
    const dy = clientY - this.originY;
    const clamped = clampJoystickOffset(dx, dy, this.maxRadiusPx);
    this.stickX = clamped.x / this.maxRadiusPx;
    this.stickY = clamped.y / this.maxRadiusPx;
    this.stickKnob.style.transform = `translate(calc(-50% + ${clamped.x}px), calc(-50% + ${clamped.y}px))`;
    this.updateMoveVector(clamped.x, clamped.y);
    this.markInteract();
    this.pushSample();
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
    this.moveTouchId = null;
    this.moveX = 0;
    this.moveY = 0;
    this.moving = false;
    this.stickX = 0;
    this.stickY = 0;
    this.stickBase.hidden = true;
  }

  private clearAttack(): void {
    this.attackPointerId = null;
    this.attackTouchId = null;
    this.attackHeld = false;
    this.attackBtn.classList.remove('is-active');
  }

  private resetAllPointers(): void {
    this.clearMove();
    this.clearAttack();
    for (const id of Object.keys(this.skillHeld) as SkillId[]) {
      delete this.skillHeld[id];
      this.skillButtons[id]?.classList.remove('is-active');
    }
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
    // Settings chrome is outside `.touch-visual` and stays fully visible.
    if (immediate) {
      this.visual.style.transition = 'none';
      this.visual.style.opacity = String(opacity);
      void this.visual.offsetHeight;
      this.visual.style.transition = `opacity ${CONTROL_FADE_MS}ms ease`;
    } else {
      this.visual.style.opacity = String(opacity);
    }
    this.settings.hidden = false;
    this.settings.style.opacity = '1';
    this.settings.style.pointerEvents = this.enabled ? 'auto' : 'none';
  }

  private pushSample(): void {
    this.input.setTouchSample({
      moveX: this.moveX,
      moveY: this.moveY,
      moving: this.moving,
      attackHeld: this.attackHeld,
      active: this.hasMoveContact() || this.hasAttackContact(),
    });
  }
}
