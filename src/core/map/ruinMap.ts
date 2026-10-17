import { createTileMap, setTile, type TileMapData } from '../collision/grid';
import { tileCenter, type Vec2 } from '../iso/coordinates';

export interface RuinMapBlueprint {
  map: TileMapData;
  playerSpawn: Vec2;
  enemySpawns: Vec2[];
}

/** Hand-authored ruins courtyard for the phase-1 playable slice. */
export function createRuinTestMap(): RuinMapBlueprint {
  const width = 24;
  const height = 24;
  const map = createTileMap(width, height, 'floor');

  // Outer walls
  for (let x = 0; x < width; x++) {
    setTile(map, x, 0, 'wall');
    setTile(map, x, height - 1, 'wall');
  }
  for (let y = 0; y < height; y++) {
    setTile(map, 0, y, 'wall');
    setTile(map, width - 1, y, 'wall');
  }

  // Broken colonnade / rubble obstacles
  const walls: Array<[number, number]> = [
    [5, 5],
    [6, 5],
    [7, 5],
    [5, 6],
    [12, 4],
    [13, 4],
    [14, 4],
    [14, 5],
    [18, 8],
    [18, 9],
    [18, 10],
    [8, 14],
    [9, 14],
    [10, 14],
    [10, 15],
    [15, 16],
    [16, 16],
    [17, 16],
    [6, 18],
    [7, 18],
  ];
  for (const [x, y] of walls) setTile(map, x, y, 'wall');

  const obstacles: Array<[number, number]> = [
    [4, 10],
    [9, 8],
    [11, 11],
    [16, 7],
    [13, 13],
    [7, 12],
    [19, 14],
    [12, 18],
    [3, 15],
    [20, 6],
  ];
  for (const [x, y] of obstacles) setTile(map, x, y, 'obstacle');

  // Courtyard void pit
  for (let y = 9; y <= 11; y++) {
    for (let x = 9; x <= 11; x++) {
      if (x === 10 && y === 10) continue;
      setTile(map, x, y, 'void');
    }
  }

  return {
    map,
    playerSpawn: tileCenter(4, 4),
    enemySpawns: [
      tileCenter(18, 5),
      tileCenter(16, 12),
      tileCenter(8, 17),
      tileCenter(20, 18),
      tileCenter(5, 12),
    ],
  };
}
