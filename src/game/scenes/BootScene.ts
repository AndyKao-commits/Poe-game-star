import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.image('tile-floor', '/assets/art-d/tile-floor.png');
    this.load.image('tile-wall', '/assets/art-d/tile-wall.png');
    this.load.image('tile-obstacle', '/assets/art-d/tile-obstacle.png');
    this.load.image('tile-void', '/assets/art-d/tile-void.png');
    this.load.spritesheet('player', '/assets/art-d/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('enemy', '/assets/enemy.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image('slash', '/assets/art-d/slash.png');
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
      // Attack: windup → strike (hit frame synced in AttackTimeline)
      this.anims.create({
        key: `player-attack-${facing}`,
        frames: [
          { key: 'player', frame: col + 4 * 8 },
          { key: 'player', frame: col + 5 * 8 },
          { key: 'player', frame: col + 5 * 8 },
        ],
        frameRate: 10,
        repeat: 0,
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
    this.anims.create({
      key: 'enemy-windup',
      frames: this.anims.generateFrameNumbers('enemy', { start: 12, end: 15 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'enemy-attack',
      frames: this.anims.generateFrameNumbers('enemy', { start: 16, end: 19 }),
      frameRate: 12,
      repeat: 0,
    });
  }
}
