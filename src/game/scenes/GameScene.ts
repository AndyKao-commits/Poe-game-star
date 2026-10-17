import Phaser from 'phaser';
import { createProgression, xpToNextLevel, type ProgressionState } from '@core/progression/experience';
import { claimKillReward, createKillRewardLedger, type KillRewardLedger } from '@core/progression/killRewards';
import { createSeededRng, rollLoot } from '@core/loot/lootTable';
import { ENEMY_LOOT_TABLE } from '@core/loot/enemyLoot';
import {
  claimKillLoot,
  createGearKit,
  createLootClaimLedger,
  equipFromInventory,
  grantLoot,
  unequipToInventory,
  type GearKit,
  type LootClaimLedger,
} from '@core/loadout/gearKit';
import type { EquipmentSlot } from '@core/equipment/equipment';
import type { Rarity } from '@core/loot/rarity';
import { InventoryPanel } from '@ui/inventoryPanel';
import { mapPixelBounds } from '@core/collision/grid';
import { createRuinTestMap, type RuinMapBlueprint } from '@core/map/ruinMap';
import { clampDeltaMs } from '@core/time/delta';
import { DisposableBag } from '@core/scene/disposables';
import {
  canReceiveEncounterDamage,
  planEncounterReset,
  tickSpawnGrace,
} from '@core/encounter/reset';
import { HudController } from '@ui/hud';
import { TouchControlsOverlay } from '@ui/touchControls';
import { OrientationGate } from '@ui/orientationGate';
import { SafariGestureGuard } from '@ui/safariGestureGuard';
import { InputDebugHud } from '@ui/inputDebugHud';
import { EnemyController } from '../entities/EnemyController';
import { PlayerController } from '../entities/PlayerController';
import { renderTileMap } from '../map/TileRenderer';
import { CombatFeedbackSystem } from '../systems/CombatFeedback';
import { InputController } from '../input/InputController';

export class GameScene extends Phaser.Scene {
  private player!: PlayerController;
  private progression: ProgressionState = createProgression();
  private rewardLedger: KillRewardLedger = createKillRewardLedger();
  private gearKit: GearKit = createGearKit();
  private lootLedger: LootClaimLedger = createLootClaimLedger();
  private lootRng = createSeededRng(0xA51E4);
  private inventoryPanel: InventoryPanel | null = null;
  private inventoryOpen = false;
  private enemyKillIds = new Map<EnemyController, string>();
  private nextEnemyKillId = 0;
  private enemies: EnemyController[] = [];
  private hud: HudController | null = null;
  private feedback!: CombatFeedbackSystem;
  private blueprint!: RuinMapBlueprint;
  private readonly disposables = new DisposableBag();
  private restartCount = 0;
  private spawnGraceMs = 0;
  private playerInput!: InputController;
  private touchControls: TouchControlsOverlay | null = null;
  private orientationGate: OrientationGate | null = null;
  private gestureGuard: SafariGestureGuard | null = null;
  private inputDebugHud: InputDebugHud | null = null;
  private touchWanted = false;
  private lastDead: boolean | null = null;
  private lastTouchVisible: boolean | null = null;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.disposables.reset();
    this.lastDead = null;
    this.lastTouchVisible = null;
    this.progression = createProgression();
    this.rewardLedger = createKillRewardLedger();
    this.gearKit = createGearKit();
    this.lootLedger = createLootClaimLedger();
    this.lootRng = createSeededRng(0xA51E4);
    this.inventoryOpen = false;
    this.enemyKillIds.clear();
    this.nextEnemyKillId = 0;
    this.feedback = new CombatFeedbackSystem(this);
    this.blueprint = createRuinTestMap();
    renderTileMap(this, this.blueprint.map);

    this.playerInput = new InputController(this);
    this.disposables.add(() => this.playerInput.destroy());

    this.player = new PlayerController(
      this,
      this.blueprint.playerSpawn,
      this.blueprint.map,
      this.feedback,
      this.playerInput,
    );
    this.spawnEnemiesFromBlueprint();

