import {
  applySkillButtonDom,
  allSkillUiSnapshots,
  type SkillUiSnapshot,
} from './skillStatus';
import {
  GearPanelsController,
  type EquipmentPanelSnapshot,
  type InventoryPanelSnapshot,
} from './gearPanels';
import type { SkillCasterState } from '@core/skills';

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
  /**
   * Optional live skill caster. When omitted, desktop skill strip stays `unavailable`
   * (not fake cooldowns). Engineering A / E wire this after skills runtime lands.
   */
  skills?: SkillCasterState | null;
}

export class HudController {
  private readonly root: HTMLElement;
  private hpFill!: HTMLElement;
  private mpFill!: HTMLElement;
  private xpFill!: HTMLElement;
  private hpText!: HTMLElement;
  private mpText!: HTMLElement;
  private xpText!: HTMLElement;
  private levelText!: HTMLElement;
  private goldText!: HTMLElement;
  private fpsText!: HTMLElement;
  private deathOverlay!: HTMLElement;
  private restartBtn!: HTMLButtonElement;
  private skillButtons = new Map<string, HTMLElement>();
  private gear!: GearPanelsController;
  private onRestart: (() => void) | null = null;
  private boundRestart: () => void;

  /** Last rendered values — skip DOM writes when unchanged (event-friendly). */
  private lastKey = '';

  constructor(root: HTMLElement) {
    this.root = root;
    this.boundRestart = () => this.onRestart?.();
    this.mount();
  }

  private mount(): void {
    this.root.innerHTML = `
      <div class="hud-panel hud-stats" data-hud-stats>
        <div class="hud-title">Ashen Reliquary</div>
        <div class="hud-vitals">
          <div class="hud-bar-row">
            <span class="hud-bar-label">HP</span>
            <div class="hud-bar-track" aria-hidden="true">
              <div class="hud-bar-fill hp" data-hp-fill></div>
            </div>
            <span class="hud-bar-value" data-hp-text>100/100</span>
          </div>
          <div class="hud-bar-row">
            <span class="hud-bar-label">MP</span>
            <div class="hud-bar-track" aria-hidden="true">
              <div class="hud-bar-fill mp" data-mp-fill></div>
            </div>
            <span class="hud-bar-value" data-mp-text>50/50</span>
          </div>
          <div class="hud-bar-row hud-xp-row">
            <span class="hud-bar-label">XP</span>
            <div class="hud-bar-track" aria-hidden="true">
              <div class="hud-bar-fill xp" data-xp-fill></div>
            </div>
            <span class="hud-bar-value" data-xp-text>0/85</span>
          </div>
        </div>
        <div class="hud-meta-row">
          <span class="hud-level" data-level>Lv 1</span>
          <span class="hud-gold" data-gold>0 G</span>
        </div>
      </div>
      <div class="hud-panel hud-skills" data-hud-skills aria-label="技能狀態">
        <button type="button" class="hud-skill is-unavailable" data-hud-skill="q" disabled aria-disabled="true">
          <span class="hud-skill-key">Q</span>
          <span class="hud-skill-cd" data-skill-cd></span>
        </button>
        <button type="button" class="hud-skill is-unavailable" data-hud-skill="e" disabled aria-disabled="true">
          <span class="hud-skill-key">E</span>
          <span class="hud-skill-cd" data-skill-cd></span>
        </button>
        <button type="button" class="hud-skill is-unavailable" data-hud-skill="dodge" disabled aria-disabled="true">
          <span class="hud-skill-key">閃</span>
          <span class="hud-skill-cd" data-skill-cd></span>
        </button>
      </div>
      <div class="hud-panel hud-hints" data-hud-hints>
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移動</div>
        <div>滑鼠左鍵 扇形攻擊（朝向游標）</div>
        <div><kbd>Q</kbd> 重擊 · <kbd>E</kbd> 爆發 · <kbd>Space</kbd> 閃避</div>
      </div>
      <div class="hud-panel hud-fps"><span data-fps>FPS --</span></div>
      <div class="hud-death" data-death hidden>
        <div class="hud-modal-card hud-death-card">
          <div class="hud-modal-title hud-death-title">You Died</div>
          <p class="hud-death-copy">遺跡吞噬了你的氣息。</p>
          <button type="button" data-restart class="hud-restart">重新開始</button>
        </div>
      </div>
    `;

    this.hpFill = this.root.querySelector('[data-hp-fill]')!;
    this.mpFill = this.root.querySelector('[data-mp-fill]')!;
    this.xpFill = this.root.querySelector('[data-xp-fill]')!;
    this.hpText = this.root.querySelector('[data-hp-text]')!;
    this.mpText = this.root.querySelector('[data-mp-text]')!;
    this.xpText = this.root.querySelector('[data-xp-text]')!;
    this.levelText = this.root.querySelector('[data-level]')!;
    this.goldText = this.root.querySelector('[data-gold]')!;
    this.fpsText = this.root.querySelector('[data-fps]')!;
    this.deathOverlay = this.root.querySelector('[data-death]')!;
    this.restartBtn = this.root.querySelector('[data-restart]')!;
    this.restartBtn.addEventListener('click', this.boundRestart);

    for (const el of this.root.querySelectorAll<HTMLElement>('[data-hud-skill]')) {
      const id = el.getAttribute('data-hud-skill');
      if (id) this.skillButtons.set(id, el);
    }

    // Default unavailable presentation until skills caster is wired.
    this.applySkills(allSkillUiSnapshots(null));

    this.gear = new GearPanelsController(this.root);
  }

