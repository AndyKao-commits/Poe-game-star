import Phaser from 'phaser';
import {
  DEFAULT_COMBAT_FEEDBACK,
  type CombatFeedbackConfig,
  type DamageFloatEvent,
} from '@core/combat/feedback';
import { worldToScreen } from '@core/iso/coordinates';

/**
 * Visual-only combat juice. Disable via config for perf tests.
 * Does not touch cooldowns or damage numbers themselves.
 */
export class CombatFeedbackSystem {
  private hitPauseRemaining = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: CombatFeedbackConfig = DEFAULT_COMBAT_FEEDBACK,
  ) {}

  get enabled(): boolean {
    return this.config.enabled;
  }

  update(deltaMs: number): number {
    if (!this.config.enabled || this.hitPauseRemaining <= 0) return deltaMs;
    this.hitPauseRemaining = Math.max(0, this.hitPauseRemaining - deltaMs);
    // Soften sim during hit-pause without freezing entirely
    return deltaMs * 0.35;
  }

  flash(sprite: Phaser.GameObjects.Sprite, color = 0xffffff): void {
    if (!this.config.enabled || !this.config.flash) return;
    sprite.setTint(color);
    this.scene.time.delayedCall(100, () => {
      if (sprite.active) sprite.clearTint();
    });
  }

  floatDamage(event: DamageFloatEvent): void {
    if (!this.config.enabled || !this.config.floatingText) return;
    const screen = worldToScreen(event.world);
    const text = this.scene.add.text(
      screen.x,
      screen.y - 18,
      event.isCrit ? `${event.amount}!` : `${event.amount}`,
      {
        fontFamily: 'monospace',
        fontSize: event.isCrit ? '16px' : '13px',
        color: event.isCrit ? '#ffd27a' : '#f0e6d8',
        stroke: '#1a1208',
        strokeThickness: 3,
      },
    );
    text.setOrigin(0.5, 1);
    text.setDepth(10_000);
    this.scene.tweens.add({
      targets: text,
      y: screen.y - 42,
      alpha: 0,
      duration: event.isCrit ? 700 : 550,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  requestHitPause(): void {
    if (!this.config.enabled) return;
    this.hitPauseRemaining = Math.max(this.hitPauseRemaining, this.config.hitPauseMs);
  }

  get knockbackEnabled(): boolean {
    return this.config.enabled && this.config.knockback;
  }

  get knockbackDistance(): number {
    return this.config.knockbackDistance;
  }
}
