import { RebirthJoystickController } from '../input/joystickController';
import { RebirthJoystickPointerAdapter } from '../input/joystickPointerAdapter';
import { touchControlLayout, type StickVector } from '../input/touchControls';

export interface MobileCombatControls {
  surface: HTMLElement;
  joystickBase: HTMLElement;
  joystickKnob: HTMLElement;
  attack: HTMLButtonElement;
  punch: HTMLButtonElement;
  dash: HTMLButtonElement;
}
export interface MobileCombatSink {
  setInput(stick: StickVector, basicHeld: boolean): void;
  punch(): void;
  dash(): void;
  basicTap(): void;
  resetInput(): void;
}
type ActionName = 'attack' | 'punch' | 'dash';
const ZERO: StickVector = { x: 0, y: 0, magnitude: 0 };

/**
 * Input-only HUD wiring for the first approved-art Phaser scene.
 * Does not create/draw any placeholder art and is not enabled in the
 * release-gated game. Caller owns actual HUD markup and presentation.
 */
export class RebirthMobileCombatBridge {
  private controller: RebirthJoystickController | null = null;
  private adapter: RebirthJoystickPointerAdapter | null = null;
  private stick: StickVector = { ...ZERO };
  private attackOwners = new Set<number>();
  private actionOwners = new Map<number, ActionName>();
  private disposed = false;
  private readonly listeners: Array<() => void> = [];

  constructor(
    private readonly controls: MobileCombatControls,
    private readonly sink: MobileCombatSink,
    private readonly win: Window = window,
    private readonly doc: Document = document,
  ) {
    controls.surface.style.touchAction = 'none';
    for (const visual of [controls.joystickBase, controls.joystickKnob]) {
      visual.style.pointerEvents = 'none';
      visual.setAttribute('aria-hidden', 'true');
    }
    for (const button of [controls.attack, controls.punch, controls.dash]) {
      button.style.touchAction = 'none';
    }
    this.installSafariGestureGuard();
    this.installAction('attack', controls.attack);
    this.installAction('punch', controls.punch);
    this.installAction('dash', controls.dash);
    this.listen(win, 'resize', () => this.layout());
    this.listen(win, 'orientationchange', () => this.layout());
    this.listen(win, 'blur', () => this.reset());
    this.listen(doc, 'visibilitychange', () => {
      if (doc.visibilityState === 'hidden') this.reset();
    });
    this.layout();
  }

