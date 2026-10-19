import {
  createPlayer, damageFor, distance, performAction, regenerateMana,
  type Action, type CombatActor, type CombatEnemy, type CombatResult, type Vec2,
} from './alphaCombat';
import { movementVelocity, type StickVector } from '../input/touchControls';

/** Domain-only first alley encounter; intentionally independent of artwork/Phaser. */
export interface AlleyEnemy extends CombatEnemy {
  maxHp: number;
  attack: number;
  speed: number;
  reach: number;
  telegraphMs: number;
  recoveryMs: number;
  phase: 'chase' | 'telegraph' | 'recovery';
  phaseEndsAt: number;
}
export type AlleyEvent =
  | { kind: 'windup'; enemyId: string; until: number }
  | { kind: 'player-hit'; enemyId: string; damage: number; hp: number }
  | { kind: 'enemy-defeated'; enemyId: string }
  | { kind: 'player-defeated' }
  | { kind: 'attack'; action: Action; targetId?: string; damage?: number };
export interface AlleySnapshot {
  player: CombatActor;
  enemies: AlleyEnemy[];
  events: AlleyEvent[];
  cleared: boolean;
  defeated: boolean;
}
export interface AlleyBounds { minX: number; maxX: number; minY: number; maxY: number }
export const ALLEY_BOUNDS: Readonly<AlleyBounds> = Object.freeze({
  minX: 24, maxX: 456, minY: 24, maxY: 246,
});
const MAX_STEP_MS = 50;

function clampToBounds(point: Vec2, bounds: AlleyBounds): Vec2 {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, point.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, point.y)),
  };
}
function assertBounds(bounds: AlleyBounds): void {
  if (![bounds.minX, bounds.maxX, bounds.minY, bounds.maxY].every(Number.isFinite) ||
      bounds.minX >= bounds.maxX || bounds.minY >= bounds.maxY) {
    throw new Error('Invalid alley bounds');
  }
}
export function createAlleyEnemies(): AlleyEnemy[] {
  return [
    {
      id: 'fire-brawler-01', position: { x: 352, y: 114 }, hp: 45, maxHp: 45,
      defense: 1, attack: 9, speed: 56, reach: 36, telegraphMs: 500,
      recoveryMs: 800, phase: 'chase', phaseEndsAt: 0,
    },
    {
      id: 'fire-brawler-02', position: { x: 376, y: 192 }, hp: 45, maxHp: 45,
      defense: 1, attack: 9, speed: 52, reach: 36, telegraphMs: 500,
      recoveryMs: 800, phase: 'chase', phaseEndsAt: 0,
    },
  ];
}

/**
 * The 50ms simulation cap prevents tab-resume teleportation and huge collision
 * jumps. A future scene adapter will add solid wall and prop collision.
 */
export class RebirthAlleyEncounter {
  readonly player: CombatActor;
  readonly enemies: AlleyEnemy[];
  readonly bounds: AlleyBounds;
  private lastTimeMs: number | null = null;
  private defeatedReported = false;
  private defeatedEnemyIds = new Set<string>();
  private events: AlleyEvent[] = [];

  constructor(
    player: CombatActor = createPlayer({ x: 110, y: 140 }),
    enemies: AlleyEnemy[] = createAlleyEnemies(),
    bounds: AlleyBounds = ALLEY_BOUNDS,
  ) {
    assertBounds(bounds);
    this.player = player;
    this.enemies = enemies;
    this.bounds = { ...bounds };
    this.player.position = clampToBounds(this.player.position, this.bounds);
  }

  action(action: Action, nowMs: number): CombatResult {
    const result = performAction(this.player, action, this.enemies, nowMs);
    if (!result.ok) return result;
    if (result.destination) this.player.position = clampToBounds(result.destination, this.bounds);
    this.events.push({ kind: 'attack', action, targetId: result.targetId, damage: result.damage });
    this.recordDefeats();
    return result;
  }

  tick(nowMs: number, stick: StickVector): AlleySnapshot {
    if (!Number.isFinite(nowMs) || nowMs < 0 ||
        (this.lastTimeMs !== null && nowMs < this.lastTimeMs)) {
      throw new Error('Nonmonotonic alley time');
    }
    const deltaMs = this.lastTimeMs === null ? 0 : Math.min(MAX_STEP_MS, nowMs - this.lastTimeMs);
    this.lastTimeMs = nowMs;
    if (this.player.hp > 0) {
      const velocity = movementVelocity(stick);
      this.player.position = clampToBounds({
        x: this.player.position.x + velocity.x * deltaMs / 1000,
        y: this.player.position.y + velocity.y * deltaMs / 1000,
      }, this.bounds);
      if (Math.hypot(velocity.x, velocity.y) > 0.1) {
        const length = Math.hypot(velocity.x, velocity.y);
        this.player.facing = { x: velocity.x / length, y: velocity.y / length };
      }
      regenerateMana(this.player, deltaMs, nowMs);
      for (const enemy of this.enemies) this.advanceEnemy(enemy, nowMs, deltaMs);
    }
    this.recordDefeats();
    if (this.player.hp <= 0 && !this.defeatedReported) {
      this.defeatedReported = true;
      this.events.push({ kind: 'player-defeated' });
    }
    return this.snapshot();
  }

  private advanceEnemy(enemy: AlleyEnemy, nowMs: number, deltaMs: number): void {
    if (enemy.hp <= 0) return;
    const gap = distance(enemy.position, this.player.position);
    if (enemy.phase === 'recovery') {
      if (nowMs >= enemy.phaseEndsAt) enemy.phase = 'chase';
      else return;
    }
    if (enemy.phase === 'telegraph') {
      if (nowMs < enemy.phaseEndsAt) return;
      // Attack resolves once, with range rechecked to allow dodging.
      if (gap <= enemy.reach) {
        const damage = damageFor(enemy.attack, 1, this.player.defense);
        this.player.hp = Math.max(0, this.player.hp - damage);
        this.events.push({ kind: 'player-hit', enemyId: enemy.id, damage, hp: this.player.hp });
      }
      enemy.phase = 'recovery';
      enemy.phaseEndsAt = nowMs + enemy.recoveryMs;
      return;
    }
    if (gap <= enemy.reach) {
      enemy.phase = 'telegraph';
      enemy.phaseEndsAt = nowMs + enemy.telegraphMs;
      this.events.push({ kind: 'windup', enemyId: enemy.id, until: enemy.phaseEndsAt });
      return;
    }
    if (gap > 0) {
      const travel = Math.min(Math.max(0, gap - enemy.reach), enemy.speed * deltaMs / 1000);
      enemy.position = clampToBounds({
        x: enemy.position.x + (this.player.position.x - enemy.position.x) / gap * travel,
        y: enemy.position.y + (this.player.position.y - enemy.position.y) / gap * travel,
      }, this.bounds);
    }
  }

  private recordDefeats(): void {
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 && !this.defeatedEnemyIds.has(enemy.id)) {
        this.defeatedEnemyIds.add(enemy.id);
        this.events.push({ kind: 'enemy-defeated', enemyId: enemy.id });
      }
    }
  }

  snapshot(): AlleySnapshot {
    const events = this.events.splice(0);
    return {
      player: { ...this.player, position: { ...this.player.position }, facing: { ...this.player.facing },
        readyAt: { ...this.player.readyAt } },
      enemies: this.enemies.map(enemy => ({ ...enemy, position: { ...enemy.position } })),
      events,
      cleared: this.enemies.every(enemy => enemy.hp <= 0),
      defeated: this.player.hp <= 0,
    };
  }
}
