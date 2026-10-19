import Phaser from 'phaser';

/**
 * Rebirth-owned entry scene. This is an honest release gate, NOT a playable
 * mockup: game content must remain unavailable until final art and QA pass.
 * No textures, spritesheets, legacy modules or placeholder images are loaded.
 */
export class RebirthEntryScene extends Phaser.Scene {
  private heading?: Phaser.GameObjects.Text;
  private detail?: Phaser.GameObjects.Text;

  constructor() {
    super('RebirthEntryScene');
  }

  create(): void {
    const center = this.scale.width / 2;
    const top = this.scale.height / 2;
    this.cameras.main.setBackgroundColor('#07111b');

    this.heading = this.add.text(center, top - 28, 'ASHEN RELIQUARY: REBIRTH', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#eafaff',
      align: 'center',
    }).setOrigin(0.5);

    this.detail = this.add.text(center, top + 22,
      '正式美術與新版遊戲架構製作中\n目前未開放遊玩',
      {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#8ac8d5',
        align: 'center',
        lineSpacing: 9,
      },
    ).setOrigin(0.5);

    this.scale.on('resize', this.reposition, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.reposition, this);
    });
    this.reposition();
  }

  private reposition(): void {
    const x = this.scale.width / 2;
    const y = this.scale.height / 2;
    this.heading?.setPosition(x, y - 28);
    this.detail?.setPosition(x, y + 22);
  }
}
