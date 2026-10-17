import {
  applyDamage,
  calculateDamage,
  createEnemyStats,
  DEFAULT_CRIT_CHANCE,
  isDead,
  type CombatStats,
} from '@core/combat/damage';
import { knockbackDelta } from '@core/combat/feedback';
import { moveWithCollision, type TileMapData } from '@core/collision/grid';
import { createEnemyStateMachine } from '@core/entities/stateMachine';
import { stepArchetypeCombat } from '@core/ai/archetypeDriver';
import { EnemyAttackBrain } from '@core/ai/enemyAttack';
import type { EnemyArchetypeConfig } from '@core/ai/archetypes';
import type { Vec2 } from '@core/iso/coordinates';
import { WorldEntity } from '../world/WorldEntity';
import type { CombatFeedbackSystem } from '../systems/CombatFeedback';
import {
  archetypeForEncounter,
  CORRUPTED_CRAWLER,
  type EncounterEnemySpec,
} from '../encounters/enemyRoster';
import type Phaser from 'phaser';

export interface PlayerCombatTarget {
  position: Vec2;
  alive: boolean;
  receiveAttack(
    attackerAttack: number,
    attackerPos: Vec2,
  ): { accepted: boolean; died: boolean; amount: number; isCrit: boolean };
}

export interface EnemyControllerOptions {
  /** Encounter roster spec (Corrupted Crawler / Ruin Sentinel). */
  encounter?: EncounterEnemySpec;
  maxHp?: number;
  /** Injectable RNG for cautious commit chance (tests). */
  rng?: () => number;
}

export class EnemyController {
  readonly entity: WorldEntity;
  readonly stats: CombatStats;
  readonly brain: EnemyAttackBrain;
  readonly archetype: EnemyArchetypeConfig;
  readonly encounter: EncounterEnemySpec;
  private readonly sm = createEnemyStateMachine();
  private readonly rng: () => number;
  private dead = false;
  private readonly animationPrefix: 'crawler' | 'sentinel';
  private telegraphFx: Phaser.GameObjects.Image | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    spawn: Vec2,
    private readonly map: TileMapData,
    private readonly feedback: CombatFeedbackSystem,
    options: EnemyControllerOptions | number = {},
  ) {
    // Backward-compatible: `new EnemyController(..., maxHp)` still works.
    const opts: EnemyControllerOptions =
      typeof options === 'number' ? { maxHp: options } : options;

    this.encounter = opts.encounter ?? CORRUPTED_CRAWLER;
    this.archetype = archetypeForEncounter(this.encounter);
    this.rng = opts.rng ?? Math.random;
    this.brain = new EnemyAttackBrain(this.archetype.attack);
    this.stats = createEnemyStats(opts.maxHp ?? 40, 8, 2);
    this.animationPrefix = this.encounter.role === 'ruin_sentinel' ? 'sentinel' : 'crawler';
    this.entity = new WorldEntity(scene, this.animationPrefix, spawn);
    this.entity.sprite.play(`${this.animationPrefix}-idle`);
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

  get roleLabel(): string {
    return this.encounter.label;
  }

  update(
    deltaMs: number,
    player: PlayerCombatTarget,
    options: { suppressDamage?: boolean } = {},
  ): void {
    // Dead enemies must never chase, telegraph, or deal damage.
    if (this.dead || this.brain.isDead) return;

    const step = stepArchetypeCombat(this.map, {
      archetype: this.archetype,
      brain: this.brain,
      self: this.entity.position,
      target: player.position,
      deltaMs,
      rng: this.rng,
      targetAlive: player.alive,
    });

    this.entity.position = step.position;
    this.syncAnim(step.tick.phase, step.intent.type);

    if (
      step.tick.dealDamage &&
      this.alive &&
      player.alive &&
      !options.suppressDamage
    ) {
      player.receiveAttack(this.stats.attack, this.entity.position);
    }

    // Telegraph tint is driven only by the brain windup flag — the same path
    // that later emits dealDamage — so warning and hit stay in sync.
    if (step.tick.telegraphing) {
      this.showTelegraph();
      this.entity.sprite.setTint(this.encounter.telegraphTint);
    } else {
      this.hideTelegraph();
      if (!this.dead && this.brain.state !== 'hurt') this.entity.sprite.clearTint();
    }

    this.entity.syncTransform();
    if (this.telegraphFx?.visible) {
      this.telegraphFx.setPosition(this.entity.sprite.x, this.entity.sprite.y);
      this.telegraphFx.setDepth(this.entity.sprite.depth + 1);
    }
  }

  takeDamage(
    attackerAttack: number,
    meta?: { attackerPos: Vec2 },
  ): { amount: number; isCrit: boolean; killed: boolean } {
    if (this.dead) return { amount: 0, isCrit: false, killed: false };

    const roll = calculateDamage({
      baseAttack: attackerAttack,
      defense: this.stats.defense,
      critChance: DEFAULT_CRIT_CHANCE,
    });
    const next = applyDamage(this.stats, roll.amount);
    this.stats.hp = next.hp;
    this.brain.forceHurt(220);
    this.sm.force('hurt');
    this.feedback.flash(this.entity.sprite, 0xff6666);
    this.hideTelegraph();
    this.entity.syncTransform();
    this.showHitFx();

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
    this.hideTelegraph();
    this.dead = true;
    this.brain.forceDead();
    this.sm.force('dead');
    this.entity.sprite.clearTint();
    this.entity.sprite.setTint(0x444444);
    this.scene.tweens.add({
      targets: this.entity.sprite,
      alpha: 0,
      duration: 400,
      onComplete: () => this.entity.sprite.setVisible(false),
    });
  }

  private syncAnim(phase: string, intentType: string): void {
    const key =
      phase === 'windup'
        ? 'enemy-windup'
        : phase === 'attack'
          ? 'enemy-attack'
          : phase === 'hurt'
            ? 'enemy-hurt'
            : phase === 'chase' || intentType === 'chase' || intentType === 'retreat'
              ? 'enemy-chase'
              : phase === 'recovery'
                ? 'enemy-idle'
                : 'enemy-idle';
    this.play(`${this.animationPrefix}-${key.slice('enemy-'.length)}`);
  }

  private play(key: string): void {
    if (this.entity.sprite.anims.currentAnim?.key !== key) {
      this.entity.sprite.play(key, true);
    }
  }

  private showTelegraph(): void {
    if (!this.scene.textures.exists('art-d-telegraph')) return;
    if (!this.telegraphFx) {
      this.telegraphFx = this.scene.add.image(0, 0, 'art-d-telegraph').setAlpha(0.8);
    }
    this.telegraphFx.setPosition(this.entity.sprite.x, this.entity.sprite.y).setDepth(this.entity.sprite.depth + 1).setVisible(true);
  }

  private hideTelegraph(): void {
    this.telegraphFx?.setVisible(false);
  }

  private showHitFx(): void {
    if (!this.scene.textures.exists('art-d-hit')) return;
    const fx = this.scene.add.image(this.entity.sprite.x, this.entity.sprite.y, 'art-d-hit');
    fx.setDepth(this.entity.sprite.depth + 2);
    this.scene.tweens.add({ targets: fx, alpha: 0, duration: 180, onComplete: () => fx.destroy() });
  }

  destroy(): void {
    this.telegraphFx?.destroy();
    this.telegraphFx = null;
    this.entity.destroy();
  }
}
