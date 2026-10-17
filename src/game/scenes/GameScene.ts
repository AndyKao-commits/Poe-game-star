import Phaser from 'phaser';
import { mapPixelBounds } from '@core/collision/grid';
import { createRuinTestMap, type RuinMapBlueprint } from '@core/map/ruinMap';
import { clampDeltaMs } from '@core/time/delta';
import { DisposableBag } from '@core/scene/disposables';
import { HudController } from '@ui/hud';
import { EnemyController } from '../entities/EnemyController';
import { PlayerController } from '../entities/PlayerController';
import { renderTileMap } from '../map/TileRenderer';
import { CombatFeedbackSystem } from '../systems/CombatFeedback';

export class GameScene extends Phaser.Scene {
  private player!: PlayerController;
  private enemies: EnemyController[] = [];
  private hud: HudController | null = null;
  private feedback!: CombatFeedbackSystem;
  private blueprint!: RuinMapBlueprint;
  private readonly disposables = new DisposableBag();
  private restartCount = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.disposables.reset();
    this.feedback = new CombatFeedbackSystem(this);
    this.blueprint = createRuinTestMap();
    renderTileMap(this, this.blueprint.map);

    this.player = new PlayerController(
      this,
      this.blueprint.playerSpawn,
      this.blueprint.map,
      this.feedback,
    );
    this.enemies = this.blueprint.enemySpawns.map(
      (spawn) => new EnemyController(this, spawn, this.blueprint.map, this.feedback),
    );

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
    };
    this.scale.on('resize', onResize);
    this.disposables.add(() => {
      this.scale.off('resize', onResize);
    });

    const hudRoot = document.getElementById('hud-root');
    if (!hudRoot) throw new Error('Missing #hud-root');
    // Prevent duplicate HUD if create() runs again without shutdown
    this.hud?.destroy();
    this.hud = new HudController(hudRoot);
    this.hud.setRestartHandler(() => this.handleRestart());
    this.disposables.add(() => {
      this.hud?.destroy();
      this.hud = null;
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  update(_time: number, rawDelta: number): void {
    if (!this.player || !this.hud) return;

    let delta = clampDeltaMs(rawDelta);
    delta = this.feedback.update(delta);

    this.player.update(delta, this.enemies);
    for (const enemy of this.enemies) {
      enemy.update(delta, this.player);
    }

    if (this.player.lifecycle.consumeDeathEvent()) {
      // one-shot; HUD reacts via dead flag
    }

    this.hud.update({
      hp: this.player.stats.hp,
      maxHp: this.player.stats.maxHp,
      mp: this.player.stats.mp,
      maxMp: this.player.stats.maxMp,
      fps: this.game.loop.actualFps,
      dead: this.player.lifecycle.isDead,
    });
  }

  private handleRestart(): void {
    if (!this.player.lifecycle.isDead) return;
    this.restartCount += 1;
    this.player.respawn();
    // Soft-reset enemies that died; keep survivors where they are
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        enemy.destroy();
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive);
    // Respawn a few if map cleared
    if (this.enemies.length === 0) {
      this.enemies = this.blueprint.enemySpawns.map(
        (spawn) => new EnemyController(this, spawn, this.blueprint.map, this.feedback),
      );
    }
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

  /** Exposed for tests / diagnostics. */
  getRestartCount(): number {
    return this.restartCount;
  }

  /** Test hook — do not use in gameplay code. */
  getPlayerForTests(): PlayerController {
    return this.player;
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
