import Phaser from 'phaser';
import { depthFromFoot, worldToScreen } from '@core/iso/coordinates';
import { getTile, type TileMapData, type TileKind } from '@core/collision/grid';

const TEXTURE: Record<Exclude<TileKind, 'void'>, string> = {
  floor: 'tile-floor',
  wall: 'tile-wall',
  obstacle: 'tile-obstacle',
};

export function renderTileMap(scene: Phaser.Scene, map: TileMapData): Phaser.GameObjects.Image[] {
  const images: Phaser.GameObjects.Image[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const kind = getTile(map, x, y);
      const world = { x: x + 0.5, y: y + 0.5 };
      const screen = worldToScreen(world);
      if (kind === 'void') {
        const img = scene.add.image(screen.x, screen.y, 'tile-void');
        img.setDepth(depthFromFoot(world) - 1000);
        images.push(img);
        continue;
      }
      const img = scene.add.image(screen.x, screen.y, TEXTURE[kind]);
      // Floors under actors; walls/obstacles sort by foot
      img.setDepth(kind === 'floor' ? depthFromFoot(world) - 500 : depthFromFoot(world));
      if (kind === 'wall') {
        img.setOrigin(0.5, 0.75);
      }
      images.push(img);
    }
  }
  return images;
}
