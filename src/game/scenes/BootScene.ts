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
    for (const role of ['crawler', 'sentinel'] as const) {
      this.load.spritesheet(role, `/assets/art-d/${role}.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
    }
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
    const rows = [
      ['idle', 4, true],
      ['chase', 8, true],
      ['hurt', 10, false],
      ['windup', 8, true],
      ['attack', 12, false],
    ] as const;
    for (const role of ['crawler', 'sentinel'] as const) {
      rows.forEach(([state, frameRate, loop], row) => {
        this.anims.create({
          key: `${role}-${state}`,
          frames: this.anims.generateFrameNumbers(role, {
            start: row * 4,
            end: row * 4 + 3,
          }),
          frameRate,
          repeat: loop ? -1 : 0,
        });
      });
    }
  }
}