    const bounds = mapPixelBounds(this.blueprint.map);
    const pad = 64;
    this.cameras.main.setBounds(
      bounds.minX - pad,
      bounds.minY - pad,
      bounds.maxX - bounds.minX + pad * 2,
      bounds.maxY - bounds.minY + pad * 2,
    );
    this.cameras.main.startFollow(this.player.entity.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(this.computeZoom());

    const onResize = (): void => {
      this.cameras.main.setZoom(this.computeZoom());
      this.touchControls?.layout();
      this.orientationGate?.refresh();
    };
    this.scale.on('resize', onResize);
    this.disposables.add(() => {
      this.scale.off('resize', onResize);
    });

    const hudRoot = document.getElementById('hud-root');
    if (!hudRoot) throw new Error('Missing #hud-root');
    this.hud?.destroy();
    this.hud = new HudController(hudRoot);
    this.hud.setRestartHandler(() => this.handleRestart());
    this.hud.setInventoryHandler(() => this.toggleInventory());
    this.disposables.add(() => {
      this.hud?.destroy();
      this.hud = null;
    });

    const invRoot = document.getElementById('inventory-root');
    if (!invRoot) throw new Error('Missing #inventory-root');
    this.inventoryPanel?.destroy();
    this.inventoryPanel = new InventoryPanel(invRoot, {
      onClose: () => this.setInventoryOpen(false),
      onEquip: (itemId, rarity) => this.handleEquip(itemId, rarity),
      onUnequip: (slot) => this.handleUnequip(slot),
    });
    this.disposables.add(() => {
      this.inventoryPanel?.destroy();
      this.inventoryPanel = null;
    });
    this.player.syncEquipment(this.gearKit.equipment, 'full');
    this.refreshInventoryPanel();

    const touchRoot = document.getElementById('touch-root');
    if (!touchRoot) throw new Error('Missing #touch-root');
    this.touchControls?.destroy();
    this.touchControls = new TouchControlsOverlay(touchRoot, this.playerInput);
    this.disposables.add(() => {
      this.touchControls?.destroy();
      this.touchControls = null;
    });

    // Guard the whole immersive shell so blank map / HUD / pass-through taps
    // cannot double-tap-zoom — not only #game-root or the attack button.
    const appRoot = document.getElementById('app') ?? document.body;
    this.gestureGuard?.destroy();
    this.gestureGuard = new SafariGestureGuard(appRoot);
    this.disposables.add(() => {
      this.gestureGuard?.destroy();
      this.gestureGuard = null;
    });

    this.inputDebugHud?.destroy();
    this.inputDebugHud = null;
    if (InputDebugHud.isRequested()) {
      const host = document.getElementById('hud-root') ?? document.body;
      this.inputDebugHud = new InputDebugHud(host, () => {
        const touch = this.touchControls?.getDebugState();
        const sample = this.playerInput.sample();
        const pos = this.player.position;
        return {
          pointerId: touch?.movePointerId ?? null,
          touchId: touch?.moveTouchId ?? null,
          stickX: touch?.stickX ?? 0,
          stickY: touch?.stickY ?? 0,
          moveX: sample.moveX,
          moveY: sample.moveY,
          moving: sample.moving,
          attackHeld: sample.attackHeld,
          playerX: pos.x,
          playerY: pos.y,
        };
      });
      this.disposables.add(() => {
        this.inputDebugHud?.destroy();
        this.inputDebugHud = null;
      });
    }

    const orientRoot = document.getElementById('orient-root');
    if (!orientRoot) throw new Error('Missing #orient-root');
    this.orientationGate?.destroy();
    this.orientationGate = new OrientationGate(orientRoot, {
      onOrientationChange: (_orientation, showTouch) => {
        this.touchWanted = showTouch;
        this.syncControlAvailability();
      },
    });
    this.disposables.add(() => {
      this.orientationGate?.destroy();
      this.orientationGate = null;
    });

    const onInventoryHotkey = (e: KeyboardEvent): void => {
      if (e.code !== 'KeyI' && e.code !== 'KeyB') return;
      if (e.repeat) return;
      if (this.player?.lifecycle.isDead) return;
      e.preventDefault();
      this.toggleInventory();
    };
    window.addEventListener('keydown', onInventoryHotkey);
    this.disposables.add(() => window.removeEventListener('keydown', onInventoryHotkey));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
    this.syncControlAvailability();
  }

  update(_time: number, rawDelta: number): void {
    if (!this.player || !this.hud) return;

    let delta = clampDeltaMs(rawDelta);
    delta = this.feedback.update(delta);
    this.spawnGraceMs = tickSpawnGrace(this.spawnGraceMs, delta);

    const dead = this.player.lifecycle.isDead;
    if (dead && this.inventoryOpen) {
      this.setInventoryOpen(false);
    }
    this.applyDeathControlState(dead);

    if (!dead && !this.inventoryOpen) {
      this.touchControls?.update(delta);
    }

    this.player.update(delta, this.enemies);
    const suppressDamage = !canReceiveEncounterDamage(this.spawnGraceMs);
    for (const enemy of this.enemies) {
      enemy.update(delta, this.player, { suppressDamage });
    }

    this.collectEnemyKillRewards();
    this.player.lifecycle.consumeDeathEvent();

    this.hud.update({
      hp: this.player.stats.hp,
      maxHp: this.player.stats.maxHp,
      mp: this.player.stats.mp,
      maxMp: this.player.stats.maxMp,
      fps: this.game.loop.actualFps,
      dead,
      level: this.progression.level,
      xp: this.progression.xp,
      xpToNext: xpToNextLevel(this.progression.level),
      gold: this.rewardLedger.gold,
    });
    this.inputDebugHud?.update();
  }

