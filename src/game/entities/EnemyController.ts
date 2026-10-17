import {
  applyDamage,
  computeDamage,
  createEnemyStats,
  isDead,
  type CombatStats,
} from '@core/combat/damage';
import { moveWithCollision, type TileMapData } from '@core/collision/grid';
import { createEnemyStateMachine } from '@core/entities/stateMachine';
import { chaseVelocity } from '@core/ai/chase';
import type { Vec2 } from '@core/iso/coordinates';
import { WorldEntity } from '../world/WorldEntity';
import type Phaser from 'phaser';

export class EnemyController {
  readonly entity: WorldEntity;
  readonly stats: CombatStats;
  private readonly sm = createEnemyStateMachine();
  private hurtLockMs = 0;
  private dead = false;

  constructor(
    scene: Phaser.Scene,
    spawn: Vec2,
    private readonly map: TileMapData,
    maxHp = 40,
  ) {
    this.stats = createEnemyStats(maxHp, 8, 2);
    this.entity = new WorldEntity(scene, 'enemy', spawn);
    this.entity.sprite.play('enemy-idle');
  }

  get position(): Vec2 {
    return this.entity.position;
  }

  get alive(): boolean {
    return !this.dead && !isDead(this.stats);
  }

  update(deltaMs: number, playerPos: Vec2): void {
    if (this.dead) return;

    if (this.hurtLockMs > 0) {
      this.hurtLockMs = Math.max(0, this.hurtLockMs - deltaMs);
      if (this.hurtLockMs === 0 && this.alive) {
        this.sm.tryTransition('chase');
      }
      this.entity.syncTransform();
      return;
    }

    const chase = chaseVelocity(this.entity.position, playerPos);
    if (chase.chasing || chase.x !== 0 || chase.y !== 0) {
      this.sm.tryTransition('chase');
      const dt = deltaMs / 1000;
      this.entity.position = moveWithCollision(this.map, this.entity.position, {
        x: chase.x * dt,
        y: chase.y * dt,
      });
      this.play('enemy-chase');
    } else {
      this.sm.tryTransition('idle');
      this.play('enemy-idle');
    }
    this.entity.syncTransform();
  }

  /** Apply attack power through defense. */
  takeDamage(attackerAttack: number): void {
    if (this.dead) return;
    const amount = computeDamage(attackerAttack, this.stats.defense);
    const next = applyDamage(this.stats, amount);
    this.stats.hp = next.hp;
    this.entity.sprite.setTint(0xff6666);
    this.sm.force('hurt');
    this.play('enemy-hurt');
    this.hurtLockMs = 220;

    if (isDead(this.stats)) {
      this.die();
    } else {
      this.entity.sprite.scene.time.delayedCall(120, () => {
        if (!this.dead) this.entity.sprite.clearTint();
      });
    }
  }

  private die(): void {
    this.dead = true;
    this.sm.force('dead');
    this.entity.sprite.setTint(0x444444);
    this.entity.sprite.scene.tweens.add({
      targets: this.entity.sprite,
      alpha: 0,
      duration: 400,
      onComplete: () => this.entity.sprite.setVisible(false),
    });
  }

  private play(key: string): void {
    if (this.entity.sprite.anims.currentAnim?.key !== key) {
      this.entity.sprite.play(key, true);
    }
  }

  destroy(): void {
    this.entity.destroy();
  }
}
