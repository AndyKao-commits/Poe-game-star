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
    for (const button of [controls.attack, controls.punch, controls.dash]) {
      button.style.touchAction = 'none';
    }
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
    const keyboard = (event: Event): void => {
      const click = event as MouseEvent;
      if (click.detail !== 0 || this.disposed) return;
      if (name === 'attack') {
        this.sink.setInput(this.stick, true);
        this.sink.setInput(this.stick, false);
      } else if (name === 'punch') this.sink.punch();
      else this.sink.dash();
    };
    this.listen(button, 'pointerdown', down);
    this.listen(button, 'pointerup', up);
    this.listen(button, 'pointercancel', up);
    this.listen(button, 'lostpointercapture', up);
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
