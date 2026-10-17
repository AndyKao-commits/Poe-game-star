export interface HudSnapshot {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  fps: number;
  dead?: boolean;
  level?: number;
  xp?: number;
  xpToNext?: number;
  gold?: number;
}

export class HudController {
  private readonly root: HTMLElement;
  private hpFill!: HTMLElement;
  private mpFill!: HTMLElement;
  private hpText!: HTMLElement;
  private mpText!: HTMLElement;
  private fpsText!: HTMLElement;
  private progressionText!: HTMLElement;
  private xpFill!: HTMLElement;
  private deathOverlay!: HTMLElement;
  private restartBtn!: HTMLButtonElement;
  private onRestart: (() => void) | null = null;
  private onInventory: (() => void) | null = null;
  private boundRestart: () => void;
  private boundInventory: () => void;
  private inventoryBtn!: HTMLButtonElement;
  private lootToast!: HTMLElement;
  private lootToastTimer: number | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.boundRestart = () => this.onRestart?.();
    this.boundInventory = () => this.onInventory?.();
    this.mount();
  }

  private mount(): void {
    this.root.innerHTML = `
      <div class="hud-panel hud-stats">
        <div class="hud-title">Ashen Reliquary</div>
        <div class="hud-bar-row">
          <span>HP</span>
          <div class="hud-bar-track"><div class="hud-bar-fill hp" data-hp-fill></div></div>
          <span data-hp-text>100/100</span>
        </div>
        <div class="hud-bar-row">
          <span>MP</span>
          <div class="hud-bar-track"><div class="hud-bar-fill mp" data-mp-fill></div></div>
          <span data-mp-text>50/50</span>
        </div>
        <div class="hud-bar-row"><span data-progression-text>Lv 1 · 0/85 XP · 0 G</span></div>
        <div class="hud-bar-track"><div class="hud-bar-fill mp" data-xp-fill></div></div>
      </div>
      <div class="hud-panel hud-hints">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移動</div>
        <div>滑鼠左鍵 扇形攻擊（朝向游標）</div>
        <div><kbd>I</kbd> / <kbd>B</kbd> 背包</div>
      </div>
      <div class="hud-panel hud-actions">
        <button type="button" class="hud-inv-btn" data-inventory>背包</button>
      </div>
      <div class="hud-loot-toast" data-loot-toast hidden></div>
      <div class="hud-panel hud-fps"><span data-fps>FPS --</span></div>
      <div class="hud-death" data-death hidden>
        <div class="hud-death-card">
          <div class="hud-death-title">You Died</div>
          <p class="hud-death-copy">遺跡吞噬了你的氣息。</p>
          <button type="button" data-restart class="hud-restart">重新開始</button>
        </div>
      </div>
    `;
    this.hpFill = this.root.querySelector('[data-hp-fill]')!;
    this.mpFill = this.root.querySelector('[data-mp-fill]')!;
    this.hpText = this.root.querySelector('[data-hp-text]')!;
    this.mpText = this.root.querySelector('[data-mp-text]')!;
    this.fpsText = this.root.querySelector('[data-fps]')!;
    this.progressionText = this.root.querySelector('[data-progression-text]')!;
    this.xpFill = this.root.querySelector('[data-xp-fill]')!;
    this.deathOverlay = this.root.querySelector('[data-death]')!;
    this.restartBtn = this.root.querySelector('[data-restart]')!;
    this.inventoryBtn = this.root.querySelector('[data-inventory]')!;
    this.lootToast = this.root.querySelector('[data-loot-toast]')!;
    this.restartBtn.addEventListener('click', this.boundRestart);
    this.inventoryBtn.addEventListener('click', this.boundInventory);
  }

  setRestartHandler(handler: (() => void) | null): void {
    this.onRestart = handler;
  }

  setInventoryHandler(handler: (() => void) | null): void {
    this.onInventory = handler;
  }

  flashLoot(itemId: string, rarity: string): void {
    this.lootToast.hidden = false;
    this.lootToast.textContent = `掉落：${itemId} (${rarity})`;
    this.lootToast.classList.add('is-visible');
    if (this.lootToastTimer !== null) {
      window.clearTimeout(this.lootToastTimer);
    }
    this.lootToastTimer = window.setTimeout(() => {
      this.lootToast.classList.remove('is-visible');
      this.lootToast.hidden = true;
      this.lootToastTimer = null;
    }, 2200);
  }

  update(snapshot: HudSnapshot): void {
    const hpRatio = snapshot.maxHp > 0 ? snapshot.hp / snapshot.maxHp : 0;
    const mpRatio = snapshot.maxMp > 0 ? snapshot.mp / snapshot.maxMp : 0;
    this.hpFill.style.transform = `scaleX(${Math.max(0, Math.min(1, hpRatio))})`;
    this.mpFill.style.transform = `scaleX(${Math.max(0, Math.min(1, mpRatio))})`;
    this.hpText.textContent = `${Math.ceil(snapshot.hp)}/${snapshot.maxHp}`;
    this.mpText.textContent = `${Math.ceil(snapshot.mp)}/${snapshot.maxMp}`;
    this.fpsText.textContent = `FPS ${Math.round(snapshot.fps)}`;
    const nextXp = snapshot.xpToNext ?? 85;
    const xp = snapshot.xp ?? 0;
    this.progressionText.textContent = `Lv ${snapshot.level ?? 1} · ${xp}/${nextXp} XP · ${snapshot.gold ?? 0} G`;
    this.xpFill.style.transform = `scaleX(${nextXp > 0 ? Math.max(0, Math.min(1, xp / nextXp)) : 0})`;

    const showDeath = !!snapshot.dead;
    this.deathOverlay.hidden = !showDeath;
    this.deathOverlay.classList.toggle('is-visible', showDeath);
  }

  destroy(): void {
    this.restartBtn.removeEventListener('click', this.boundRestart);
    this.inventoryBtn.removeEventListener('click', this.boundInventory);
    if (this.lootToastTimer !== null) {
      window.clearTimeout(this.lootToastTimer);
      this.lootToastTimer = null;
    }
    this.onRestart = null;
    this.onInventory = null;
    this.root.innerHTML = '';
  }
}
