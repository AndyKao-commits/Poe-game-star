import Phaser from 'phaser';
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
import { EnemyController } from '../entities/EnemyController';
import { PlayerController } from '../entities/PlayerController';
import { renderTileMap } from '../map/TileRenderer';
import { CombatFeedbackSystem } from '../systems/CombatFeedback';
import { InputController } from '../input/InputController';

export class GameScene extends Phaser.Scene {
  private player!: PlayerController;
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
    this.disposables.add(() => {
      this.hud?.destroy();
      this.hud = null;
    });

    const touchRoot = document.getElementById('touch-root');
    if (!touchRoot) throw new Error('Missing #touch-root');
    this.touchControls?.destroy();
    this.touchControls = new TouchControlsOverlay(touchRoot, this.playerInput);
    this.disposables.add(() => {
      this.touchControls?.destroy();
      this.touchControls = null;
    });

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
    this.applyDeathControlState(dead);

    if (!dead) {
      this.touchControls?.update(delta);
    }

    this.player.update(delta, this.enemies);
    const suppressDamage = !canReceiveEncounterDamage(this.spawnGraceMs);
    for (const enemy of this.enemies) {
      enemy.update(delta, this.player, { suppressDamage });
    }

    this.player.lifecycle.consumeDeathEvent();

    this.hud.update({
      hp: this.player.stats.hp,
      maxHp: this.player.stats.maxHp,
      mp: this.player.stats.mp,
      maxMp: this.player.stats.maxMp,
      fps: this.game.loop.actualFps,
      dead,
    });
  }

  /** Only mutates DOM when dead/alive edge changes. */
  private applyDeathControlState(dead: boolean): void {
    if (this.lastDead === dead) return;
    this.lastDead = dead;
    this.playerInput.setEnabled(!dead);
    if (dead) {
      // Hide immediately and clear all pointer state
      this.setTouchVisible(false);
      this.touchControls?.setEnabled(false);
    } else {
      this.touchControls?.setEnabled(true);
      this.syncControlAvailability();
    }
  }

  private syncControlAvailability(): void {
    const show = this.touchWanted && !this.player?.lifecycle.isDead;
    this.setTouchVisible(show);
    this.touchControls?.layout();
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
      }
      this.enemies = [];
    }

    this.player.respawn();
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
    });
  }

  private spawnEnemiesFromBlueprint(): void {
    this.enemies = this.blueprint.enemySpawns.map(
      (spawn) => new EnemyController(this, spawn, this.blueprint.map, this.feedback),
    );
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

  getInputForTests(): InputController {
    return this.playerInput;
  }

  getOrientationGateForTests(): OrientationGate | null {
    return this.orientationGate;
  }

  getTouchControlsForTests(): TouchControlsOverlay | null {
    return this.touchControls;
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
    this.player?.destroy();
    this.disposables.disposeAll();
  }

  private computeZoom(): number {
    const base = Math.min(this.scale.width / 960, this.scale.height / 540);
    return Phaser.Math.Clamp(base * 1.35, 0.85, 2.2);
  }
}
