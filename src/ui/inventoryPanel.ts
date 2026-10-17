/**
 * Functional inventory / equipment modal (placeholder visuals).
 * Blocks gameplay input while open — caller must mirror that on InputController.
 */

import type { EquipmentSlot } from '@core/equipment/equipment';
import { getItemDefinition, isEquippable } from '@core/items/catalog';
import type { GearKit } from '@core/loadout/gearKit';
import { getEquippedMeta } from '@core/loadout/gearKit';
import type { Rarity } from '@core/loot/rarity';

export interface InventoryPanelHandlers {
  onEquip: (itemId: string, rarity: Rarity) => void;
  onUnequip: (slot: EquipmentSlot) => void;
  onClose: () => void;
}

const BONUS_LABELS: Record<string, string> = {
  attack: '攻擊',
  defense: '防禦',
  maxHp: '生命上限',
  maxMp: '魔力上限',
  hp: '生命',
  mp: '魔力',
  speed: '移動速度',
};

const SLOTS: readonly EquipmentSlot[] = ['weapon', 'armor', 'accessory'];
const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: '武器',
  armor: '防具',
  accessory: '飾品',
};

export class InventoryPanel {
  private readonly root: HTMLElement;
  private readonly handlers: InventoryPanelHandlers;
  private open = false;
  private statusMessage = '';
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onBackdropPointer: (e: Event) => void;

  constructor(root: HTMLElement, handlers: InventoryPanelHandlers) {
    this.root = root;
    this.handlers = handlers;
    this.root.classList.add('inventory-root');
    this.root.innerHTML = '';
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');

    this.onKeyDown = (e: KeyboardEvent) => {
      if (!this.open) return;
      // I/B toggle is owned by GameScene so open/close cannot bounce in one keydown.
      if (e.code === 'Escape') {
        e.preventDefault();
        this.handlers.onClose();
      }
    };
    this.onBackdropPointer = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.dataset?.inventoryBackdrop !== undefined) {
        e.preventDefault();
        e.stopPropagation();
        this.handlers.onClose();
      }
    };

    window.addEventListener('keydown', this.onKeyDown);
    this.root.addEventListener('pointerdown', this.onBackdropPointer);
  }

  get isOpen(): boolean {
    return this.open;
  }

  setStatus(message: string): void {
    this.statusMessage = message;
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.root.hidden = !open;
    this.root.setAttribute('aria-hidden', open ? 'false' : 'true');
    this.root.classList.toggle('is-open', open);
    if (!open) {
      this.statusMessage = '';
    }
  }

  render(kit: GearKit): void {
    const bagUsed = kit.inventory.slots.length;
    const bagCap = kit.inventory.capacity;

    const equipmentRows = SLOTS.map((slot) => {
      const item = kit.equipment[slot];
      const meta = getEquippedMeta(kit, slot);
      const def = meta ? getItemDefinition(meta.itemId) : undefined;
      const label = item && meta && def
        ? `${def.displayName} · ${meta.rarity}`
        : '（空）';
      const bonuses = item
        ? Object.entries(item.bonuses)
            .filter(([, v]) => v !== undefined && v !== 0)
            .map(([k, v]) => `${BONUS_LABELS[k] ?? k} +${v}`)
            .join(' ')
        : '';
      return `
        <div class="inv-equip-row" data-slot="${slot}">
          <div class="inv-equip-meta">
            <span class="inv-slot-name">${SLOT_LABEL[slot]}</span>
            <span class="inv-equip-name rarity-${meta?.rarity ?? 'empty'}">${label}</span>
            ${bonuses ? `<span class="inv-equip-bonus">${bonuses}</span>` : ''}
          </div>
          <button type="button" class="inv-btn" data-unequip="${slot}" ${item ? '' : 'disabled'}>卸下</button>
        </div>
      `;
    }).join('');

    const bagRows =
      kit.inventory.slots.length === 0
        ? `<div class="inv-empty">背包是空的。擊敗敵人取得掉落。</div>`
        : kit.inventory.slots
            .map((slot) => {
              const def = getItemDefinition(slot.itemId);
              const name = def?.displayName ?? slot.itemId;
              const canEquip = isEquippable(slot.itemId, slot.rarity);
              return `
                <div class="inv-bag-row rarity-${slot.rarity}" data-item-id="${slot.itemId}" data-rarity="${slot.rarity}">
                  <div class="inv-bag-meta">
                    <span class="inv-item-name">${name}</span>
                    <span class="inv-item-sub">${slot.rarity} · ×${slot.quantity}</span>
                  </div>
                  <button type="button" class="inv-btn" data-equip-id="${slot.itemId}" data-equip-rarity="${slot.rarity}" ${canEquip ? '' : 'disabled'}>
                    ${canEquip ? '裝備' : '—'}
                  </button>
                </div>
              `;
            })
            .join('');

    this.root.innerHTML = `
      <div class="inv-backdrop" data-inventory-backdrop></div>
      <div class="inv-panel" role="dialog" aria-modal="true" aria-label="背包與裝備" data-inventory-panel>
        <header class="inv-header">
          <div>
            <div class="inv-title">背包 / 裝備</div>
            <div class="inv-capacity">容量 ${bagUsed}/${bagCap}</div>
          </div>
          <button type="button" class="inv-btn inv-close" data-inv-close aria-label="關閉背包">關閉</button>
        </header>
        <section class="inv-section">
          <h3 class="inv-section-title">裝備欄</h3>
          <div class="inv-equip-list">${equipmentRows}</div>
        </section>
        <section class="inv-section">
          <h3 class="inv-section-title">物品</h3>
          <div class="inv-bag-list">${bagRows}</div>
        </section>
        <footer class="inv-footer">
          <span class="inv-status" data-inv-status>${this.statusMessage}</span>
          <span class="inv-hint">I / B / Esc 關閉 · 開啟時無法攻擊</span>
        </footer>
      </div>
    `;

    this.bindPanelEvents();
  }

  private bindPanelEvents(): void {
    this.root.querySelector('[data-inv-close]')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handlers.onClose();
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-unequip]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const slot = btn.dataset.unequip as EquipmentSlot;
        this.handlers.onUnequip(slot);
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-equip-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const itemId = btn.dataset.equipId;
        const rarity = btn.dataset.equipRarity as Rarity | undefined;
        if (!itemId || !rarity) return;
        this.handlers.onEquip(itemId, rarity);
      });
    });

    // Keep panel interactions from leaking into the game canvas / touch layer.
    this.root.querySelector('[data-inventory-panel]')?.addEventListener(
      'pointerdown',
      (e) => e.stopPropagation(),
    );
    this.root.querySelector('[data-inventory-panel]')?.addEventListener(
      'touchstart',
      (e) => e.stopPropagation(),
      { passive: false },
    );
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.root.removeEventListener('pointerdown', this.onBackdropPointer);
    this.root.innerHTML = '';
    this.root.hidden = true;
    this.root.classList.remove('is-open', 'inventory-root');
    this.open = false;
  }
}
