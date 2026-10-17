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
import {
  deriveCombatStats,
  type EquipmentState,
} from '@core/equipment/equipment';
import { resolveAutoAimAngle } from '@core/input/autoAim';
import { worldToScreen, type Vec2 } from '@core/iso/coordinates';
import { facingFromAngle, facingFromVector, type Facing } from '@core/movement/direction';
import { WorldEntity } from '../world/WorldEntity';
import type { CombatFeedbackSystem } from '../systems/CombatFeedback';
import type { InputController } from '../input/InputController';

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
  /** Live combat stats (naked base + equipment). Never stack bonuses onto this. */
  stats: CombatStats;
  readonly cooldown = new AttackCooldown(ATTACK_COOLDOWN_MS);
  readonly lifecycle = new PlayerLifecycle();
  readonly iframes = new Invulnerability(PLAYER_IFRAME_MS);
  readonly attackTimeline: AttackTimeline;
  private readonly sm = createPlayerStateMachine();
  private facing: Facing = 'se';
  private pendingTargets: Attackable[] = [];
  private readonly spawn: Vec2;
  private deathVisualPlayed = false;
  /** Naked template maxima/offense — equipment is re-derived from this each sync. */
  private nakedBase: CombatStats = createPlayerStats();
  private equipment: EquipmentState = {};

  constructor(
    private readonly scene: Phaser.Scene,
    spawn: Vec2,
    private readonly map: TileMapData,
    private readonly feedback: CombatFeedbackSystem,
    private readonly input: InputController,
    attackConfig?: Partial<AttackTimelineConfig>,
  ) {
    this.spawn = { ...spawn };
    this.nakedBase = createPlayerStats();
    this.stats = { ...this.nakedBase };
    this.attackTimeline = new AttackTimeline({
      moveLockMs: attackConfig?.moveLockMs ?? 280,
      hitFrameMs: attackConfig?.hitFrameMs ?? 120,
      actionMs: attackConfig?.actionMs ?? 320,
    });
    this.entity = new WorldEntity(scene, 'player', spawn);
    this.playAnim('idle');
  }

  get equipmentState(): EquipmentState {
    return this.equipment;
  }

  /**
   * Recompute live stats from naked base + equipment.
   * `keep` preserves current HP/MP (clamped); `full` restores to derived maxima (respawn).
   */
  syncEquipment(equipment: EquipmentState, vitals: 'keep' | 'full' = 'keep'): void {
    this.equipment = equipment;
    this.nakedBase = createPlayerStats();
    if (vitals === 'full') {
      this.stats = deriveCombatStats(this.nakedBase, equipment);
      this.stats = {
        ...this.stats,
        hp: this.stats.maxHp,
        mp: this.stats.maxMp,
      };
      return;
    }
    this.stats = deriveCombatStats(
      { ...this.nakedBase, hp: this.stats.hp, mp: this.stats.mp },
      equipment,
    );
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

  get currentFacing(): Facing {
    return this.facing;
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

    const sample = this.input.sample();

    if (this.lifecycle.canAttack && sample.attackHeld) {
      this.tryAttack(enemies, sample.touchActive);
    }

    if (this.lifecycle.canMove && !this.attackTimeline.moveLocked) {
      this.updateMovement(deltaMs, sample.moveX, sample.moveY, sample.moving);
    }

    this.entity.syncTransform();
  }

  private updateMovement(
    deltaMs: number,
    moveX: number,
    moveY: number,
    moving: boolean,
  ): void {
    if (!moving) {
      if (!this.attackTimeline.isActive) {
        this.sm.tryTransition('idle');
        this.playAnim('idle');
      }
      return;
    }

    this.sm.tryTransition('run');
    this.facing = facingFromVector(moveX, moveY);
    const dt = deltaMs / 1000;
    this.entity.position = moveWithCollision(this.map, this.entity.position, {
      x: moveX * MOVE_SPEED * dt,
      y: moveY * MOVE_SPEED * dt,
    });
    if (!this.attackTimeline.isActive) {
      this.playAnim('run');
    }
  }

  private tryAttack(enemies: Attackable[], touchActive: boolean): void {
    if (!this.lifecycle.canAttack) return;
    if (this.attackTimeline.isActive) return;
    if (!this.cooldown.ready) return;

    const aim = this.resolveAim(enemies, touchActive);
    if (!this.attackTimeline.tryBegin(aim)) return;
    this.cooldown.tryStart();

    this.facing = facingFromAngle(aim);
    this.sm.force('attack');
    this.pendingTargets = enemies.filter((e) => e.alive);
    this.playAnim('attack');
    this.spawnSlash(aim);
  }

  private resolveAim(enemies: Attackable[], touchActive: boolean): number {
    if (touchActive) {
      return resolveAutoAimAngle(this.entity.position, this.facing, enemies);
    }
    const mouseWorld = this.input.sampleMouseWorld();
    if (mouseWorld) {
      return Math.atan2(
        mouseWorld.y - this.entity.position.y,
        mouseWorld.x - this.entity.position.x,
      );
    }
    return resolveAutoAimAngle(this.entity.position, this.facing, enemies);
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
      this.input.clearTouch();
      this.ensureDeathVisual();
    }
    return { accepted: true, died };
  }

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
    // Apply naked vitals first, then re-derive with persisted equipment (full heal).
    this.nakedBase = restored.stats;
    this.stats = restored.stats;
    this.syncEquipment(this.equipment, 'full');
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
    this.iframes.clear();
    this.iframes.trigger(RESPAWN_GRACE_MS);
    this.input.clearTouch();
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
