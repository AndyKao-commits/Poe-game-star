import Phaser from 'phaser';
import { depthFromFoot, worldToScreen, type Vec2 } from '@core/iso/coordinates';

/** Phaser view bound to a world-space foot position. */
export class WorldEntity {
  readonly sprite: Phaser.GameObjects.Sprite;
  position: Vec2;

  constructor(scene: Phaser.Scene, texture: string, position: Vec2, frame = 0) {
    this.position = { ...position };
    const screen = worldToScreen(this.position);
    this.sprite = scene.add.sprite(screen.x, screen.y, texture, frame);
    this.sprite.setOrigin(0.5, 0.85);
    this.syncTransform();
  }

  syncTransform(): void {
    const screen = worldToScreen(this.position);
    this.sprite.setPosition(screen.x, screen.y);
    this.sprite.setDepth(depthFromFoot(this.position));
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