  setRestartHandler(handler: (() => void) | null): void {
    this.onRestart = handler;
  }

  /** Engineering C: bind inventory; panel stays closed until setInventoryOpen(true). */
  bindInventory(snapshot: InventoryPanelSnapshot | null): void {
    this.gear.bindInventory(snapshot);
  }

  bindEquipment(snapshot: EquipmentPanelSnapshot | null): void {
    this.gear.bindEquipment(snapshot);
  }

  setInventoryOpen(open: boolean): void {
    this.gear.setInventoryOpen(open);
  }

  setEquipmentOpen(open: boolean): void {
    this.gear.setEquipmentOpen(open);
  }

  isModalOpen(): boolean {
    return this.gear.isAnyModalOpen();
  }

  setInventoryCloseHandler(handler: (() => void) | null): void {
    this.gear.setInventoryCloseHandler(handler);
  }

  setEquipmentCloseHandler(handler: (() => void) | null): void {
    this.gear.setEquipmentCloseHandler(handler);
  }

  /**
   * Push skill presentation without a full vitals refresh.
   * Prefer this from skills tick paths once engineering A/E wire the caster.
   */
  updateSkills(caster: SkillCasterState | null | undefined): void {
    this.applySkills(allSkillUiSnapshots(caster ?? null));
  }

  update(snapshot: HudSnapshot): void {
    const level = snapshot.level ?? 1;
    const xp = snapshot.xp ?? 0;
    const nextXp = snapshot.xpToNext ?? 85;
    const gold = snapshot.gold ?? 0;
    const dead = !!snapshot.dead;
    const hpCeil = Math.ceil(snapshot.hp);
    const mpCeil = Math.ceil(snapshot.mp);
    const fps = Math.round(snapshot.fps);

    const key = [
      hpCeil,
      snapshot.maxHp,
      mpCeil,
      snapshot.maxMp,
      level,
      xp,
      nextXp,
      gold,
      fps,
      dead ? 1 : 0,
      snapshot.skills === undefined ? 'u' : 's',
    ].join('|');

    if (key !== this.lastKey) {
      this.lastKey = key;

      const hpRatio = snapshot.maxHp > 0 ? snapshot.hp / snapshot.maxHp : 0;
      const mpRatio = snapshot.maxMp > 0 ? snapshot.mp / snapshot.maxMp : 0;
      const xpRatio = nextXp > 0 ? xp / nextXp : 0;

      this.hpFill.style.transform = `scaleX(${clamp01(hpRatio)})`;
      this.mpFill.style.transform = `scaleX(${clamp01(mpRatio)})`;
      this.xpFill.style.transform = `scaleX(${clamp01(xpRatio)})`;
      this.hpText.textContent = `${hpCeil}/${snapshot.maxHp}`;
      this.mpText.textContent = `${mpCeil}/${snapshot.maxMp}`;
      this.xpText.textContent = `${xp}/${nextXp}`;
      this.levelText.textContent = `Lv ${level}`;
      this.goldText.textContent = `${gold} G`;
      this.fpsText.textContent = `FPS ${fps}`;

      this.deathOverlay.hidden = !dead;
      this.deathOverlay.classList.toggle('is-visible', dead);
    }

    // Skills may change every frame while on cooldown — update when provided.
    if (snapshot.skills !== undefined) {
      this.applySkills(allSkillUiSnapshots(snapshot.skills));
    }
  }

  private applySkills(snaps: SkillUiSnapshot[]): void {
    for (const snap of snaps) {
      const el = this.skillButtons.get(snap.id);
      if (el) applySkillButtonDom(el, snap);
    }
  }

  destroy(): void {
    this.restartBtn.removeEventListener('click', this.boundRestart);
    this.onRestart = null;
    this.gear.destroy();
    this.root.innerHTML = '';
    this.skillButtons.clear();
    this.lastKey = '';
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
