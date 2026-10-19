import {
  detectPlayOrientation,
  shouldShowRotatePrompt,
  shouldShowTouchControls,
  type PlayOrientation,
} from '@core/input/orientation';

export interface OrientationGateCallbacks {
  onOrientationChange: (orientation: PlayOrientation, showTouch: boolean) => void;
  onStartGame?: () => void;
}

/**
 * Portrait rotate prompt + optional fullscreen / landscape lock after Start.
 * iOS may reject lock/fullscreen — rotate tip remains the reliable fallback.
 */
export class OrientationGate {
  private readonly root: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly startBtn: HTMLButtonElement;
  private disposed = false;
  private started = false;
  private coarsePointer = false;

  private readonly onResize: () => void;
  private readonly onStart: () => void;

  constructor(
    root: HTMLElement,
    private readonly callbacks: OrientationGateCallbacks,
  ) {
    this.root = root;
    this.coarsePointer =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;

    this.root.innerHTML = `
      <div class="orient-gate" data-orient hidden>
        <div class="orient-card">
          <div class="orient-icon" aria-hidden="true">↻</div>
          <h2 class="orient-title">手機轉橫向，準備開打</h2>
          <p class="orient-copy">霧川市的夜晚不太平。轉動手機，開始第一章「只是想買個宵夜」。</p>
          <button type="button" class="orient-start" data-start>進入霧川市</button>
          <p class="orient-note">iPhone 若無法自動旋轉，請先關閉直向鎖定。</p>
        </div>
      </div>
    `;
    this.prompt = this.root.querySelector('[data-orient]')!;
    this.startBtn = this.root.querySelector('[data-start]')!;

    this.onResize = () => this.refresh();
    this.onStart = () => void this.handleStart();

    this.startBtn.addEventListener('click', this.onStart);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.refresh();
  }

  get hasStarted(): boolean {
    return this.started;
  }

  refresh(): void {
    if (this.disposed) return;
    const orientation = detectPlayOrientation(window.innerWidth, window.innerHeight);
    const showPrompt = this.coarsePointer && shouldShowRotatePrompt(orientation);
    this.prompt.hidden = !showPrompt;
    this.prompt.classList.toggle('is-visible', showPrompt);

    const showTouch = shouldShowTouchControls({
      orientation,
      coarsePointer: this.coarsePointer,
    });
    this.callbacks.onOrientationChange(orientation, showTouch);
  }

  /** Test helper — force coarse-pointer mode. */
  setCoarsePointerForTests(value: boolean): void {
    this.coarsePointer = value;
    this.refresh();
  }

  private async handleStart(): Promise<void> {
    this.started = true;
    this.callbacks.onStartGame?.();
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      // iOS / restricted contexts — ignore
    }
    try {
      const orient = screen.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>;
      };
      if (orient?.lock) {
        await orient.lock('landscape');
      }
    } catch {
      // Manual rotate remains available
    }
    this.refresh();
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.startBtn.removeEventListener('click', this.onStart);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    this.root.innerHTML = '';
  }
}
