/**
 * Tracks teardown callbacks so Phaser scenes can detach listeners / timers
 * without leaking across restart cycles.
 */
export class DisposableBag {
  private readonly disposers: Array<() => void> = [];
  private disposed = false;

  get size(): number {
    return this.disposers.length;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  add(dispose: () => void): void {
    if (this.disposed) {
      dispose();
      return;
    }
    this.disposers.push(dispose);
  }

  /** Run all disposers once, then clear. Safe to call multiple times. */
  disposeAll(): void {
    if (this.disposed) return;
    this.disposed = true;
    const list = this.disposers.splice(0, this.disposers.length);
    for (const d of list) {
      d();
    }
  }

  /** Reset bag for a fresh scene create() after dispose. */
  reset(): void {
    this.disposed = false;
    this.disposers.length = 0;
  }
}
