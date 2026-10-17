import type { Vec2 } from '../iso/coordinates';
import { distance } from '../iso/coordinates';

export interface ChaseConfig {
  aggroRange: number;
  stopRange: number;
  speed: number;
}

export const DEFAULT_CHASE: ChaseConfig = {
  aggroRange: 7,
  stopRange: 0.85,
  speed: 1.6,
};

export function chaseVelocity(
  self: Vec2,
  target: Vec2,
  config: ChaseConfig = DEFAULT_CHASE,
): { x: number; y: number; chasing: boolean } {
  const dist = distance(self, target);
  if (dist > config.aggroRange || dist <= config.stopRange) {
    return { x: 0, y: 0, chasing: dist <= config.aggroRange && dist > config.stopRange };
  }
  const dx = target.x - self.x;
  const dy = target.y - self.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: (dx / len) * config.speed,
    y: (dy / len) * config.speed,
    chasing: true,
  };
}