  /** iOS Safari may interpret rapid attack taps as double-tap-to-zoom despite
   * touch-action:none on a child button. Cancel native gestures only over the
   * live game surface / combat controls, leaving page and retry UI accessible.
   * Non-passive capture is essential: pointerdown.preventDefault alone is not
   * sufficient on older Safari versions.
   */
  private installSafariGestureGuard(): void {
    const isCombatTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof Node)) return false;
      return target === this.controls.surface ||
        this.controls.surface.contains(target) ||
        [this.controls.attack, this.controls.punch, this.controls.dash].some(
          button => button === target || button.contains(target),
        );
    };
    const stopNativeGesture = (event: Event): void => {
      if (isCombatTarget(event.target) && event.cancelable) event.preventDefault();
    };
    for (const type of ['touchstart', 'touchmove', 'gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
      this.doc.addEventListener(type, stopNativeGesture, { capture: true, passive: false });
      this.listeners.push(() => this.doc.removeEventListener(type, stopNativeGesture, true));
    }
  }

  private listen(target: EventTarget, type: string, handler: EventListener): void {
    target.addEventListener(type, handler);
    this.listeners.push(() => target.removeEventListener(type, handler));
  }

  private installAction(name: ActionName, button: HTMLButtonElement): void {
    const down = (event: Event): void => {
      const pointer = event as PointerEvent;
      pointer.stopPropagation();
      if (this.disposed || this.actionOwners.has(pointer.pointerId)) return;
      this.actionOwners.set(pointer.pointerId, name);
      button.classList.add('pressed');
      if (name === 'attack') {
        this.attackOwners.add(pointer.pointerId);
        this.publish();
      } else if (name === 'punch') this.sink.punch();
      else this.sink.dash();
      try { button.setPointerCapture(pointer.pointerId); } catch { /* optional */ }
      pointer.preventDefault();
    };
    const up = (event: Event): void => {
      const pointer = event as PointerEvent;
      pointer.stopPropagation();
      if (this.actionOwners.get(pointer.pointerId) !== name) return;
      this.actionOwners.delete(pointer.pointerId);
      this.attackOwners.delete(pointer.pointerId);
      if (![...this.actionOwners.values()].includes(name)) button.classList.remove('pressed');
      this.publish();
    };
    // Some multi-touch WebKit/Chromium sequences deliver touchend without a
    // matching pointerup for the action pointer (especially after capture).
    // The changed touch retains its original target even when the finger
    // finishes outside the button. Release only this action's owners.
    const touchFinish = (event: Event): void => {
      const touchEvent = event as TouchEvent;
      if (!touchEvent.changedTouches) return;
      let endedOnThisButton = false;
      for (let i = 0; i < touchEvent.changedTouches.length; i++) {
        const target = touchEvent.changedTouches.item(i)?.target;
        if (target === button || (typeof Node !== 'undefined' && target instanceof Node && button.contains(target))) {
          endedOnThisButton = true;
          break;
        }
      }
      if (!endedOnThisButton) {
        // CDP multi-touch and some embedded browsers retarget changedTouches
        // to the surface instead of the original action button. Reconcile
        // active fingers against the actual hitbox before leaving a held
        // attack latched forever. Keep holding if a finger is still inside.
        const rect = button.getBoundingClientRect();
        let stillTouching = false;
        for (let i = 0; i < (touchEvent.touches?.length ?? 0); i++) {
          const touch = touchEvent.touches.item(i);
          if (touch && touch.clientX >= rect.left && touch.clientX <= rect.right &&
              touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            stillTouching = true;
            break;
          }
        }
        if (stillTouching) return;
      }
      for (const [id, action] of this.actionOwners) {
        if (action === name) {
          this.actionOwners.delete(id);
          this.attackOwners.delete(id);
        }
      }
      button.classList.remove('pressed');
      this.publish();
    };
    const keyboard = (event: Event): void => {
      const click = event as MouseEvent;
      if (click.detail !== 0 || this.disposed) return;
      if (name === 'attack') {
        this.sink.basicTap();
      } else if (name === 'punch') this.sink.punch();
      else this.sink.dash();
    };
    this.listen(button, 'pointerdown', down);
    this.listen(button, 'pointerup', up);
    this.listen(button, 'pointercancel', up);
    this.listen(button, 'lostpointercapture', up);
    // Pointer capture is not guaranteed in iOS webviews and multi-touch CDP;
    // release on window even when the button never receives pointerup.
    this.listen(this.win, 'pointerup', up);
    this.listen(this.win, 'pointercancel', up);
    this.listen(this.win, 'touchend', touchFinish);
    this.listen(this.win, 'touchcancel', touchFinish);
    this.listen(button, 'click', keyboard);
  }

  private layout(): void {
    if (this.disposed) return;
    this.reset();
    this.adapter?.dispose();
    const rect = this.controls.surface.getBoundingClientRect();
    const insets = this.safeInsets();
    const layout = touchControlLayout(rect.width, rect.height, insets);
    this.controller = new RebirthJoystickController(layout.joystickCenter, {
      radius: layout.joystickRadius,
      deadZone: 0.16,
      captureRadius: layout.joystickRadius * 1.8,
    });
    this.adapter = new RebirthJoystickPointerAdapter(
      this.controls.surface, this.controller, snapshot => {
        this.stick = { ...snapshot.stick };
        this.place(this.controls.joystickBase, snapshot.center.x, snapshot.center.y, layout.joystickRadius * 2);
        this.place(this.controls.joystickKnob,
          snapshot.center.x + snapshot.stick.x * layout.joystickRadius * 0.65,
          snapshot.center.y + snapshot.stick.y * layout.joystickRadius * 0.65,
          layout.joystickRadius * 0.82);
        this.publish();
      }, this.win, this.doc,
    );
    this.place(this.controls.attack, layout.basicAttackCenter.x, layout.basicAttackCenter.y, layout.actionRadius * 2);
    this.place(this.controls.punch, layout.skillOneCenter.x, layout.skillOneCenter.y, layout.actionRadius * 2);
    this.place(this.controls.dash, layout.skillTwoCenter.x, layout.skillTwoCenter.y, layout.actionRadius * 2);
    this.place(this.controls.joystickBase, layout.joystickCenter.x, layout.joystickCenter.y, layout.joystickRadius * 2);
    this.place(this.controls.joystickKnob, layout.joystickCenter.x, layout.joystickCenter.y, layout.joystickRadius * 0.82);
  }

  private place(el: HTMLElement, x: number, y: number, size: number): void {
    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
  }

  private safeInsets(): { left: number; right: number; bottom: number } {
    const probe = this.doc.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
    this.doc.body.append(probe);
    const style = this.win.getComputedStyle(probe);
    const insets = {
      left: parseFloat(style.paddingLeft) || 0,
      right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
    };
    probe.remove();
    return insets;
  }

  private publish(): void {
    if (!this.disposed) this.sink.setInput({ ...this.stick }, this.attackOwners.size > 0);
  }

  reset(): void {
    if (this.disposed) return;
    this.adapter?.reset();
    this.stick = { ...ZERO };
    this.attackOwners.clear();
    this.actionOwners.clear();
    for (const button of [this.controls.attack, this.controls.punch, this.controls.dash]) {
      button.classList.remove('pressed');
    }
    this.sink.resetInput();
  }

  dispose(): void {
    if (this.disposed) return;
    this.reset();
    this.adapter?.dispose();
    this.adapter = null;
    this.controller = null;
    for (const remove of this.listeners.splice(0)) remove();
    this.disposed = true;
  }
}
