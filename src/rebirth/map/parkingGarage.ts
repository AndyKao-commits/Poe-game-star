import { createTileMap, getTile, isBlocking, setTile, type TileMapData } from '../../core/collision/grid';
import { tileCenter, type Vec2 } from '../../core/iso/coordinates';

export type GarageLandmarkId = 'seal' | 'power-panel' | 'cable' | 'electronic-lock';

export interface ParkingGarageBlueprint {
  readonly id: 'chapter1-b2-garage';
  readonly label: 'B2 地下停車場｜增幅器測試區';
  readonly map: TileMapData;
  readonly playerSpawn: Vec2;
  readonly landmarks: ReadonlyArray<{
    readonly id: GarageLandmarkId;
    readonly label: string;
    readonly position: Vec2;
    readonly radius: number;
  }>;
}

/**
 * First spatial slice for B2. It deliberately contains no art references:
 * the map contract can be tested and wired to an approved original scene later.
 */
export function createParkingGarageMap(): ParkingGarageBlueprint {
  const width = 30;
  const height = 18;
  const map = createTileMap(width, height, 'floor');

  for (let x = 0; x < width; x++) {
    setTile(map, x, 0, 'wall');
    setTile(map, x, height - 1, 'wall');
  }
  for (let y = 0; y < height; y++) {
    setTile(map, 0, y, 'wall');
    setTile(map, width - 1, y, 'wall');
  }

  // Concrete pillars and parked vehicles create lanes without sealing the room.
  for (const [x, y] of [
    [6, 4], [6, 13], [14, 4], [14, 13], [23, 4], [23, 13],
    [10, 8], [11, 8], [19, 9], [20, 9],
  ] as const) setTile(map, x, y, 'obstacle');

  const playerSpawn = tileCenter(3, 9);
  const landmarks = [
    { id: 'seal' as const, label: '破損的增幅器測試封條', position: tileCenter(5, 5), radius: 1.35 },
    { id: 'power-panel' as const, label: '配電箱：A／B／C 迴路', position: tileCenter(12, 4), radius: 1.35 },
    { id: 'cable' as const, label: '通往工坊的供電纜線', position: tileCenter(20, 13), radius: 1.5 },
    { id: 'electronic-lock' as const, label: '工坊電子鎖', position: tileCenter(26, 9), radius: 1.35 },
  ];

  for (const point of [playerSpawn, ...landmarks.map((landmark) => landmark.position)]) {
    if (isBlocking(getTile(map, Math.floor(point.x), Math.floor(point.y)))) {
      throw new Error(`B2 garage point blocked at ${Math.floor(point.x)},${Math.floor(point.y)}`);
    }
  }

  return { id: 'chapter1-b2-garage', label: 'B2 地下停車場｜增幅器測試區', map, playerSpawn, landmarks };
}

export function nearestGarageLandmark(
  blueprint: ParkingGarageBlueprint,
  position: Vec2,
): GarageLandmarkId | null {
  let nearest: { id: GarageLandmarkId; distance: number } | null = null;
  for (const landmark of blueprint.landmarks) {
    const distance = Math.hypot(position.x - landmark.position.x, position.y - landmark.position.y);
    if (distance <= landmark.radius && (!nearest || distance < nearest.distance)) {
      nearest = { id: landmark.id, distance };
    }
  }
  return nearest?.id ?? null;
}
