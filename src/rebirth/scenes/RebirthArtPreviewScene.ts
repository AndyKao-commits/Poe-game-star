import Phaser from 'phaser';
import { rebirthArtRegistry } from '../art/assetRegistry';
import {
  animationFrame, validateSpriteSheetMetadata,
  type FacingDirection, type AnimationState, type SpriteSheetMetadata,
} from '../art/animationContract';

/**
 * Developer-only isolated preview of user-approved provisional CHAR-01 V2.
 * IMPORTANT: this scene is NOT registered in createRebirthGameConfig and cannot
 * unlock the public entry gate. Only use after matching binaries are checked in.
 */
export class RebirthArtPreviewScene extends Phaser.Scene {
  private metadata: SpriteSheetMetadata | null = null;
  private player: Phaser.GameObjects.Sprite | null = null;
  private direction: FacingDirection = 'south';
  private motion: AnimationState = 'idle';
  private elapsed = 0;

  constructor() {
    super({ key: 'RebirthArtPreview' });
  }

  preload(): void {
    const art = rebirthArtRegistry['CHAR-01'];
    this.load.json('rebirth-aze-meta', art.metadata);
    this.load.spritesheet('rebirth-aze-v2', art.image, {
      frameWidth: art.frameWidth,
      frameHeight: art.frameHeight,
    });
  }

  create(): void {
    this.metadata = this.cache.json.get('rebirth-aze-meta') as SpriteSheetMetadata | undefined ?? null;
    if (!this.metadata || !this.textures.exists('rebirth-aze-v2')) {
      throw new Error('Rebirth preview requires approved candidate source, PNG and animation metadata');
    }
    const source = this.textures.get('rebirth-aze-v2').source[0];
    validateSpriteSheetMetadata(this.metadata, source.width, source.height);
    this.player = this.add.sprite(this.scale.width / 2, this.scale.height / 2, 'rebirth-aze-v2', 0);
    this.player.setScale(3).setOrigin(0.5, 0.75);
    this.cameras.main.setBackgroundColor('#07111b');
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });

    // Review-only keyboard controls, not production mobile input.
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const directions: Record<string, FacingDirection> = {
        ArrowDown: 'south', ArrowUp: 'north', ArrowLeft: 'west', ArrowRight: 'east',
      };
      if (directions[event.key]) this.setPose(directions[event.key], 'walk');
      else if (event.code === 'Space') this.setPose(this.direction, 'attack');
      else if (event.code === 'KeyH') this.setPose(this.direction, 'hurt');
      else if (event.code === 'KeyI') this.setPose(this.direction, 'idle');
    });
    this.renderFrame();
  }

  update(_time: number, delta: number): void {
    if (!this.metadata || !this.player) return;
    this.elapsed += Math.max(0, delta);
    this.renderFrame();
  }

  public setPose(direction: FacingDirection, motion: AnimationState): void {
    this.direction = direction;
    this.motion = motion;
    this.elapsed = 0;
    this.renderFrame();
  }

  private renderFrame(): void {
    if (!this.metadata || !this.player) return;
    const duration = this.motion === 'attack' ? 110 : this.motion === 'walk' ? 150 : 220;
    this.player.setFrame(animationFrame(this.metadata, this.direction, this.motion, this.elapsed, duration));
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.player?.setPosition(gameSize.width / 2, gameSize.height / 2);
  }
}
