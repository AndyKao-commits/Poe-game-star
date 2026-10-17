import Phaser from 'phaser';
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_ARC_DEGREES,
  ATTACK_RANGE,
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
import { deriveCombatStats, type EquipmentState } from '@core/equipment/equipment';
import { resolveAutoAimAngle } from '@core/input/autoAim';
import { worldToScreen, type Vec2 } from '@core/iso/coordinates';
import { facingFromAngle, facingFromVector, type Facing } from '@core/movement/direction';
import {
  createCasterState,
  setDead,
  tickCooldowns,
  tryCast,
  validateCast,
  type SkillCasterState,
} from '@core/skills/caster';
import { getSkillDefinition, type SkillId } from '@core/skills/definitions';
import type { SkillUiState } from '@core/skills/skillUi';
import { WorldEntity } from '../world/WorldEntity';
import type { CombatFeedbackSystem } from '../systems/CombatFeedback';
import type { InputController } from '../input/InputController';

const MOVE_SPEED = 3.2;
/** Collision-safe dodge dash length in world tiles. */
const DODGE_DISTANCE = 1.45;
/** Arc Burst uses a slightly wider / longer cone than basic / Q. */
const ARC_BURST_RANGE = 1.7;
const ARC_BURST_ARC_DEGREES = 150;

export interface Attackable {
  alive: boolean;
  position: Vec2;
  takeDamage(
    attackerAttack: number,
    meta?: { attackerPos: Vec2 },
  ): { amount: number; isCrit: boolean; killed: boolean } | void;
}

export type { SkillUiState };

