/**
 * Immersive ARPG Safari gesture guard.
 *
 * Blocks page-level pinch-zoom and double-tap zoom across the whole game
 * surface (#app), while leaving play controls, settings, and restart usable.
 * Does not attempt to trap iOS system chrome (home indicator, Control Center).
 *
 * Note: iOS Accessibility Zoom (system assistive zoom) cannot be disabled by
 * web content and is intentionally left alone.
 */
export class SafariGestureGuard {
  private disposed = false;
  private lastTouchEndAt = 0;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private pinchActive = false;
  private readonly surface: HTMLElement;
  private readonly targets: Array<{
    target: EventTarget;
    type: string;
    listener: EventListener;
    options: AddEventListenerOptions;
  }> = [];

  /**
   * @param surface Root immersive element (typically `#app`). Falls back to body.
   */
  constructor(surface?: HTMLElement | null) {
    this.surface =
      surface ??
      document.getElementById('app') ??
      document.body;

    const cap: AddEventListenerOptions = { passive: false, capture: true };

    // Non-standard iOS Safari gesture events (pinch).
    this.bind(document, 'gesturestart', this.onGesture as EventListener, cap);
    this.bind(document, 'gesturechange', this.onGesture as EventListener, cap);
    this.bind(document, 'gestureend', this.onGesture as EventListener, cap);

    // Document-level so blank map, HUD, and pass-through areas are covered —
    // not only the attack button / move zone.
    this.bind(document, 'touchstart', this.onTouchStart as EventListener, cap);
    this.bind(document, 'touchmove', this.onTouchMove as EventListener, cap);
    this.bind(document, 'touchend', this.onTouchEnd as EventListener, cap);
    this.bind(document, 'touchcancel', this.onTouchEnd as EventListener, cap);
    this.bind(document, 'dblclick', this.onDblClick as EventListener, cap);
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.targets) {
      entry.target.removeEventListener(entry.type, entry.listener, entry.options);
    }
    this.targets.length = 0;
  }

  /** Test hook: whether an event target is treated as in-game surface. */
  isSurfaceTargetForTests(target: EventTarget | null): boolean {
    return this.isImmersiveTarget(target);
  }

  private readonly onGesture = (e: Event): void => {
    if (this.disposed) return;
    if (!this.isImmersiveTarget(e.target)) return;
    // Always cancel Safari pinch gestures on the game page.
    e.preventDefault();
  };

  private readonly onTouchStart = (e: TouchEvent): void => {
    if (this.disposed) return;
    if (!this.isImmersiveTarget(e.target)) return;

    if (e.touches.length >= 2) {
      // Mark pinch; cancel on touchmove/gesture* instead of touchstart so the
      // second finger can still begin move+attack dual-touch play.
      this.pinchActive = true;
    }
  };

  private readonly onTouchMove = (e: TouchEvent): void => {
    if (this.disposed) return;
    if (!this.isImmersiveTarget(e.target)) return;

    // Pinch / multi-finger page zoom only. Single-finger move/attack must pass.
    if (e.touches.length >= 2 || this.pinchActive) {
      e.preventDefault();
    }
  };

  private readonly onTouchEnd = (e: TouchEvent): void => {
    if (this.disposed) return;
    if (!this.isImmersiveTarget(e.target)) return;

    if (e.touches.length < 2) {
      this.pinchActive = false;
    }

    // Still holding another finger (dual stick / attack) — update clock only.
    if (e.touches.length > 0) {
      const t = e.changedTouches.item?.(0) ?? e.changedTouches[0];
      if (t) {
        this.lastTouchEndAt = performance.now();
        this.lastTouchX = t.clientX;
        this.lastTouchY = t.clientY;
      }
      return;
    }

    const t = e.changedTouches.item?.(0) ?? e.changedTouches[0];
    const now = performance.now();
    const x = t?.clientX ?? this.lastTouchX;
    const y = t?.clientY ?? this.lastTouchY;
    const dt = now - this.lastTouchEndAt;
    const dist = Math.hypot(x - this.lastTouchX, y - this.lastTouchY);

    // Rapid second tap in roughly the same place → Safari double-tap zoom.
    // preventDefault here blocks zoom; it does not cancel already-delivered
    // touchstart handlers used by attack / joystick / settings.
    if (dt > 0 && dt < 350 && dist < 36) {
      e.preventDefault();
    }

    this.lastTouchEndAt = now;
    this.lastTouchX = x;
    this.lastTouchY = y;
  };

  private readonly onDblClick = (e: Event): void => {
    if (this.disposed) return;
    if (!this.isImmersiveTarget(e.target)) return;
    e.preventDefault();
  };

  /**
   * True for anything inside the immersive shell. Form controls (select,
   * restart) stay included so double-tap zoom is blocked there too — only
   * the zoom default is cancelled, not their activation.
   */
  private isImmersiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) {
      // Some Safari gesture events expose a non-Element target; treat as in-page.
      return true;
    }
    if (target === document || target === document.documentElement || target === document.body) {
      return true;
    }
    if (this.surface.contains(target)) return true;
    if (target instanceof Element) {
      return Boolean(
        target.closest(
          '#app, #game-root, #hud-root, #touch-root, #orient-root, canvas, [data-touch-layer]',
        ),
      );
    }
    return false;
  }

  private bind(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, listener, options);
    this.targets.push({ target, type, listener, options });
  }
}
