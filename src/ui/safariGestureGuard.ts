/**
 * Lightweight iOS Safari gesture guard for the game surface.
 * Blocks page pinch-zoom and double-tap zoom without trapping system UI chrome.
 * Listeners are removed on destroy to avoid duplicate bindings across scene restarts.
 */
export class SafariGestureGuard {
  private disposed = false;
  private lastTouchEndAt = 0;
  private readonly targets: Array<{
    target: EventTarget;
    type: string;
    listener: EventListener;
    options: AddEventListenerOptions;
  }> = [];

  constructor(private readonly gameRoot: HTMLElement) {
    this.bind(document, 'gesturestart', this.prevent as EventListener, {
      passive: false,
      capture: true,
    });
    this.bind(document, 'gesturechange', this.prevent as EventListener, {
      passive: false,
      capture: true,
    });
    // Double-tap zoom is still common on iOS even with user-scalable=no.
    this.bind(this.gameRoot, 'touchend', this.onTouchEnd as EventListener, {
      passive: false,
      capture: true,
    });
    this.bind(this.gameRoot, 'dblclick', this.prevent as EventListener, {
      passive: false,
      capture: true,
    });
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.targets) {
      entry.target.removeEventListener(entry.type, entry.listener, entry.options);
    }
    this.targets.length = 0;
  }

  private readonly prevent = (e: Event): void => {
    if (this.disposed) return;
    if (!this.isGameTouchTarget(e.target)) return;
    e.preventDefault();
  };

  private readonly onTouchEnd = (e: TouchEvent): void => {
    if (this.disposed) return;
    if (!this.isGameTouchTarget(e.target)) return;
    // Only suppress the second tap of a rapid double-tap (zoom gesture).
    // Single taps and multi-finger play must still reach control handlers.
    if (e.touches.length > 0) {
      this.lastTouchEndAt = performance.now();
      return;
    }
    const now = performance.now();
    if (now - this.lastTouchEndAt < 320) {
      e.preventDefault();
    }
    this.lastTouchEndAt = now;
  };

  private isGameTouchTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest('#game-root, #touch-root, #hud-root, canvas, [data-touch-layer]'),
    );
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
