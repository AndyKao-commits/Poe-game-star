import { RebirthJoystickController } from './joystickController';
import type { JoystickSnapshot, JoystickMode } from './joystickController';
import type { Point } from './touchControls';

/**
 * DOM Pointer Events bridge for an isolated Rebirth input preview.
 * The owning canvas/element must use CSS touch-action: none; passive
 * document scrolling is otherwise browser-dependent.
 *
 * All coordinates are CSS pixels relative to the element's current rect.
 * No import into the release-gated RebirthEntryScene.
 */
export class RebirthJoystickPointerAdapter {
  private disposed = false;
  private fallbackPointerId: number | null = null;
  private readonly onDown = (event: PointerEvent): void => {
    if (this.disposed) return;
    const captured = this.controller.pointerDown(event.pointerId, this.point(event));
    if (!captured) return;
    try {
      this.element.setPointerCapture(event.pointerId);
    } catch {
      // Some iOS embedded browsers reject capture; keep the gesture alive
      // using window listeners instead of silently dropping all movement.
      this.fallbackPointerId = event.pointerId;
    }
    event.preventDefault();
    this.emit();
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (this.disposed || this.controller.snapshot().pointerId !== event.pointerId) return;
    this.controller.pointerMove(event.pointerId, this.point(event));
    event.preventDefault();
    this.emit();
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (this.disposed || this.controller.snapshot().pointerId !== event.pointerId) return;
    this.controller.pointerUp(event.pointerId);
    if (this.fallbackPointerId === event.pointerId) this.fallbackPointerId = null;
    this.releaseCapture(event.pointerId);
    event.preventDefault();
    this.emit();
  };

  private readonly onWindowMove = (event: PointerEvent): void => {
    if (event.pointerId === this.fallbackPointerId) this.onMove(event);
  };
  private readonly onWindowUp = (event: PointerEvent): void => {
    if (event.pointerId === this.fallbackPointerId) this.onUp(event);
  };
  private readonly onLostCapture = (event: PointerEvent): void => {
    if (this.controller.snapshot().pointerId !== event.pointerId) return;
    this.controller.reset();
    this.emit();
  };

  private readonly onBlur = (): void => this.reset();
  private readonly onVisibility = (): void => {
    if (this.doc.visibilityState === 'hidden') this.reset();
  };
  private readonly onOrientation = (): void => this.reset();

  constructor(
    private readonly element: HTMLElement,
    private readonly controller: RebirthJoystickController,
    private readonly onChange: (state: JoystickSnapshot) => void,
    private readonly win: Window = window,
    private readonly doc: Document = document,
  ) {
    element.addEventListener('pointerdown', this.onDown);
    element.addEventListener('pointermove', this.onMove);
    element.addEventListener('pointerup', this.onUp);
    element.addEventListener('pointercancel', this.onUp);
    element.addEventListener('lostpointercapture', this.onLostCapture);
    win.addEventListener('pointermove', this.onWindowMove);
    win.addEventListener('pointerup', this.onWindowUp);
    win.addEventListener('pointercancel', this.onWindowUp);
    win.addEventListener('blur', this.onBlur);
    win.addEventListener('orientationchange', this.onOrientation);
    doc.addEventListener('visibilitychange', this.onVisibility);
  }

  private point(event: PointerEvent): Point {
    const rect = this.element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private releaseCapture(id: number): void {
    try {
      if (this.element.hasPointerCapture(id)) this.element.releasePointerCapture(id);
    } catch {
      // Capture may already be lost during pointercancel or navigation.
    }
  }

  private emit(): void {
    if (!this.disposed) this.onChange(this.controller.snapshot());
  }

  setMode(mode: JoystickMode): void {
    if (this.disposed) return;
    const id = this.controller.snapshot().pointerId;
    this.controller.setMode(mode);
    this.fallbackPointerId = null;
    if (id !== null) this.releaseCapture(id);
    this.emit();
  }

  reset(): void {
    if (this.disposed) return;
    const id = this.controller.snapshot().pointerId;
    this.controller.reset();
    this.fallbackPointerId = null;
    if (id !== null) this.releaseCapture(id);
    this.emit();
  }

  dispose(): void {
    if (this.disposed) return;
    this.reset();
    this.disposed = true;
    this.element.removeEventListener('pointerdown', this.onDown);
    this.element.removeEventListener('pointermove', this.onMove);
    this.element.removeEventListener('pointerup', this.onUp);
    this.element.removeEventListener('pointercancel', this.onUp);
    this.element.removeEventListener('lostpointercapture', this.onLostCapture);
    this.win.removeEventListener('pointermove', this.onWindowMove);
    this.win.removeEventListener('pointerup', this.onWindowUp);
    this.win.removeEventListener('pointercancel', this.onWindowUp);
    this.win.removeEventListener('blur', this.onBlur);
    this.win.removeEventListener('orientationchange', this.onOrientation);
    this.doc.removeEventListener('visibilitychange', this.onVisibility);
  }
}
