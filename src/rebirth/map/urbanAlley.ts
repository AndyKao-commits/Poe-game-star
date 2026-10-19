import { createTileMap, getTile, isBlocking, setTile, type TileMapData } from '../../core/collision/grid';
import { tileCenter, type Vec2 } from '../../core/iso/coordinates';

/**
 * Rebirth Chapter 1 prototype: fictional Taiwanese late-night alley.
 * Temporary legacy tile textures are used until dedicated modern-urban art lands.
 * Layout and narrative markers are new; NO ancient-ruin/folklore references.
 */
export interface UrbanAlleyBlueprint {
  readonly id: 'chapter1-alley';
  readonly label: '只是想買個宵夜｜巷口';
  readonly map: TileMapData;
  readonly playerSpawn: Vec2;
  readonly enemySpawns: Vec2[];
  readonly landmarks: ReadonlyArray<{
    readonly id: 'convenience-store' | 'food-stall' | 'scooters' | 'parking-entrance';
    readonly label: string;
    readonly position: Vec2;
  }>;
}

export function createUrbanAlleyMap(): UrbanAlleyBlueprint {
  const width = 24;
  const height = 24;
  const map = createTileMap(width, height, 'floor');

  // Boundaries are closed to avoid falling out of the combat test arena.
  for (let x = 0; x < width; x++) {
    setTile(map, x, 0, 'wall');
    setTile(map, x, height - 1, 'wall');
  }
  for (let y = 0; y < height; y++) {
    setTile(map, 0, y, 'wall');
    setTile(map, width - 1, y, 'wall');
  }

  // North-side shopfronts: service windows and a convenience-store entrance.
  for (let x = 2; x <= 9; x++) {
    if (x !== 5 && x !== 6) setTile(map, x, 3, 'wall');
  }
  for (let x = 14; x <= 21; x++) {
    if (x !== 17) setTile(map, x, 3, 'wall');
  }

  // Sidewalk edges and apartment frontage, leaving wide clear routes.
  for (let y = 6; y <= 10; y++) {
    setTile(map, 2, y, 'wall');
    setTile(map, 21, y, 'wall');
  }
  for (let y = 15; y <= 20; y++) {
    setTile(map, 2, y, 'wall');
    setTile(map, 21, y, 'wall');
  }

  // Scooters, vending machine, plastic tables and roadside clutter.
  const props: ReadonlyArray<readonly [number, number]> = [
    [4, 8], [5, 8], [7, 7], [8, 7],
    [15, 8], [16, 8], [18, 7],
    [4, 16], [5, 16], [8, 19],
    [16, 16], [17, 16], [19, 18],
  ];
  for (const [x, y] of props) setTile(map, x, y, 'obstacle');

  const playerSpawn = tileCenter(11, 18);
  const enemySpawns = [
    tileCenter(10, 8),
    tileCenter(13, 8),
    tileCenter(17, 12),
    tileCenter(7, 13),
    tileCenter(13, 17),
  ];
  // Fail fast during authoring: no player or enemy may start inside solid geometry.
  for (const point of [playerSpawn, ...enemySpawns]) {
    const x = Math.floor(point.x);
    const y = Math.floor(point.y);
    if (isBlocking(getTile(map, x, y))) {
      throw new Error(`Rebirth alley spawn blocked at ${x},${y}`);
    }
  }

  return {
    id: 'chapter1-alley',
    label: '只是想買個宵夜｜巷口',
    map,
    playerSpawn,
    enemySpawns,
    landmarks: [
      { id: 'convenience-store', label: '便利商店', position: tileCenter(5, 4) },
      { id: 'food-stall', label: '陳老闆的宵夜攤', position: tileCenter(17, 4) },
      { id: 'scooters', label: '機車停車區', position: tileCenter(4, 8) },
      { id: 'parking-entrance', label: '地下停車場入口', position: tileCenter(20, 20) },
    ],
  };
}
