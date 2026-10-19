/**
 * Rebirth combat vertical slice — gameplay domain model, independent of Phaser
 * and any temporary/legacy artwork. NOT registered in the public entry scene.
 */
export interface Vec2 { x: number; y: number }
export type Action = 'basic' | 'punch' | 'dash';
export interface CombatActor {
  position: Vec2;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  facing: Vec2;
  lastCastAt: number;
  readyAt: Record<Action, number>;
}
export interface CombatEnemy {
  id: string;
  position: Vec2;
  hp: number;
  defense: number;
}
export interface CombatResult {
  ok: boolean;
  reason?: 'cooldown' | 'mana' | 'no-target' | 'dead' | 'invalid-time';
  action: Action;
  targetId?: string;
  damage?: number;
  destination?: Vec2;
}
export const COMBAT_RULES = Object.freeze({
  basic: { mp: 0, cooldown: 450, multiplier: 1, range: 72 },
  punch: { mp: 15, cooldown: 5000, multiplier: 2.2, range: 92 },
  dash: { mp: 10, cooldown: 7000, distance: 100 },
  mpRegenPerSecond: 4,
  regenDelayMs: 2000,
});

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Deterministic closest living target, with stable ID tie-breaking. */
export function nearestTarget(
  position: Vec2, enemies: readonly CombatEnemy[], range: number,
): CombatEnemy | undefined {
  if (!Number.isFinite(range) || range < 0) throw new Error('Invalid range');
  return enemies.filter(enemy => enemy.hp > 0 && distance(position, enemy.position) <= range)
    .sort((a, b) => distance(position, a.position) - distance(position, b.position) || a.id.localeCompare(b.id))[0];
}

export function damageFor(attack: number, multiplier: number, defense: number): number {
  if (![attack, multiplier, defense].every(Number.isFinite) ||
      attack < 0 || multiplier < 0 || defense < 0) throw new Error('Invalid damage input');
  return Math.max(1, Math.floor(attack * multiplier * 100 / (100 + 5 * defense)));
}

export function createPlayer(position: Vec2 = { x: 0, y: 0 }): CombatActor {
  return {
    position: { ...position }, hp: 120, maxHp: 120, mp: 60, maxMp: 60,
    attack: 12, defense: 4, facing: { x: 0, y: 1 },
    lastCastAt: Number.NEGATIVE_INFINITY,
    readyAt: { basic: 0, punch: 0, dash: 0 },
  };
}

export function regenerateMana(actor: CombatActor, deltaMs: number, nowMs: number): void {
  if (!Number.isFinite(deltaMs) || deltaMs < 0 || !Number.isFinite(nowMs)) {
    throw new Error('Invalid regen timing');
  }
  if (actor.hp <= 0 || nowMs - actor.lastCastAt < COMBAT_RULES.regenDelayMs) return;
  actor.mp = Math.min(actor.maxMp, actor.mp + COMBAT_RULES.mpRegenPerSecond * deltaMs / 1000);
}

/**
 * Mutates actor/enemy only on successful action. Dash moves in normalized facing
 * direction and must be collision-clamped by the future Phaser world adapter.
 */
export function performAction(
  actor: CombatActor, action: Action, enemies: CombatEnemy[], nowMs: number,
): CombatResult {
  if (!Number.isFinite(nowMs) || nowMs < 0) return { ok: false, action, reason: 'invalid-time' };
  if (actor.hp <= 0) return { ok: false, action, reason: 'dead' };
  if (nowMs < actor.readyAt[action]) return { ok: false, action, reason: 'cooldown' };
  const rule = COMBAT_RULES[action];
  if (actor.mp < rule.mp) return { ok: false, action, reason: 'mana' };
  if (action === 'dash') {
    const length = Math.hypot(actor.facing.x, actor.facing.y);
    if (!Number.isFinite(length) || length === 0) return { ok: false, action, reason: 'no-target' };
    const destination = {
      x: actor.position.x + actor.facing.x / length * COMBAT_RULES.dash.distance,
      y: actor.position.y + actor.facing.y / length * COMBAT_RULES.dash.distance,
    };
    actor.position = destination;
    actor.mp -= rule.mp;
    actor.readyAt[action] = nowMs + rule.cooldown;
    actor.lastCastAt = nowMs;
    return { ok: true, action, destination };
  }
  const target = nearestTarget(actor.position, enemies, rule.range);
  if (!target) return { ok: false, action, reason: 'no-target' };
  const damage = damageFor(actor.attack, rule.multiplier, target.defense);
  target.hp = Math.max(0, target.hp - damage);
  actor.mp -= rule.mp;
  actor.readyAt[action] = nowMs + rule.cooldown;
  if (rule.mp > 0) actor.lastCastAt = nowMs;
  return { ok: true, action, targetId: target.id, damage };
}
