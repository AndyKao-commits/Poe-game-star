import {
  applyDamage,
  createEnemyStats,
  isDead,
  rollDamage,
  type CombatStats,
} from '@core/combat/damage';
import { knockbackDelta } from '@core/combat/feedback';
import { moveWithCollision, type TileMapData } from '@core/collision/grid';
import { createEnemyStateMachine } from '@core/entities/stateMachine';
import { chaseVelocity } from '@core/ai/chase';
import { EnemyAttackBrain } from '@core/ai/enemyAttack';
import type { Vec2 } from '@core/iso/coordinates';
import { WorldEntity } from '../world/WorldEntity';
import type { CombatFeedbackSystem } from '../systems/CombatFeedback';
import type Phaser from 'phaser';

export interface PlayerCombatTarget {
  position: Vec2;
  alive: boolean;
  receiveAttack(
    attackerAttack: number,
    attackerPos: Vec2,
  ): { accepted: boolean; died: boolean; amount: number; isCrit: boolean };
}

export class EnemyController {
  readonly entity: WorldEntity;
  readonly stats: CombatStats;
  readonly brain = new EnemyAttackBrain();
  private readonly sm = createEnemyStateMachine();
  private dead = false;

  constructor(
    private readonly scene: Phaser.Scene,
    spawn: Vec2,
    private readonly map: TileMapData,
    private readonly feedback: CombatFeedbackSystem,
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

  get combatPhase(): string {
    return this.brain.state;
  }

  update(deltaMs: number, player: PlayerCombatTarget): void {
    if (this.dead) return;

    const tick = this.brain.update(deltaMs, this.entity.position, player.position);
    this.syncAnim(tick.phase);

    if (tick.dealDamage && player.alive) {
      player.receiveAttack(this.stats.attack, this.entity.position);
    }

    if (tick.canMove && player.alive) {
      const chase = chaseVelocity(this.entity.position, player.position);
      if (chase.x !== 0 || chase.y !== 0) {
        const dt = deltaMs / 1000;
        this.entity.position = moveWithCollision(this.map, this.entity.position, {
          x: chase.x * dt,
          y: chase.y * dt,
        });
      }
    }

    if (tick.telegraphing) {
      this.entity.sprite.setTint(0xffcc44);
    } else if (!this.dead && this.brain.state !== 'hurt') {
      this.entity.sprite.clearTint();
    }

    this.entity.syncTransform();
  }

  takeDamage(
    attackerAttack: number,
    meta?: { attackerPos: Vec2 },
  ): { amount: number; isCrit: boolean; killed: boolean } {
    if (this.dead) return { amount: 0, isCrit: false, killed: false };

    const roll = rollDamage(attackerAttack, this.stats.defense);
    const next = applyDamage(this.stats, roll.amount);
    this.stats.hp = next.hp;
    this.brain.forceHurt(220);
    this.sm.force('hurt');
    this.feedback.flash(this.entity.sprite, 0xff6666);

    if (meta?.attackerPos && this.feedback.knockbackEnabled) {
      const kb = knockbackDelta(
        meta.attackerPos,
        this.entity.position,
        this.feedback.knockbackDistance,
      );
      this.entity.position = moveWithCollision(this.map, this.entity.position, kb);
    }

    const killed = isDead(this.stats);
    if (killed) {
      this.die();
    }
    return { amount: roll.amount, isCrit: roll.isCrit, killed };
  }

  private die(): void {
    this.dead = true;
    this.brain.forceDead();
    this.sm.force('dead');
    this.entity.sprite.setTint(0x444444);
    this.scene.tweens.add({
      targets: this.entity.sprite,
      alpha: 0,
      duration: 400,
      onComplete: () => this.entity.sprite.setVisible(false),
    });
  }

  private syncAnim(phase: string): void {
    const key =
      phase === 'windup'
        ? 'enemy-windup'
        : phase === 'attack'
          ? 'enemy-attack'
          : phase === 'hurt'
            ? 'enemy-hurt'
            : phase === 'chase'
              ? 'enemy-chase'
              : phase === 'recovery'
                ? 'enemy-idle'
                : 'enemy-idle';
    this.play(key);
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