  /** Only mutates DOM when dead/alive edge changes. */
  private applyDeathControlState(dead: boolean): void {
    if (this.lastDead === dead) return;
    this.lastDead = dead;
    this.syncGameplayInputGate();
    if (dead) {
      // Hide immediately and clear all pointer state
      this.setTouchVisible(false);
      this.touchControls?.setEnabled(false);
    } else {
      this.syncControlAvailability();
    }
  }

  /** Combat/move input is disabled while dead or while the inventory modal is open. */
  private syncGameplayInputGate(): void {
    const dead = this.player?.lifecycle.isDead ?? false;
    const allow = !dead && !this.inventoryOpen;
    this.playerInput.setEnabled(allow);
    if (!allow) {
      this.playerInput.clearTouch();
      this.touchControls?.setEnabled(false);
    } else {
      this.touchControls?.setEnabled(true);
    }
  }

  private syncControlAvailability(): void {
    const show =
      this.touchWanted &&
      !this.player?.lifecycle.isDead &&
      !this.inventoryOpen;
    this.setTouchVisible(show);
    this.touchControls?.layout();
  }

  private toggleInventory(): void {
    if (this.player?.lifecycle.isDead) return;
    this.setInventoryOpen(!this.inventoryOpen);
  }

  private setInventoryOpen(open: boolean): void {
    if (this.inventoryOpen === open) {
      if (open) this.refreshInventoryPanel();
      return;
    }
    this.inventoryOpen = open;
    if (open) {
      // Clear stuck touch pointers so closing the modal cannot resume a held attack.
      this.playerInput.clearTouch();
      this.touchControls?.setEnabled(false);
      this.refreshInventoryPanel();
      this.inventoryPanel?.setOpen(true);
    } else {
      this.inventoryPanel?.setOpen(false);
    }
    this.syncGameplayInputGate();
    this.syncControlAvailability();
  }

  private refreshInventoryPanel(): void {
    this.inventoryPanel?.render(this.gearKit);
  }

  private handleEquip(itemId: string, rarity: Rarity): void {
    const result = equipFromInventory(this.gearKit, itemId, rarity);
    if (!result.ok) {
      const msg =
        result.reason === 'inventory_full'
          ? '背包已滿，無法替換裝備'
          : result.reason === 'missing'
            ? '物品不存在'
            : '無法裝備';
      this.inventoryPanel?.setStatus(msg);
      this.refreshInventoryPanel();
      return;
    }
    this.gearKit = result.kit;
    this.player.syncEquipment(this.gearKit.equipment, 'keep');
    this.inventoryPanel?.setStatus(`已裝備 ${itemId}`);
    this.refreshInventoryPanel();
  }

  private handleUnequip(slot: EquipmentSlot): void {
    const result = unequipToInventory(this.gearKit, slot);
    if (!result.ok) {
      const msg =
        result.reason === 'inventory_full'
          ? '背包已滿，無法卸下'
          : result.reason === 'empty'
            ? '該欄位沒有裝備'
            : '無法卸下';
      this.inventoryPanel?.setStatus(msg);
      this.refreshInventoryPanel();
      return;
    }
    this.gearKit = result.kit;
    this.player.syncEquipment(this.gearKit.equipment, 'keep');
    this.inventoryPanel?.setStatus(`已卸下 ${slot}`);
    this.refreshInventoryPanel();
  }

  private setTouchVisible(show: boolean): void {
    if (this.lastTouchVisible === show) return;
    this.lastTouchVisible = show;
    this.touchControls?.setVisible(show);
  }

