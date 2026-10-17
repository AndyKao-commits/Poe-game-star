import Phaser from 'phaser';
import {
  ATTACK_COOLDOWN_MS,
  AttackCooldown,
  filterTargetsInCone,
} from '@core/combat/attackCone';
import { AttackTimeline, type AttackTimelineConfig } from '@core/combat/attackTimeline';
import {
  applyDamage,
  calculateDamage,
  createPlayerStats,
  ENEMY_CRIT_CHANCE,
  type CombatStats,
} from '@core/combat/damage';
import { knockbackDelta } from '@core/combat/feedback';
import { Invulnerability, PLAYER_IFRAME_MS } from '@core/combat/invulnerability';
import { moveWithCollision, type TileMapData } from '@core/collision/grid';
import { createPlayerStateMachine } from '@core/entities/stateMachine';
import { PlayerLifecycle } from '@core/entities/playerLifecycle';
import { RESPAWN_GRACE_MS } from '@core/encounter/reset';
import { screenToWorld, worldToScreen, type Vec2 } from '@core/iso/coordinates';
import {
  facingFromAngle,
  facingFromVector,
  movementFromInput,
  type Facing,
} from '@core/movement/direction';
import { WorldEntity } from '../world/WorldEntity';
import type { CombatFeedbackSystem } from '../systems/CombatFeedback';

const MOVE_SPEED = 3.2;

export interface Attackable {
  alive: boolean;
  position: Vec2;
  takeDamage(
    attackerAttack: number,
    meta?: { attackerPos: Vec2 },
  ): { amount: number; isCrit: boolean; killed: boolean } | void;
}

