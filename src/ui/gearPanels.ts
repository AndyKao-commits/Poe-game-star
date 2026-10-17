/**
 * Inventory / equipment modal shells for Phase 2 UI.
 * Hidden until engineering C supplies real inventory/equipment snapshots.
 * No fabricated item lists — only fields from core contracts.
 */

import type { EquipmentSlot, EquipmentState } from '@core/equipment/equipment';
import type { Inventory } from '@core/inventory/inventory';

export interface InventoryPanelSnapshot {
  inventory: Inventory;
  /** Optional gold for footer — only render when provided by runtime. */
  gold?: number;
}

export interface EquipmentPanelSnapshot {
  equipment: EquipmentState;
}

const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: '武器',
  armor: '護甲',
  accessory: '飾品',
};

const SLOT_ORDER: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];

export class GearPanelsController {
  private readonly root: HTMLElement;
  private inventoryHost!: HTMLElement;
  private equipmentHost!: HTMLElement;
  private inventoryBody!: HTMLElement;
  private equipmentBody!: HTMLElement;
  private inventoryGold!: HTMLElement;
  private inventoryOpen = false;
  private equipmentOpen = false;
  private hasInventoryData = false;
  private hasEquipmentData = false;
  private onInventoryClose: (() => void) | null = null;
  private onEquipmentClose: (() => void) | null = null;
  private readonly boundInvClose: () => void;
  private readonly boundEqClose: () => void;

  constructor(root: HTMLElement) {
    this.root = root;
    this.boundInvClose = () => {
      this.setInventoryOpen(false);
      this.onInventoryClose?.();
    };
    this.boundEqClose = () => {
      this.setEquipmentOpen(false);
      this.onEquipmentClose?.();
    };
    this.mount();
  }

  private mount(): void {
    const wrap = document.createElement('div');
    wrap.className = 'hud-gear-root';
    wrap.innerHTML = `
      <div class="hud-modal hud-inventory" data-inventory-panel hidden>
        <div class="hud-modal-card" role="dialog" aria-labelledby="hud-inv-title">
          <div class="hud-modal-header">
            <h2 id="hud-inv-title" class="hud-modal-title">背包</h2>
            <button type="button" class="hud-modal-close" data-inv-close aria-label="關閉背包">×</button>
          </div>
          <div class="hud-modal-body" data-inv-body></div>
          <div class="hud-modal-footer">
            <span class="hud-modal-meta" data-inv-gold></span>
          </div>
        </div>
      </div>
      <div class="hud-modal hud-equipment" data-equipment-panel hidden>
        <div class="hud-modal-card" role="dialog" aria-labelledby="hud-eq-title">
          <div class="hud-modal-header">
            <h2 id="hud-eq-title" class="hud-modal-title">裝備</h2>
            <button type="button" class="hud-modal-close" data-eq-close aria-label="關閉裝備">×</button>
          </div>
          <div class="hud-modal-body" data-eq-body></div>
        </div>
      </div>
    `;
    this.root.appendChild(wrap);
    this.inventoryHost = wrap.querySelector('[data-inventory-panel]')!;
    this.equipmentHost = wrap.querySelector('[data-equipment-panel]')!;
    this.inventoryBody = wrap.querySelector('[data-inv-body]')!;
    this.equipmentBody = wrap.querySelector('[data-eq-body]')!;
    this.inventoryGold = wrap.querySelector('[data-inv-gold]')!;
    wrap.querySelector('[data-inv-close]')!.addEventListener('click', this.boundInvClose);
    wrap.querySelector('[data-eq-close]')!.addEventListener('click', this.boundEqClose);
  }

  setInventoryCloseHandler(handler: (() => void) | null): void {
    this.onInventoryClose = handler;
  }

  setEquipmentCloseHandler(handler: (() => void) | null): void {
    this.onEquipmentClose = handler;
  }

  /** Bind real inventory data from engineering C. Does not open the panel. */
  bindInventory(snapshot: InventoryPanelSnapshot | null): void {
    this.hasInventoryData = !!snapshot;
    if (!snapshot) {
      this.inventoryBody.innerHTML = '';
      this.inventoryGold.textContent = '';
      this.setInventoryOpen(false);
      return;
    }

    const { inventory, gold } = snapshot;
    if (inventory.slots.length === 0) {
      this.inventoryBody.innerHTML = `<p class="hud-modal-empty">背包是空的（0/${inventory.capacity}）</p>`;
    } else {
      const rows = inventory.slots
        .map(
          (slot) =>
            `<div class="hud-inv-row" data-item-id="${escapeAttr(slot.itemId)}">
              <span class="hud-inv-name">${escapeHtml(slot.itemId)}</span>
              <span class="hud-inv-qty">×${slot.quantity}</span>
              <span class="hud-inv-rarity">${escapeHtml(slot.rarity)}</span>
            </div>`,
        )
        .join('');
      this.inventoryBody.innerHTML = `
        <p class="hud-modal-meta">容量 ${inventory.slots.length}/${inventory.capacity}</p>
        <div class="hud-inv-list">${rows}</div>
      `;
    }
    this.inventoryGold.textContent = gold === undefined ? '' : `金幣 ${gold}`;
  }

  /** Bind real equipment data from engineering C. Does not open the panel. */
  bindEquipment(snapshot: EquipmentPanelSnapshot | null): void {
    this.hasEquipmentData = !!snapshot;
    if (!snapshot) {
      this.equipmentBody.innerHTML = '';
      this.setEquipmentOpen(false);
      return;
    }

    const rows = SLOT_ORDER.map((slot) => {
      const item = snapshot.equipment[slot];
      const value = item
        ? `<span class="hud-eq-item">${escapeHtml(item.id)}</span>`
        : `<span class="hud-eq-empty">空</span>`;
      return `<div class="hud-eq-row"><span class="hud-eq-slot">${SLOT_LABEL[slot]}</span>${value}</div>`;
    }).join('');
    this.equipmentBody.innerHTML = rows;
  }

  setInventoryOpen(open: boolean): void {
    if (open && !this.hasInventoryData) return;
    this.inventoryOpen = open;
    this.inventoryHost.hidden = !open;
    this.inventoryHost.classList.toggle('is-visible', open);
  }

  setEquipmentOpen(open: boolean): void {
    if (open && !this.hasEquipmentData) return;
    this.equipmentOpen = open;
    this.equipmentHost.hidden = !open;
    this.equipmentHost.classList.toggle('is-visible', open);
  }

  isInventoryOpen(): boolean {
    return this.inventoryOpen;
  }

  isEquipmentOpen(): boolean {
    return this.equipmentOpen;
  }

  /** True when either modal is open — runtime should pause/guard combat input. */
  isAnyModalOpen(): boolean {
    return this.inventoryOpen || this.equipmentOpen;
  }

  destroy(): void {
    this.onInventoryClose = null;
    this.onEquipmentClose = null;
    this.root.querySelector('.hud-gear-root')?.remove();
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
