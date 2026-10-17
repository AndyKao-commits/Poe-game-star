import Phaser from 'phaser';
import {
  ATTACK_COOLDOWN_MS,
  AttackCooldown,
  filterTargetsInCone,
} from '@core/combat/attackCone';
import {
  applyDamage,
  createPlayerStats,
  type CombatStats,
} from '@core/combat/damage';
import { moveWithCollision, type TileMapData } from '@core/collision/grid';
import { createPlayerStateMachine } from '@core/entities/stateMachine';
import { screenToWorld, worldToScreen, type Vec2 } from '@core/iso/coordinates';
import {
  facingFromAngle,
  facingFromVector,
  movementFromInput,
  type Facing,
} from '@core/movement/direction';
import { WorldEntity } from '../world/WorldEntity';

const MOVE_SPEED = 3.2;

export interface Attackable {
  alive: boolean;
  position: Vec2;
  takeDamage(attackerAttack: number): void;
}

export class PlayerController {
  readonly entity: WorldEntity;
  readonly stats: CombatStats;
  readonly cooldown = new AttackCooldown(ATTACK_COOLDOWN_MS);
  private readonly sm = createPlayerStateMachine();
  private facing: Facing = 'se';
  private attackLockMs = 0;
  private readonly cursors: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  constructor(
    private readonly scene: Phaser.Scene,
    spawn: Vec2,
    private readonly map: TileMapData,
  ) {
    this.stats = createPlayerStats();
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
    return this.stats.hp > 0;
  }

  update(deltaMs: number, enemies: Attackable[]): void {
    this.cooldown.update(deltaMs);
    if (this.attackLockMs > 0) {
      this.attackLockMs = Math.max(0, this.attackLockMs - deltaMs);
      if (this.attackLockMs === 0 && this.sm.state === 'attack') {
        this.sm.tryTransition('idle');
      }
    }

    const pointer = this.scene.input.activePointer;
    if (pointer.leftButtonDown()) {
      this.tryAttack(enemies);
    }

    if (this.sm.state !== 'attack') {
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
      this.sm.tryTransition('idle');
      this.playAnim('idle');
      return;
    }

    this.sm.tryTransition('run');
    this.facing = facingFromVector(move.x, move.y);
    const dt = deltaMs / 1000;
    const next = moveWithCollision(this.map, this.entity.position, {
      x: move.x * MOVE_SPEED * dt,
      y: move.y * MOVE_SPEED * dt,
    });
    this.entity.position = next;
    this.playAnim('run');
  }

  private tryAttack(enemies: Attackable[]): void {
    if (!this.cooldown.tryStart()) return;

    const aim = this.aimAngleWorld();
    this.facing = facingFromAngle(aim);
    this.sm.force('attack');
    this.attackLockMs = 220;
    this.playAnim('idle');
    this.spawnSlash(aim);

    const hits = filterTargetsInCone(
      this.entity.position,
      aim,
      enemies.filter((e) => e.alive),
    );
    for (const target of hits) {
      target.takeDamage(this.stats.attack);
    }
  }

  takeDamage(amount: number): void {
    const next = applyDamage(this.stats, amount);
    this.stats.hp = next.hp;
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

  private playAnim(kind: 'idle' | 'run'): void {
    const key = `player-${kind}-${this.facing}`;
    if (this.entity.sprite.anims.currentAnim?.key !== key) {
      this.entity.sprite.play(key, true);
    }
  }
}
