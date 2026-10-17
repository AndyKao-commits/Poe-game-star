import { angleBetween, distance, type Vec2 } from '../iso/coordinates';

export const ATTACK_COOLDOWN_MS = 550;
export const ATTACK_RANGE = 1.35;
export const ATTACK_ARC_DEGREES = 120;

function normalizeAngle(radians: number): number {
  const tau = Math.PI * 2;
  let a = radians % tau;
  if (a < 0) a += tau;
  return a;
}

function shortestAngleDelta(a: number, b: number): number {
  const tau = Math.PI * 2;
  let d = normalizeAngle(b) - normalizeAngle(a);
  if (d > Math.PI) d -= tau;
  if (d < -Math.PI) d += tau;
  return d;
}

export interface ConeHitQuery {
  origin: Vec2;
  /** World-space aim angle in radians (atan2). */
  aimAngle: number;
  target: Vec2;
  range?: number;
  arcDegrees?: number;
}

/** True if target lies inside the attack fan in front of the attacker. */
export function isInsideAttackCone(query: ConeHitQuery): boolean {
  const range = query.range ?? ATTACK_RANGE;
  const arcDegrees = query.arcDegrees ?? ATTACK_ARC_DEGREES;
  const dist = distance(query.origin, query.target);

  if (dist > range) return false;
  if (dist < 0.15) return true;

  const toTarget = angleBetween(query.origin, query.target);
  const halfArc = ((arcDegrees / 2) * Math.PI) / 180;
  return Math.abs(shortestAngleDelta(query.aimAngle, toTarget)) <= halfArc;
}

export function filterTargetsInCone<T extends { position: Vec2 }>(
  origin: Vec2,
  aimAngle: number,
  targets: T[],
  range = ATTACK_RANGE,
  arcDegrees = ATTACK_ARC_DEGREES,
): T[] {
  return targets.filter((t) =>
    isInsideAttackCone({
      origin,
      aimAngle,
      target: t.position,
      range,
      arcDegrees,
    }),
  );
}

export class AttackCooldown {
  private remainingMs = 0;

  constructor(private readonly cooldownMs: number = ATTACK_COOLDOWN_MS) {}

  get ready(): boolean {
    return this.remainingMs <= 0;
  }

  get remaining(): number {
    return this.remainingMs;
  }

  tryStart(): boolean {
    if (!this.ready) return false;
    this.remainingMs = this.cooldownMs;
    return true;
  }

  update(deltaMs: number): void {
    if (this.remainingMs > 0) {
      this.remainingMs = Math.max(0, this.remainingMs - deltaMs);
    }
  }

  reset(): void {
    this.remainingMs = 0;
  }
}
