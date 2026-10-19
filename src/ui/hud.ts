export interface HudSnapshot {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  fps: number;
  dead?: boolean;
}

export class HudController {
  private readonly root: HTMLElement;
  private hpFill!: HTMLElement;
  private mpFill!: HTMLElement;
  private hpText!: HTMLElement;
  private mpText!: HTMLElement;
  private fpsText!: HTMLElement;
  private deathOverlay!: HTMLElement;
  private restartBtn!: HTMLButtonElement;
  private onRestart: (() => void) | null = null;
  private boundRestart: () => void;

  constructor(root: HTMLElement) {
    this.root = root;
    this.boundRestart = () => this.onRestart?.();
    this.mount();
  }

  private mount(): void {
    this.root.innerHTML = `
      <div class="hud-panel hud-stats">
        <div class="hud-title"><span class="hud-kicker">霧川市 · 深夜 23:40</span><strong>REBIRTH <span class="hud-title-accent">/ 正義公民</span></strong></div>
        <div class="hud-bar-row">
          <span>生命</span>
          <div class="hud-bar-track"><div class="hud-bar-fill hp" data-hp-fill></div></div>
          <span data-hp-text>120/120</span>
        </div>
        <div class="hud-bar-row">
          <span>魔力</span>
          <div class="hud-bar-track"><div class="hud-bar-fill mp" data-mp-fill></div></div>
          <span data-mp-text>60/60</span>
        </div>
      </div>
      <div class="hud-panel hud-hints">
        <div>第一章｜只是想買個宵夜</div>
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移動</div>
        <div>滑鼠左鍵 扇形攻擊（朝向游標）</div>
      </div>
      <div class="hud-panel hud-fps"><span data-fps>FPS --</span></div>
      <div class="hud-death" data-death hidden>
        <div class="hud-death-card">
          <div class="hud-death-title">今晚先到這裡</div>
          <p class="hud-death-copy">正義公民也需要休息。整頓一下，再出發。</p>
          <button type="button" data-restart class="hud-restart">重新挑戰</button>
        </div>
      </div>
    `;
    this.hpFill = this.root.querySelector('[data-hp-fill]')!;
    this.mpFill = this.root.querySelector('[data-mp-fill]')!;
    this.hpText = this.root.querySelector('[data-hp-text]')!;
    this.mpText = this.root.querySelector('[data-mp-text]')!;
    this.fpsText = this.root.querySelector('[data-fps]')!;
    this.deathOverlay = this.root.querySelector('[data-death]')!;
    this.restartBtn = this.root.querySelector('[data-restart]')!;
    this.restartBtn.addEventListener('click', this.boundRestart);
  }

  setRestartHandler(handler: (() => void) | null): void {
    this.onRestart = handler;
  }

  update(snapshot: HudSnapshot): void {
    const hpRatio = snapshot.maxHp > 0 ? snapshot.hp / snapshot.maxHp : 0;
    const mpRatio = snapshot.maxMp > 0 ? snapshot.mp / snapshot.maxMp : 0;
    this.hpFill.style.transform = `scaleX(${Math.max(0, Math.min(1, hpRatio))})`;
    this.mpFill.style.transform = `scaleX(${Math.max(0, Math.min(1, mpRatio))})`;
    this.hpText.textContent = `${Math.ceil(snapshot.hp)}/${snapshot.maxHp}`;
    this.mpText.textContent = `${Math.ceil(snapshot.mp)}/${snapshot.maxMp}`;
    this.fpsText.textContent = `FPS ${Math.round(snapshot.fps)}`;

    const showDeath = !!snapshot.dead;
    this.deathOverlay.hidden = !showDeath;
    this.deathOverlay.classList.toggle('is-visible', showDeath);
  }

  destroy(): void {
    this.restartBtn.removeEventListener('click', this.boundRestart);
    this.onRestart = null;
    this.root.innerHTML = '';
  }
}
