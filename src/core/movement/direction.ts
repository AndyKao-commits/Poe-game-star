export type Facing =
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'nw'
  | 'n'
  | 'ne';

export const FACING_ORDER: Facing[] = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];

export interface MoveInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/** Build a normalized 8-way movement vector from WASD-style input. */
export function movementFromInput(input: MoveInput): { x: number; y: number; moving: boolean } {
  let x = 0;
  let y = 0;
  if (input.right) x += 1;
  if (input.left) x -= 1;
  if (input.down) y += 1;
  if (input.up) y -= 1;

  if (x === 0 && y === 0) {
    return { x: 0, y: 0, moving: false };
  }

  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len, moving: true };
}

/** Map a world-space angle (radians) to one of eight facings. */
export function facingFromAngle(radians: number): Facing {
  const tau = Math.PI * 2;
  let a = radians % tau;
  if (a < 0) a += tau;
  // 0 = east, then clockwise in world space (y down-positive)
  const sector = Math.round(a / (Math.PI / 4)) % 8;
  return FACING_ORDER[sector]!;
}

export function facingFromVector(x: number, y: number): Facing {
  if (x === 0 && y === 0) return 's';
  return facingFromAngle(Math.atan2(y, x));
}

export function facingIndex(facing: Facing): number {
  return FACING_ORDER.indexOf(facing);
}