export class PlayerController {
  readonly entity: WorldEntity;
  stats: CombatStats;
  private readonly nakedBase: CombatStats = createPlayerStats();
  private equipment: EquipmentState = {};
  readonly cooldown = new AttackCooldown(ATTACK_COOLDOWN_MS);
  readonly lifecycle = new PlayerLifecycle();
  readonly iframes = new Invulnerability(PLAYER_IFRAME_MS);
  readonly attackTimeline: AttackTimeline;
  private caster: SkillCasterState;
  private readonly sm = createPlayerStateMachine();
  private facing: Facing = 'se';
  private pendingTargets: Attackable[] = [];
  private readonly spawn: Vec2;
  private deathVisualPlayed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    spawn: Vec2,
    private readonly map: TileMapData,
    private readonly feedback: CombatFeedbackSystem,
    private readonly input: InputController,
    attackConfig?: Partial<AttackTimelineConfig>,
  ) {
    this.spawn = { ...spawn };
    this.stats = createPlayerStats();
    this.caster = createCasterState({
      maxMana: this.stats.maxMp,
      mana: this.stats.mp,
      maxStamina: 100,
      stamina: 100,
    });
    this.attackTimeline = new AttackTimeline({
      moveLockMs: attackConfig?.moveLockMs ?? 280,
      hitFrameMs: attackConfig?.hitFrameMs ?? 120,
      actionMs: attackConfig?.actionMs ?? 320,
    });
    this.entity = new WorldEntity(scene, 'player', spawn);
    this.playAnim('idle');
  }

  /** Re-derive from naked stats so swapping gear never stacks bonuses. */
  syncEquipment(equipment: EquipmentState, vitals: 'keep' | 'full' = 'keep'): void {
    this.equipment = equipment;
    const currentHp = this.stats.hp;
    const currentMp = this.stats.mp;
    const derived = deriveCombatStats(this.nakedBase, equipment);
    this.stats = {
      ...derived,
      hp: vitals === 'full' ? derived.maxHp : Math.min(currentHp, derived.maxHp),
      mp: vitals === 'full' ? derived.maxMp : Math.min(currentMp, derived.maxMp),
    };
    // Caster is the authoritative mana/cooldown state; preserve cooldowns on gear changes.
    this.caster = {
      ...this.caster,
      resources: {
        ...this.caster.resources,
        mana: this.stats.mp,
        maxMana: this.stats.maxMp,
      },
    };
  }

  get equipmentState(): EquipmentState {
    return this.equipment;
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

  /** Authoritative skill caster snapshot for tests / debug. */
  getCasterState(): SkillCasterState {
    return this.caster;
  }

  /** UI-readable cooldowns + resources (single MP authority synced to stats.mp). */
  getSkillUiState(): SkillUiState {
    const cooldownTotal: Record<SkillId, number> = {
      q: getSkillDefinition('q').cooldownMs,
      e: getSkillDefinition('e').cooldownMs,
      dodge: getSkillDefinition('dodge').cooldownMs,
    };
    const canCast: Record<SkillId, boolean> = { q: false, e: false, dodge: false };
    const failReason: Record<SkillId, string | null> = { q: null, e: null, dodge: null };
    for (const id of ['q', 'e', 'dodge'] as SkillId[]) {
      const check = validateCast(this.caster, id);
      canCast[id] = check.ok;
      failReason[id] = check.ok ? null : check.reason;
    }
    return {
      mana: this.caster.resources.mana,
      maxMana: this.caster.resources.maxMana,
      stamina: this.caster.resources.stamina,
      maxStamina: this.caster.resources.maxStamina,
      cooldowns: { ...this.caster.cooldowns },
      cooldownTotal,
      canCast,
      failReason,
      dead: this.caster.dead,
      disabled: this.caster.disabled,
    };
  }

  update(deltaMs: number, enemies: Attackable[]): void {
    this.iframes.update(deltaMs);
    this.cooldown.update(deltaMs);
    this.caster = tickCooldowns(this.caster, deltaMs);
    this.syncManaToStats();

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

    for (const skillId of sample.skillPresses) {
      this.trySkill(skillId, enemies, sample.touchActive || sample.moving);
    }

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

  private trySkill(skillId: SkillId, enemies: Attackable[], touchActive: boolean): void {
    if (!this.lifecycle.canAttack && skillId !== 'dodge') return;
    if (!this.lifecycle.canMove && skillId === 'dodge') return;

    this.pullManaFromStats();
    const result = tryCast(this.caster, skillId, {
      baseAttack: this.stats.attack,
      defense: 0,
    });
    this.caster = result.state;
    this.syncManaToStats();

    if (!result.ok) return;

    if (skillId === 'dodge') {
      this.applyDodge(result.iframeGrantedMs);
      return;
    }

    // Attack skills: resolve cone immediately with skill multiplier.
    const aim = this.resolveAim(enemies, touchActive);
    this.facing = facingFromAngle(aim);
    this.sm.force('attack');
    this.playAnim('attack');
    this.spawnSlash(aim);

    const def = result.skill;
    const range = skillId === 'e' ? ARC_BURST_RANGE : ATTACK_RANGE;
    const arcDegrees = skillId === 'e' ? ARC_BURST_ARC_DEGREES : ATTACK_ARC_DEGREES;
    const hits = filterTargetsInCone(
      this.entity.position,
      aim,
      enemies.filter((e) => e.alive),
      range,
      arcDegrees,
    );
    // Encode multiplier into the attack stat so EnemyController's GDD roll matches
    // baseAttack * skillMultiplier without changing the shared Attackable contract.
    const scaledAttack = this.stats.attack * def.skillMultiplier;
    for (const target of hits) {
      const hit = target.takeDamage(scaledAttack, {
        attackerPos: this.entity.position,
      });
      if (hit && this.feedback.enabled) {
        this.feedback.floatDamage({
          amount: hit.amount,
          isCrit: hit.isCrit,
          world: { ...target.position },
        });
        this.feedback.requestHitPause();
      }
    }
  }

  private applyDodge(iframeGrantedMs: number): void {
    if (iframeGrantedMs > 0) {
      this.iframes.trigger(iframeGrantedMs);
    }
    const angle = this.facingToAngle(this.facing);
    const delta = {
      x: Math.cos(angle) * DODGE_DISTANCE,
      y: Math.sin(angle) * DODGE_DISTANCE,
    };
    this.entity.position = moveWithCollision(this.map, this.entity.position, delta);
    this.feedback.flash(this.entity.sprite, 0xaaccff);
    this.playAnim('run');
  }

  private facingToAngle(facing: Facing): number {
    switch (facing) {
      case 'e':
        return 0;
      case 'se':
        return Math.PI * 0.25;
      case 's':
        return Math.PI * 0.5;
      case 'sw':
        return Math.PI * 0.75;
      case 'w':
        return Math.PI;
      case 'nw':
        return -Math.PI * 0.75;
      case 'n':
        return -Math.PI * 0.5;
      case 'ne':
        return -Math.PI * 0.25;
      default:
        return Math.PI * 0.25;
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
      this.caster = setDead(this.caster, true);
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
    this.caster = createCasterState({
      maxMana: this.stats.maxMp,
      mana: this.stats.mp,
      maxStamina: 100,
      stamina: 100,
      dead: false,
      disabled: false,
    });
    this.input.clearTouch();
    this.playAnim('idle');
    this.entity.syncTransform();
  }

  private pullManaFromStats(): void {
    this.caster = {
      ...this.caster,
      resources: {
        ...this.caster.resources,
        mana: this.stats.mp,
        maxMana: this.stats.maxMp,
      },
    };
  }

  private syncManaToStats(): void {
    this.stats.mp = this.caster.resources.mana;
    this.stats.maxMp = this.caster.resources.maxMana;
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
