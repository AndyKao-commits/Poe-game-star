import { angleBetween, distance, type Vec2 } from '../iso/coordinates';
import type { Facing } from '../movement/direction';
import { FACING_ORDER } from '../movement/direction';

export interface AimCandidate {
  alive: boolean;
  position: Vec2;
}

export const DEFAULT_AUTO_AIM_RANGE = 4.5;

/** Prefer the nearest living enemy inside range; otherwise keep last facing. */
export function resolveAutoAimAngle(
  origin: Vec2,
  facing: Facing,
  candidates: AimCandidate[],
  range = DEFAULT_AUTO_AIM_RANGE,
): number {
  let best: AimCandidate | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    if (!c.alive) continue;
    const d = distance(origin, c.position);
    if (d <= range && d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  if (best) {
    return angleBetween(origin, best.position);
  }
  return facingToAngle(facing);
}

export function facingToAngle(facing: Facing): number {
  const idx = FACING_ORDER.indexOf(facing);
  return (idx >= 0 ? idx : 2) * (Math.PI / 4);
}
