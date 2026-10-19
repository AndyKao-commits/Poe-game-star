import Phaser from 'phaser';
import { RebirthAlleySession } from '../dev/alleySession';
import { RebirthAlleyEncounter, type AlleySnapshot } from '../combat/alleyEncounter';
import { type StickVector } from '../input/touchControls';
import { animationFrame, type SpriteSheetMetadata } from '../art/animationContract';

/**
 * Chapter 1 alley scene integration for the *future approved art build*.
 *
 * IMPORTANT:
 * - NOT registered in createRebirthGameConfig or the public entry.
 * - preload() requires approved CHAR-01 and CHAR-02 sprite exports.
 * - This class NEVER draws placeholder actors/props if assets are missing.
 * - The host mobile HUD will call setInput(), punch(), dash() and resetInput().
 */
export class RebirthAlleyAlphaScene extends Phaser.Scene {
  private session = new RebirthAlleySession(new RebirthAlleyEncounter());
  private playerSprite: Phaser.GameObjects.Sprite | null = null;
  private enemySprites = new Map<string, Phaser.GameObjects.Sprite>();
  private playerMetadata: SpriteSheetMetadata | null = null;
  private hud: Phaser.GameObjects.Text | null = null;
  private feedback: Phaser.GameObjects.Text | null = null;
  private clockMs = 0;
  private stick: StickVector = { x: 0, y: 0, magnitude: 0 };
  private basicHeld = false;
  private completed = false;

  constructor() { super({ key: 'RebirthAlleyAlpha' }); }

  preload(): void {
    // These are planned *new Rebirth-only* art paths. Missing art must produce
    // an explicit loader failure, never fallback to legacy/temporary textures.
    this.load.spritesheet('rebirth-alpha-aze', '/rebirth/art/aze-character.png', {
      frameWidth: 32, frameHeight: 48,
    });
    this.load.spritesheet('rebirth-alpha-brawler', '/rebirth/art/fire-brawler-character.png', {
      frameWidth: 32, frameHeight: 48,
    });
    this.load.json('rebirth-alpha-aze-meta', '/rebirth/art/aze-character.json');
  }

  create(): void {
    const playerTexture = this.textures.get('rebirth-alpha-aze');
    const enemyTexture = this.textures.get('rebirth-alpha-brawler');
    if (playerTexture.key === '__MISSING' || enemyTexture.key === '__MISSING') {
      throw new Error('Rebirth Alpha blocked: approved protagonist and enemy spritesheets required');
    }
    const meta = this.cache.json.get('rebirth-alpha-aze-meta') as SpriteSheetMetadata | undefined;
    if (!meta) throw new Error('Rebirth Alpha blocked: protagonist animation metadata required');
    this.playerMetadata = meta;
    this.cameras.main.setBackgroundColor('#101a2a');
    this.cameras.main.setRoundPixels(true);
    const state = this.session.encounter.snapshot();
    this.playerSprite = this.add.sprite(
      state.player.position.x, state.player.position.y,
      'rebirth-alpha-aze', 0,
    ).setOrigin(0.5, 0.83).setScale(2);
    for (const enemy of state.enemies) {
      this.enemySprites.set(enemy.id, this.add.sprite(
        enemy.position.x, enemy.position.y,
        'rebirth-alpha-brawler', 0,
      ).setOrigin(0.5, 0.83).setScale(2));
    }
    this.hud = this.add.text(12, 10, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px',
      color: '#f0f7fa', backgroundColor: '#101a2a',
    }).setScrollFactor(0).setDepth(100);
    this.feedback = this.add.text(this.scale.width / 2, 22, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#ffb65c',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.resetInput();
      this.enemySprites.clear();
      this.playerSprite = null;
      this.hud = null;
      this.feedback = null;
    });
    this.renderState(state);
  }

  setInput(stick: StickVector, basicHeld: boolean): void {
    this.stick = { ...stick };
    this.basicHeld = basicHeld;
    this.session.setInput({ stick, basicHeld });
  }

  punch(): void {
    if (this.completed) return;
    const result = this.session.trigger('punch', this.clockMs);
    this.showFeedback(result.ok ? '魔力衝拳！' : this.reasonText(result.reason));
  }

  dash(): void {
    if (this.completed) return;
    const result = this.session.trigger('dash', this.clockMs);
    this.showFeedback(result.ok ? '瞬步！' : this.reasonText(result.reason));
  }

  resetInput(): void {
    this.stick = { x: 0, y: 0, magnitude: 0 };
    this.basicHeld = false;
    this.session.resetInput();
  }

  update(_time: number, delta: number): void {
    if (!this.playerSprite || this.completed) return;
    // Clock remains monotonic even after browser backgrounding.
    this.clockMs += Math.max(0, Math.min(50, delta));
    const result = this.session.tick(this.clockMs);
    this.renderState(result.state);
    if (result.state.cleared || result.state.defeated) {
      this.completed = true;
      this.showFeedback(result.state.cleared ? '巷弄戰鬥完成' : '角色倒下');
      this.resetInput();
    }
  }

  private renderState(state: AlleySnapshot): void {
    if (!this.playerSprite) return;
    const player = state.player;
    this.playerSprite.setPosition(player.position.x, player.position.y);
    if (this.playerMetadata) {
      const facing = Math.abs(player.facing.x) > Math.abs(player.facing.y)
        ? player.facing.x >= 0 ? 'east' : 'west'
        : player.facing.y >= 0 ? 'south' : 'north';
      const motion = this.stick.magnitude > 0.16 ? 'walk' : 'idle';
      this.playerSprite.setFrame(animationFrame(
        this.playerMetadata, facing, motion, this.clockMs, 150,
      ));
    }
    for (const enemy of state.enemies) {
      const sprite = this.enemySprites.get(enemy.id);
      if (!sprite) continue;
      sprite.setPosition(enemy.position.x, enemy.position.y);
      sprite.setVisible(enemy.hp > 0);
      sprite.setTint(enemy.phase === 'telegraph' ? 0xff6672 : 0xffffff);
      sprite.setDepth(Math.floor(enemy.position.y));
    }
    this.playerSprite.setDepth(Math.floor(player.position.y));
    this.hud?.setText(
      `HP ${Math.ceil(player.hp)}/${player.maxHp}   MP ${Math.floor(player.mp)}/${player.maxMp}   敵人 ${state.enemies.filter(e => e.hp > 0).length}`,
    );
    for (const event of state.events) {
      if (event.kind === 'player-hit') this.showFeedback(`受到 ${event.damage} 點傷害`);
      if (event.kind === 'enemy-defeated') this.showFeedback('擊倒敵人！');
    }
  }

  private showFeedback(message: string): void {
    this.feedback?.setText(message);
  }

  private reasonText(reason?: string): string {
    switch (reason) {
      case 'mana': return 'MP 不足';
      case 'cooldown': return '技能冷卻中';
      case 'no-target': return '沒有目標';
      default: return '無法使用';
    }
  }
}
