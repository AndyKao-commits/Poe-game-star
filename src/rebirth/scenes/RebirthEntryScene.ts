import Phaser from 'phaser';

/**
 * Rebirth-owned entry scene. This is an honest release gate, NOT a playable
 * mockup: game content must remain unavailable until final art and QA pass.
 * No textures, spritesheets, legacy modules or placeholder images are loaded.
 */
export class RebirthEntryScene extends Phaser.Scene {
  private heading?: Phaser.GameObjects.Text;
  private detail?: Phaser.GameObjects.Text;
  private orientationHint?: Phaser.GameObjects.Text;

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

    this.orientationHint = this.add.text(center, top + 84, '請將手機橫向放置，以獲得最佳遊玩視野', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#ffb65c',
      align: 'center',
    }).setOrigin(0.5);

    this.scale.on('resize', this.reposition, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.reposition, this);
    });
    this.reposition();
  }

  private reposition(): void {
    const x = this.scale.width / 2;
    const y = this.scale.height / 2;
    const portrait = this.scale.height > this.scale.width;
    const textWidth = Math.max(120, this.scale.width - 32);
    const headingSize = Math.max(14, Math.min(24, Math.floor(this.scale.width / 19)));
    this.heading?.setFontSize(headingSize).setWordWrapWidth(textWidth).setPosition(x, y - (portrait ? 52 : 28));
    this.detail?.setFontSize(portrait ? 14 : 16).setWordWrapWidth(textWidth).setPosition(x, y + (portrait ? 4 : 22));
    this.orientationHint?.setVisible(portrait).setWordWrapWidth(textWidth).setPosition(x, y + 80);
  }
}
