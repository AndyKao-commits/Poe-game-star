import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.image('tile-floor', '/assets/tile-floor.png');
    this.load.image('tile-wall', '/assets/tile-wall.png');
    this.load.image('tile-obstacle', '/assets/tile-obstacle.png');
    this.load.image('tile-void', '/assets/tile-void.png');
    this.load.spritesheet('player', '/assets/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('enemy', '/assets/enemy.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image('slash', '/assets/slash.png');
  }

  create(): void {
    this.createPlayerAnims();
    this.createEnemyAnims();
    this.scene.start('GameScene');
  }

  private createPlayerAnims(): void {
    const facings = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const;
    facings.forEach((facing, col) => {
      this.anims.create({
        key: `player-idle-${facing}`,
        frames: [
          { key: 'player', frame: col + 0 * 8 },
          { key: 'player', frame: col + 1 * 8 },
        ],
        frameRate: 4,
        repeat: -1,
      });
      this.anims.create({
        key: `player-run-${facing}`,
        frames: [
          { key: 'player', frame: col + 2 * 8 },
          { key: 'player', frame: col + 3 * 8 },
        ],
        frameRate: 8,
        repeat: -1,
      });
    });
  }

  private createEnemyAnims(): void {
    this.anims.create({
      key: 'enemy-idle',
      frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy-chase',
      frames: this.anims.generateFrameNumbers('enemy', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy-hurt',
      frames: this.anims.generateFrameNumbers('enemy', { start: 8, end: 11 }),
      frameRate: 10,
      repeat: 0,
    });
  }
}