export class PlayerController {
  readonly entity: WorldEntity;
  stats: CombatStats;
  readonly cooldown = new AttackCooldown(ATTACK_COOLDOWN_MS);
  readonly lifecycle = new PlayerLifecycle();
  readonly iframes = new Invulnerability(PLAYER_IFRAME_MS);
  readonly attackTimeline: AttackTimeline;
  private readonly sm = createPlayerStateMachine();
  private facing: Facing = 'se';
  private pendingTargets: Attackable[] = [];
  private readonly spawn: Vec2;
  private readonly cursors: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private deathVisualPlayed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    spawn: Vec2,
    private readonly map: TileMapData,
    private readonly feedback: CombatFeedbackSystem,
    attackConfig?: Partial<AttackTimelineConfig>,
  ) {
    this.spawn = { ...spawn };
    this.stats = createPlayerStats();
    this.attackTimeline = new AttackTimeline({
      moveLockMs: attackConfig?.moveLockMs ?? 280,
      hitFrameMs: attackConfig?.hitFrameMs ?? 120,
      actionMs: attackConfig?.actionMs ?? 320,
    });
    this.entity = new WorldEntity(scene, 'player', spawn);
    const keyboard = scene.input.keyboard!;
    this.cursors = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.playAnim('idle');
  }

  get position(): Vec2 {
    return this.entity.position;
  }

  get alive(): boolean {
    return !this.lifecycle.isDead && this.stats.hp > 0;
  }

  get animState(): string {
    return this.sm.state;
  }

  update(deltaMs: number, enemies: Attackable[]): void {
    this.iframes.update(deltaMs);
    this.cooldown.update(deltaMs);

    if (this.lifecycle.isDead) {
      this.ensureDeathVisual();
      this.entity.syncTransform();
      return;
    }

    const attackEvent = this.attackTimeline.update(deltaMs);
    if (attackEvent === 'hit') {
      this.resolveAttackHits();
    } else if (attackEvent === 'finished') {
      this.sm.tryTransition('idle');
      this.pendingTargets = [];
    }

    if (this.lifecycle.canAttack) {
      const pointer = this.scene.input.activePointer;
      if (pointer.leftButtonDown()) {
        this.tryAttack(enemies);
      }
    }

    if (this.lifecycle.canMove && !this.attackTimeline.moveLocked) {
      this.updateMovement(deltaMs);
    }

    this.entity.syncTransform();
  }

  private updateMovement(deltaMs: number): void {
    const input = {
      up: this.cursors.up.isDown,
      down: this.cursors.down.isDown,
      left: this.cursors.left.isDown,
      right: this.cursors.right.isDown,
    };
    const move = movementFromInput(input);
    if (!move.moving) {
      if (!this.attackTimeline.isActive) {
        this.sm.tryTransition('idle');
        this.playAnim('idle');
      }
      return;
    }

    this.sm.tryTransition('run');
    this.facing = facingFromVector(move.x, move.y);
    const dt = deltaMs / 1000;
    this.entity.position = moveWithCollision(this.map, this.entity.position, {
      x: move.x * MOVE_SPEED * dt,
      y: move.y * MOVE_SPEED * dt,
    });
    if (!this.attackTimeline.isActive) {
      this.playAnim('run');
    }
  }

  private tryAttack(enemies: Attackable[]): void {
    if (!this.lifecycle.canAttack) return;
    if (this.attackTimeline.isActive) return;
    if (!this.cooldown.ready) return;

    const aim = this.aimAngleWorld();
    if (!this.attackTimeline.tryBegin(aim)) return;
    this.cooldown.tryStart();

    this.facing = facingFromAngle(aim);
    this.sm.force('attack');
    this.pendingTargets = enemies.filter((e) => e.alive);
    this.playAnim('attack');
    this.spawnSlash(aim);
  }

  private resolveAttackHits(): void {
    const aim = this.attackTimeline.currentAimAngle;
    const hits = filterTargetsInCone(
      this.entity.position,
      aim,
      this.pendingTargets.filter((e) => e.alive),
    );
    for (const target of hits) {
      const result = target.takeDamage(this.stats.attack, {
        attackerPos: this.entity.position,
      });
      if (result && this.feedback.enabled) {
        this.feedback.floatDamage({
          amount: result.amount,
          isCrit: result.isCrit,
          world: { ...target.position },
        });
        this.feedback.requestHitPause();
      }
    }
  }

  /**
   * Apply incoming damage. Respects i-frames and death gate.
   * `amount` is already defense-resolved by the attacker brain.
   */
  takeDamage(
    amount: number,
    meta?: { attackerPos?: Vec2 },
  ): { accepted: boolean; died: boolean } {
    if (this.lifecycle.isDead || this.iframes.active || amount <= 0) {
      return { accepted: false, died: false };
    }

    const next = applyDamage(this.stats, amount);
    this.stats.hp = next.hp;
    this.iframes.trigger();
    this.feedback.flash(this.entity.sprite, 0xff8888);

    if (meta?.attackerPos && this.feedback.knockbackEnabled) {
      const kb = knockbackDelta(meta.attackerPos, this.entity.position, this.feedback.knockbackDistance);
      this.entity.position = moveWithCollision(this.map, this.entity.position, kb);
    }

    const died = this.lifecycle.tryDie(this.stats);
    if (died) {
      this.sm.force('dead');
      this.attackTimeline.reset();
      this.ensureDeathVisual();
    }
    return { accepted: true, died };
  }

  /** Used by enemy brains that pass attack power — shared GDD damage entry. */
  receiveAttack(
    attackerAttack: number,
    attackerPos: Vec2,
  ): { accepted: boolean; died: boolean; amount: number; isCrit: boolean } {
    if (this.lifecycle.isDead || this.iframes.active) {
      return { accepted: false, died: false, amount: 0, isCrit: false };
    }
    const roll = calculateDamage({
      baseAttack: attackerAttack,
      defense: this.stats.defense,
      critChance: ENEMY_CRIT_CHANCE,
    });
    const result = this.takeDamage(roll.amount, { attackerPos });
    if (result.accepted) {
      this.feedback.floatDamage({
        amount: roll.amount,
        isCrit: roll.isCrit,
        world: { ...this.entity.position },
      });
    }
    return { ...result, amount: roll.amount, isCrit: roll.isCrit };
  }

  respawn(): void {
    const restored = this.lifecycle.respawn(this.spawn);
    this.stats = restored.stats;
    this.entity.position = restored.position;
    this.cooldown.reset();
    this.attackTimeline.reset();
    this.pendingTargets = [];
    this.deathVisualPlayed = false;
    this.sm.force('idle');
    this.entity.sprite.setAlpha(1);
    this.entity.sprite.setVisible(true);
    this.entity.sprite.clearTint();
    this.entity.sprite.setAngle(0);
    // Grace i-frames so leftover enemy strike frames cannot land on frame 0
    this.iframes.clear();
    this.iframes.trigger(RESPAWN_GRACE_MS);
    this.playAnim('idle');
    this.entity.syncTransform();
  }

  private ensureDeathVisual(): void {
    if (this.deathVisualPlayed) return;
    this.deathVisualPlayed = true;
    this.entity.sprite.stop();
    this.entity.sprite.setTint(0x555555);
    this.scene.tweens.add({
      targets: this.entity.sprite,
      alpha: 0.35,
      angle: 90,
      duration: 450,
    });
  }

  private aimAngleWorld(): number {
    const cam = this.scene.cameras.main;
    const pointer = this.scene.input.activePointer;
    const screen = {
      x: pointer.worldX,
      y: pointer.worldY,
    };
    if (!Number.isFinite(screen.x) || !Number.isFinite(screen.y)) {
      screen.x = pointer.x / cam.zoom + cam.scrollX;
      screen.y = pointer.y / cam.zoom + cam.scrollY;
    }
    const world = screenToWorld(screen);
    return Math.atan2(world.y - this.entity.position.y, world.x - this.entity.position.x);
  }

  private spawnSlash(aimAngle: number): void {
    const ahead: Vec2 = {
      x: this.entity.position.x + Math.cos(aimAngle) * 0.7,
      y: this.entity.position.y + Math.sin(aimAngle) * 0.7,
    };
    const screen = worldToScreen(ahead);
    const slash = this.scene.add.image(screen.x, screen.y, 'slash');
    slash.setDepth(this.entity.sprite.depth + 1);
    slash.setAlpha(0.95);
    const screenDx = Math.cos(aimAngle) - Math.sin(aimAngle);
    const screenDy = (Math.cos(aimAngle) + Math.sin(aimAngle)) * 0.5;
    slash.setRotation(Math.atan2(screenDy, screenDx));
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.25,
      duration: 180,
      onComplete: () => slash.destroy(),
    });
  }

  private playAnim(kind: 'idle' | 'run' | 'attack'): void {
    const key = `player-${kind}-${this.facing}`;
    if (this.entity.sprite.anims.currentAnim?.key !== key) {
      this.entity.sprite.play(key, true);
    }
  }

  destroy(): void {
    this.entity.destroy();
  }
}
