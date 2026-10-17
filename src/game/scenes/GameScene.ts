import Phaser from 'phaser';
import { mapPixelBounds } from '@core/collision/grid';
import { createRuinTestMap } from '@core/map/ruinMap';
import { computeDamage } from '@core/combat/damage';
import { distance } from '@core/iso/coordinates';
import { HudController } from '@ui/hud';
import { EnemyController } from '../entities/EnemyController';
import { PlayerController } from '../entities/PlayerController';
import { renderTileMap } from '../map/TileRenderer';

export class GameScene extends Phaser.Scene {
  private player!: PlayerController;
  private enemies: EnemyController[] = [];
  private hud!: HudController;
  private enemyHitCooldown = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const blueprint = createRuinTestMap();
    renderTileMap(this, blueprint.map);

    this.player = new PlayerController(this, blueprint.playerSpawn, blueprint.map);
    this.enemies = blueprint.enemySpawns.map(
      (spawn) => new EnemyController(this, spawn, blueprint.map),
    );

    const bounds = mapPixelBounds(blueprint.map);
    const pad = 64;
    this.cameras.main.setBounds(
      bounds.minX - pad,
      bounds.minY - pad,
      bounds.maxX - bounds.minX + pad * 2,
      bounds.maxY - bounds.minY + pad * 2,
    );
    this.cameras.main.startFollow(this.player.entity.sprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(this.computeZoom());

    this.scale.on('resize', () => {
      this.cameras.main.setZoom(this.computeZoom());
    });

    const hudRoot = document.getElementById('hud-root');
    if (!hudRoot) throw new Error('Missing #hud-root');
    this.hud = new HudController(hudRoot);
  }

  update(_time: number, delta: number): void {
    if (!this.player) return;

    this.player.update(delta, this.enemies);
    for (const enemy of this.enemies) {
      enemy.update(delta, this.player.position);
    }

    this.enemyHitCooldown = Math.max(0, this.enemyHitCooldown - delta);
    if (this.player.alive && this.enemyHitCooldown <= 0) {
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (distance(enemy.position, this.player.position) <= 0.7) {
          const dmg = computeDamage(enemy.stats.attack, this.player.stats.defense);
          this.player.takeDamage(dmg);
          this.enemyHitCooldown = 700;
          break;
        }
      }
    }

    this.hud.update({
      hp: this.player.stats.hp,
      maxHp: this.player.stats.maxHp,
      mp: this.player.stats.mp,
      maxMp: this.player.stats.maxMp,
      fps: this.game.loop.actualFps,
    });
  }

  private computeZoom(): number {
    // Keep tile readability across browser sizes / DPI scaling
    const base = Math.min(this.scale.width / 960, this.scale.height / 540);
    return Phaser.Math.Clamp(base * 1.35, 0.85, 2.2);
  }
}
