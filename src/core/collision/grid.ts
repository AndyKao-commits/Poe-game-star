import type { Vec2 } from '../iso/coordinates';

export type TileKind = 'floor' | 'wall' | 'obstacle' | 'void';

export interface TileMapData {
  width: number;
  height: number;
  /** Row-major tiles[y * width + x] */
  tiles: TileKind[];
}

/** Max travel per sub-step as a fraction of collision radius (prevents tunneling). */
export const MAX_STEP_RADIUS_FRACTION = 0.5;

export function createTileMap(width: number, height: number, fill: TileKind = 'floor'): TileMapData {
  return {
    width,
    height,
    tiles: Array.from({ length: width * height }, () => fill),
  };
}

export function getTile(map: TileMapData, x: number, y: number): TileKind {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 'void';
  return map.tiles[y * map.width + x]!;
}

export function setTile(map: TileMapData, x: number, y: number, kind: TileKind): void {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
  map.tiles[y * map.width + x] = kind;
}

export function isBlocking(kind: TileKind): boolean {
  return kind === 'wall' || kind === 'obstacle' || kind === 'void';
}

export function isWorldBlocked(map: TileMapData, world: Vec2, radius = 0.28): boolean {
  const samples: Vec2[] = [
    world,
    { x: world.x - radius, y: world.y },
    { x: world.x + radius, y: world.y },
    { x: world.x, y: world.y - radius },
    { x: world.x, y: world.y + radius },
  ];
  return samples.some((p) => isBlocking(getTile(map, Math.floor(p.x), Math.floor(p.y))));
}

/** Single axis-separated slide step (no sub-division). */
export function slideStep(
  map: TileMapData,
  from: Vec2,
  delta: Vec2,
  radius = 0.28,
): Vec2 {
  let x = from.x;
  let y = from.y;

  const nextX = x + delta.x;
  if (!isWorldBlocked(map, { x: nextX, y }, radius)) {
    x = nextX;
  }

  const nextY = y + delta.y;
  if (!isWorldBlocked(map, { x, y: nextY }, radius)) {
    y = nextY;
  }

  return { x, y };
}

/**
 * Axis-separated slide move against the tile grid with sub-stepping.
 * Large deltas are split so each step travels at most
 * `radius * MAX_STEP_RADIUS_FRACTION`, preventing wall tunneling.
 */
export function moveWithCollision(
  map: TileMapData,
  from: Vec2,
  delta: Vec2,
  radius = 0.28,
): Vec2 {
  const maxStep = Math.max(1e-4, radius * MAX_STEP_RADIUS_FRACTION);
  const distance = Math.hypot(delta.x, delta.y);
  if (distance <= maxStep) {
    return slideStep(map, from, delta, radius);
  }

  const steps = Math.ceil(distance / maxStep);
  const stepDelta = { x: delta.x / steps, y: delta.y / steps };
  let pos = { ...from };
  for (let i = 0; i < steps; i++) {
    pos = slideStep(map, pos, stepDelta, radius);
  }
  return pos;
}

export function mapPixelBounds(map: TileMapData): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const corners = [
    { x: 0, y: 0 },
    { x: map.width, y: 0 },
    { x: 0, y: map.height },
    { x: map.width, y: map.height },
  ];
  const screens = corners.map((c) => ({
    x: (c.x - c.y) * 32,
    y: (c.x + c.y) * 16,
  }));
  const xs = screens.map((s) => s.x);
  const ys = screens.map((s) => s.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}
