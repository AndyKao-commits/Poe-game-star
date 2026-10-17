/** Fixed 2:1 isometric tile size in screen pixels. */
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Convert continuous world (tile-space) coordinates to screen pixels.
 * World origin maps to screen origin; +x east, +y south in tile space.
 */
export function worldToScreen(world: Vec2): Vec2 {
  return {
    x: (world.x - world.y) * (TILE_WIDTH / 2),
    y: (world.x + world.y) * (TILE_HEIGHT / 2),
  };
}

/** Inverse of worldToScreen. */
export function screenToWorld(screen: Vec2): Vec2 {
  return {
    x: screen.x / TILE_WIDTH + screen.y / TILE_HEIGHT,
    y: screen.y / TILE_HEIGHT - screen.x / TILE_WIDTH,
  };
}

/** Depth key for isometric sorting — larger values draw later (in front). */
export function depthFromFoot(world: Vec2): number {
  return world.x + world.y;
}

export function tileCenter(tileX: number, tileY: number): Vec2 {
  return { x: tileX + 0.5, y: tileY + 0.5 };
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function angleBetween(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}
