export interface InputDebugSnapshot {
  pointerId: number | null;
  touchId: number | null;
  stickX: number;
  stickY: number;
  moveX: number;
  moveY: number;
  moving: boolean;
  attackHeld: boolean;
  playerX: number;
  playerY: number;
}

/**
 * Optional on-screen diagnostics for real-device touch debugging.
 * Enabled only when ?debugInput=1 (or localStorage ashenDebugInput=1).
 */
export class InputDebugHud {
  static isRequested(): boolean {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('debugInput') === '1') return true;
      return window.localStorage?.getItem('ashenDebugInput') === '1';
    } catch {
      return false;
    }
  }

  private readonly el: HTMLPreElement;
  private disposed = false;

  constructor(
    host: HTMLElement,
    private readonly read: () => InputDebugSnapshot,
  ) {
    this.el = document.createElement('pre');
    this.el.className = 'input-debug-hud';
    this.el.dataset.inputDebug = '1';
    this.el.setAttribute('aria-hidden', 'true');
    host.appendChild(this.el);
  }

  update(): void {
    if (this.disposed) return;
    const s = this.read();
    this.el.textContent = [
      `ptr=${s.pointerId ?? '-'} touch=${s.touchId ?? '-'}`,
      `stick=${s.stickX.toFixed(2)},${s.stickY.toFixed(2)}`,
      `in=${s.moveX.toFixed(2)},${s.moveY.toFixed(2)} mov=${s.moving ? 1 : 0} atk=${s.attackHeld ? 1 : 0}`,
      `pos=${s.playerX.toFixed(3)},${s.playerY.toFixed(3)}`,
    ].join('\n');
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.el.remove();
  }
}