  private handleRestart(): void {
    const plan = planEncounterReset({
      enemySpawnCount: this.blueprint.enemySpawns.length,
      isPlayerDead: this.player.lifecycle.isDead,
    });
    if (!plan.allowed) return;

    this.restartCount += 1;

    if (plan.clearTweens) {
      this.tweens.killAll();
    }
    if (plan.clearTimers) {
      this.time.removeAllEvents();
    }

    if (plan.destroyAllEnemies) {
      for (const enemy of this.enemies) {
        enemy.destroy();
        this.enemyKillIds.delete(enemy);
      }
      this.enemies = [];
    }

    // Inventory + equipment persist across death; respawn re-derives stats.
    this.setInventoryOpen(false);
    this.player.respawn();
    this.player.syncEquipment(this.gearKit.equipment, 'full');
    this.spawnEnemiesFromBlueprint();
    this.spawnGraceMs = plan.graceMs;
    this.playerInput.clearTouch();
    // Force re-evaluate visibility after respawn (clears lastDead cache)
    this.lastDead = null;
    this.applyDeathControlState(false);

    this.cameras.main.startFollow(this.player.entity.sprite, true, 0.12, 0.12);
    this.hud?.update({
      hp: this.player.stats.hp,
      maxHp: this.player.stats.maxHp,
      mp: this.player.stats.mp,
      maxMp: this.player.stats.maxMp,
      fps: this.game.loop.actualFps,
      dead: false,
      level: this.progression.level,
      xp: this.progression.xp,
      xpToNext: xpToNextLevel(this.progression.level),
      gold: this.rewardLedger.gold,
    });
  }

  private collectEnemyKillRewards(): void {
    for (const enemy of this.enemies) {
      if (enemy.alive) continue;
      const killId = this.enemyKillIds.get(enemy);
      if (!killId) continue;
      // Each spawned enemy instance has a unique ID, including after encounter resets.
      const claimed = claimKillReward(this.rewardLedger, this.progression, killId, { xp: 25, gold: 5 });
      if (!claimed) continue;
      this.rewardLedger = claimed.ledger;
      this.progression = claimed.progression.state;

      // Exactly-once loot for the same kill identity (no double drops on re-hit / anim).
      const drop = rollLoot(ENEMY_LOOT_TABLE, this.lootRng);
      const loot = claimKillLoot(this.lootLedger, this.gearKit, killId, drop);
      this.lootLedger = loot.ledger;
      this.gearKit = loot.kit;
      if (loot.granted && this.inventoryOpen) {
        this.inventoryPanel?.setStatus(`獲得 ${loot.granted.itemId} (${loot.granted.rarity})`);
        this.refreshInventoryPanel();
      } else if (loot.bagFull && this.inventoryOpen) {
        this.inventoryPanel?.setStatus('背包已滿，掉落未能拾取');
        this.refreshInventoryPanel();
      } else if (loot.granted) {
        this.hud?.flashLoot(loot.granted.itemId, loot.granted.rarity);
      }

      // A claimed corpse no longer needs to be checked on every frame.
      this.enemyKillIds.delete(enemy);
    }
  }

  private spawnEnemiesFromBlueprint(): void {
    this.enemies = this.blueprint.enemySpawns.map((spawn) => {
      const enemy = new EnemyController(this, spawn, this.blueprint.map, this.feedback);
      this.enemyKillIds.set(enemy, `enemy-${++this.nextEnemyKillId}`);
      return enemy;
    });
  }

  getRestartCount(): number {
    return this.restartCount;
  }

  getEnemyCountForTests(): number {
    return this.enemies.length;
  }

  getSpawnGraceForTests(): number {
    return this.spawnGraceMs;
  }

  getPlayerForTests(): PlayerController {
    return this.player;
  }

  getGearKitForTests(): GearKit {
    return this.gearKit;
  }

  getInventoryOpenForTests(): boolean {
    return this.inventoryOpen;
  }

  setInventoryOpenForTests(open: boolean): void {
    this.setInventoryOpen(open);
  }

  grantLootForTests(itemId: string, rarity: Rarity): boolean {
    const result = grantLoot(this.gearKit, { itemId, rarity });
    if (!result.ok) return false;
    this.gearKit = result.kit;
    this.refreshInventoryPanel();
    return true;
  }

  equipForTests(itemId: string, rarity: Rarity): boolean {
    const result = equipFromInventory(this.gearKit, itemId, rarity);
    if (!result.ok) return false;
    this.gearKit = result.kit;
    this.player.syncEquipment(this.gearKit.equipment, 'keep');
    this.refreshInventoryPanel();
    return true;
  }

  getInputForTests(): InputController {
    return this.playerInput;
  }

  getOrientationGateForTests(): OrientationGate | null {
    return this.orientationGate;
  }

  getTouchControlsForTests(): TouchControlsOverlay | null {
    return this.touchControls;
  }

  getGestureGuardForTests(): SafariGestureGuard | null {
    return this.gestureGuard;
  }

  restartForTests(): void {
    this.handleRestart();
  }

  private teardown(): void {
    if (this.disposables.isDisposed) return;
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    this.enemies = [];
    this.enemyKillIds.clear();
    this.player?.destroy();
    this.disposables.disposeAll();
  }

  private computeZoom(): number {
    const base = Math.min(this.scale.width / 960, this.scale.height / 540);
    return Phaser.Math.Clamp(base * 1.35, 0.85, 2.2);
  }
}
