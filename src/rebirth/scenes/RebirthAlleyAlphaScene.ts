import Phaser from 'phaser';
import { RebirthAlleySession } from '../dev/alleySession';
import { alleyDialogueAt } from '../dev/alleyDialogue';
import { inspectAlleyClue } from '../dev/alleyClue';
import { advanceAlleyObjective, ALLEY_EXIT, ALLEY_EXIT_RADIUS, type AlleyObjectivePhase } from '../dev/alleyObjective';
import { RebirthAlleyEncounter, type AlleySnapshot } from '../combat/alleyEncounter';
import { type StickVector } from '../input/touchControls';
import { animationFrame, validateSpriteSheetMetadata, type FacingDirection, type SpriteSheetMetadata } from '../art/animationContract';
import { attackVisualAt, type AttackVisualKind } from '../dev/attackVisual';
import { dashVisualAt } from '../dev/dashVisual';

// The original 480×270 composition was readable on desktop but undersized on
// iPhone landscape. Keep the logical world unchanged and enlarge the complete
// world layer through the camera so collision, touch coordinates and authored
// map positions remain stable.
const REBIRTH_WORLD_ZOOM = 2.4;
const ACTOR_SPRITE_SCALE = 1 / 3;
const GROUND_TILE_SCALE = 1 / 3;

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
  private enemyHealthBars = new Map<string, Phaser.GameObjects.Graphics>();
  private playerBars: Phaser.GameObjects.Graphics | null = null;
  private hudLeft = 72;
  private exitIndicator: Phaser.GameObjects.Graphics | null = null;
  private objectiveLabel: Phaser.GameObjects.Text | null = null;
  private objectivePhase: AlleyObjectivePhase = 'fight';
  private phaseStartedAt = 0;
  private clueDiscovered = false;
  private clueNote: Phaser.GameObjects.Text | null = null;
  private dialogueCaption: Phaser.GameObjects.Text | null = null;
  private dangerGraphics: Phaser.GameObjects.Graphics | null = null;
  private hitFlash: Phaser.GameObjects.Graphics | null = null;
  private swingGraphics: Phaser.GameObjects.Graphics | null = null;
  private strikeStartedAt = -1;
  private strikeKind: AttackVisualKind = 'basic';
  private strikeFacing: FacingDirection = 'east';
  private strikeImpact: { x: number; y: number; startedAt: number } | null = null;
  private dashStartedAt = -1;
  private dashFacing: FacingDirection = 'east';
  private outcomePanel: Phaser.GameObjects.Container | null = null;
  private feedbackExpiresAt = 0;
  private hitFlashExpiresAt = 0;
  private playerMetadata: SpriteSheetMetadata | null = null;
  private enemyMetadata: SpriteSheetMetadata | null = null;
  private hud: Phaser.GameObjects.Text | null = null;
  private feedback: Phaser.GameObjects.Text | null = null;
  private clockMs = 0;
  private stick: StickVector = { x: 0, y: 0, magnitude: 0 };
  private completed = false;
  private onCreated: (() => void) | null = null;
  private onStopped: (() => void) | null = null;
  private onVictory: (() => void) | null = null;

  constructor() { super({ key: 'RebirthAlleyAlpha' }); }

  /** Called before Phaser.Game is constructed; scene events are not ready yet. */
  setLifecycleHooks(onCreated: () => void, onStopped: () => void): void {
    this.onCreated = onCreated;
    this.onStopped = onStopped;
  }

  setVictoryHook(onVictory: () => void): void {
    this.onVictory = onVictory;
  }

  preload(): void {
    // These are planned *new Rebirth-only* art paths. Missing art must produce
    // an explicit loader failure, never fallback to legacy/temporary textures.
    this.load.spritesheet('rebirth-alpha-aze', '/rebirth/art/aze-character.png', {
      frameWidth: 96, frameHeight: 144,
    });
    this.load.spritesheet('rebirth-alpha-brawler', '/rebirth/art/fire-brawler-character.png', {
      frameWidth: 96, frameHeight: 144,
    });
    this.load.spritesheet('rebirth-alpha-ground', '/rebirth/art/urban-ground-atlas.png', {
      frameWidth: 96, frameHeight: 96,
    });
    this.load.json('rebirth-alpha-aze-meta', '/rebirth/art/aze-character.json');
    this.load.json('rebirth-alpha-brawler-meta', '/rebirth/art/fire-brawler-character.json');
  }

  create(): void {
    this.session = new RebirthAlleySession(new RebirthAlleyEncounter());
    this.clockMs = 0;
    this.completed = false;
    this.objectivePhase = 'fight';
    this.phaseStartedAt = 0;
    this.clueDiscovered = false;
    this.feedbackExpiresAt = 0;
    this.hitFlashExpiresAt = 0;
    this.strikeStartedAt = -1;
    this.strikeImpact = null;
    this.dashStartedAt = -1;
    this.outcomePanel = null;
    this.stick = { x: 0, y: 0, magnitude: 0 };
    const playerTexture = this.textures.get('rebirth-alpha-aze');
    const enemyTexture = this.textures.get('rebirth-alpha-brawler');
    if (playerTexture.key === '__MISSING' || enemyTexture.key === '__MISSING') {
      throw new Error('Rebirth Alpha blocked: approved protagonist and enemy spritesheets required');
    }
    const meta = this.cache.json.get('rebirth-alpha-aze-meta') as SpriteSheetMetadata | undefined;
    const enemyMeta = this.cache.json.get('rebirth-alpha-brawler-meta') as SpriteSheetMetadata | undefined;
    if (!meta || !enemyMeta) throw new Error('Rebirth Alpha blocked: complete animation metadata required');
    const playerSource = playerTexture.source[0];
    const enemySource = enemyTexture.source[0];
    validateSpriteSheetMetadata(meta, playerSource.width, playerSource.height);
    validateSpriteSheetMetadata(enemyMeta, enemySource.width, enemySource.height);
    this.playerMetadata = meta;
    this.enemyMetadata = enemyMeta;
    const groundTexture = this.textures.get('rebirth-alpha-ground');
    if (groundTexture.key === '__MISSING' || groundTexture.frameTotal < 16) {
      throw new Error('Rebirth Alpha blocked: complete original ENV-01 tile atlas required');
    }
    this.cameras.main.setBackgroundColor('#101a2a');
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setZoom(REBIRTH_WORLD_ZOOM);
    // Keep the original 480-unit combat arena centered within wide iPhone viewports.
    // The additional area uses real ENV-01 atlas tiles rather than empty bars.
    this.cameras.main.setScroll(-(this.scale.width - 480) / 2, 0);
    this.renderOriginalGround();
    // World-space HUD is screen-fixed. Keep a minimum notch clearance even
    // when iOS Safari reports zero safe-area inset in landscape browser tabs.
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-left:env(safe-area-inset-left,0px)';
    document.body.append(probe);
    const insetPx = parseFloat(getComputedStyle(probe).paddingLeft) || 0;
    probe.remove();
    const canvasPx = this.game.canvas.getBoundingClientRect().width || window.innerWidth;
    this.hudLeft = Math.max(72, Math.ceil(insetPx * this.scale.width / canvasPx) + 16);
    const state = this.session.encounter.snapshot();
    this.playerSprite = this.add.sprite(
      state.player.position.x, state.player.position.y,
      'rebirth-alpha-aze', 0,
    ).setOrigin(0.5, 0.83).setScale(ACTOR_SPRITE_SCALE);
    for (const enemy of state.enemies) {
      this.enemyHealthBars.set(enemy.id, this.add.graphics().setDepth(90));
      this.enemySprites.set(enemy.id, this.add.sprite(
        enemy.position.x, enemy.position.y,
        'rebirth-alpha-brawler', 0,
      ).setOrigin(0.5, 0.83).setScale(ACTOR_SPRITE_SCALE));
    }
    this.dangerGraphics = this.add.graphics().setDepth(85);
    this.swingGraphics = this.add.graphics().setDepth(88);
    this.hitFlash = this.add.graphics().setScrollFactor(0).setDepth(120);
    this.playerBars = this.add.graphics().setScrollFactor(0).setDepth(99);
    this.exitIndicator = this.add.graphics().setDepth(70);
    this.objectiveLabel = this.add.text(this.scale.width / 2, this.scale.height - 15, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#d7f7f1',
      backgroundColor: '#102333', padding: { x: 7, y: 3 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(105);
    this.clueNote = this.add.text(this.scale.width / 2, this.scale.height - 42, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#ffdf99',
      backgroundColor: '#1b2c3c', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(106).setVisible(false);
    this.dialogueCaption = this.add.text(this.scale.width / 2, 72, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#fff3d9',
      backgroundColor: '#172635', padding: { x: 8, y: 5 },
      wordWrap: { width: this.scale.width - 60 }, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(110);
    this.hud = this.add.text(this.hudLeft, 9, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px',
      color: '#f0f7fa', backgroundColor: '#101a2a',
    }).setScrollFactor(0).setDepth(100);
    this.feedback = this.add.text(this.scale.width / 2, 22, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#ffb65c',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.onStopped?.();
      this.resetInput();
      this.enemySprites.clear();
      this.enemyHealthBars.clear();
      this.playerBars = null;
      this.exitIndicator = null;
      this.objectiveLabel = null;
      this.dialogueCaption = null;
      this.clueNote = null;
      this.dangerGraphics = null;
      this.hitFlash = null;
      this.swingGraphics = null;
      this.strikeStartedAt = -1;
      this.strikeImpact = null;
      this.dashStartedAt = -1;
      this.outcomePanel = null;
      this.playerSprite = null;
      this.hud = null;
      this.feedback = null;
    });
    this.renderState(state);
    this.objectiveLabel?.setText('擊退攔路混混（剩餘 2 人）');
    this.onCreated?.();
  }

  /** Every ground tile is a frame from the original ENV-01 atlas, not geometry placeholders. */
  private renderOriginalGround(): void {
    const firstTile = Math.floor((480 - this.scale.width) / 2 / 32) - 1;
    const lastTile = Math.ceil((480 + this.scale.width) / 2 / 32) + 1;
    for (let y = 0; y < 9; y++) {
      for (let x = firstTile; x < lastTile; x++) {
        // Original asphalt/pavement variations; painted lane lines and drains
        // are reserved for actual atlas frames, never generated shapes.
        const isSidewalk = y < 2 || y >= 7;
        const frame = isSidewalk
          ? 4 + ((x * 3 + y) % 4)
          : (x * 7 + y * 3) % 4;
        this.add.image(x * 32, y * 32, 'rebirth-alpha-ground', frame)
          .setOrigin(0).setScale(GROUND_TILE_SCALE).setDepth(-100);
      }
    }
    for (const [x, y, frame] of [
      [1, 5, 8], [1, 6, 8], [8, 5, 9], [8, 6, 9],
      [11, 2, 10], [12, 2, 10], [2, 7, 12], [13, 7, 13],
    ] as const) {
      this.add.image(x * 32, y * 32, 'rebirth-alpha-ground', frame)
        .setOrigin(0).setScale(GROUND_TILE_SCALE).setDepth(-99);
    }
  }

  setInput(stick: StickVector, basicHeld: boolean): void {
    this.stick = { ...stick };
    this.session.setInput({ stick, basicHeld });
  }

  basicTap(): void {
    if (this.completed) return;
    const result = this.session.tapBasic(this.clockMs);
    if (result.ok) this.showFeedback(result.damage ? '命中！' : '揮拳！');
    else this.showFeedback(this.reasonText(result.reason));
  }

  retry(): void {
    // Restart creates a fresh encounter, while the host reattaches mobile HUD.
    this.resetInput();
    this.scene.restart();
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
    this.session.resetInput();
  }

  update(_time: number, delta: number): void {
    if (!this.playerSprite || this.completed) return;
    // Clock remains monotonic even after browser backgrounding.
    this.clockMs += Math.max(0, Math.min(50, delta));
    if (this.clockMs >= this.feedbackExpiresAt) this.feedback?.setText('');
    this.hitFlash?.clear();
    if (this.clockMs < this.hitFlashExpiresAt) {
      this.hitFlash?.fillStyle(0xf34f67, 0.13).fillRect(0, 0, this.scale.width, this.scale.height);
    }
    const result = this.session.tick(this.clockMs);
    const actionEvents = this.session.consumeActions();
    // Tap and one-shot skills are emitted outside the simulation tick;
    // replay them into the visual event stream without changing damage.
    for (const event of actionEvents) {
      if (event.result.ok) result.state.events.push({
        kind: 'attack', action: event.action,
        targetId: event.result.targetId, damage: event.result.damage,
      });
      if (event.action === 'dash' && event.result.ok) {
        const facing = this.session.encounter.player.facing;
        this.dashFacing = Math.abs(facing.x) > Math.abs(facing.y)
          ? facing.x >= 0 ? 'east' : 'west'
          : facing.y >= 0 ? 'south' : 'north';
        this.dashStartedAt = this.clockMs;
      }
    }
    this.renderState(result.state);
    const objective = advanceAlleyObjective(
      this.objectivePhase, result.state.player.position,
      result.state.enemies.filter(enemy => enemy.hp > 0).length,
      result.state.player.hp,
    );
    if (this.objectivePhase === 'fight' && objective.phase === 'reach-exit') {
      this.showFeedback('敵人已擊退，前往巷口！');
    }
    if (this.objectivePhase !== objective.phase) this.phaseStartedAt = this.clockMs;
    this.objectivePhase = objective.phase;
    const cue = alleyDialogueAt(this.objectivePhase, this.clockMs - this.phaseStartedAt);
    this.dialogueCaption?.setText(cue ? `${cue.speaker}：「${cue.text}」` : '');
    this.dialogueCaption?.setVisible(Boolean(cue));
    this.objectiveLabel?.setText(objective.instruction);
    const clue = inspectAlleyClue(result.state.player.position,
      this.objectivePhase, this.clueDiscovered);
    if (clue.justDiscovered) this.showFeedback('發現地下停車場的增幅器線索！');
    this.clueDiscovered = clue.discovered;
    // Inspecting the existing drain tile is optional and never blocks the exit.
    this.clueNote?.setText(clue.hint ?? '');
    this.clueNote?.setVisible(clue.discovered);
    this.exitIndicator?.clear();
    if (objective.exitVisible) {
      const pulse = 0.6 + 0.2 * Math.sin(this.clockMs / 200);
      this.exitIndicator?.lineStyle(3, 0x64e9c7, pulse)
        .strokeCircle(ALLEY_EXIT.x, ALLEY_EXIT.y, ALLEY_EXIT_RADIUS);
      this.exitIndicator?.fillStyle(0x46d9c0, 0.08)
        .fillCircle(ALLEY_EXIT.x, ALLEY_EXIT.y, ALLEY_EXIT_RADIUS);
    }
    if (objective.phase === 'complete' || objective.phase === 'defeated') {
      this.completed = true;
      this.showFeedback(objective.phase === 'complete' ? '成功離開巷弄' : '角色倒下');
      this.showOutcome(objective.phase === 'complete');
      this.resetInput();
      if (objective.phase === 'complete') this.onVictory?.();
    }
  }

  private renderState(state: AlleySnapshot): void {
    if (!this.playerSprite) return;
    const player = state.player;
    // Consume authoritative hit events before choosing this frame's pose.
    // The combat core continues to own all hit detection, cooldowns and damage.
    for (const event of state.events) {
      if (event.kind !== 'attack' || (event.action !== 'basic' && event.action !== 'punch')) continue;
      this.strikeKind = event.action;
      this.strikeStartedAt = this.clockMs;
      const target = state.enemies.find(enemy => enemy.id === event.targetId);
      const vector = target
        ? { x: target.position.x - player.position.x, y: target.position.y - player.position.y }
        : player.facing;
      this.strikeFacing = Math.abs(vector.x) > Math.abs(vector.y)
        ? vector.x >= 0 ? 'east' : 'west'
        : vector.y >= 0 ? 'south' : 'north';
      if (target && event.damage && event.damage > 0) {
        this.strikeImpact = { x: target.position.x, y: target.position.y - 16, startedAt: this.clockMs };
      }
    }
    const strike = this.strikeStartedAt >= 0
      ? attackVisualAt(this.strikeKind, this.clockMs - this.strikeStartedAt)
      : null;
    const dash = this.dashStartedAt >= 0
      ? dashVisualAt(this.clockMs - this.dashStartedAt)
      : null;
    const facingVector = this.strikeFacing === 'east' ? { x: 1, y: 0 }
      : this.strikeFacing === 'west' ? { x: -1, y: 0 }
        : this.strikeFacing === 'south' ? { x: 0, y: 1 } : { x: 0, y: -1 };
    const push = strike ? 11 * strike.lunge : 0;
    this.playerSprite.setPosition(player.position.x + facingVector.x * push,
      player.position.y + facingVector.y * push);
    this.playerSprite.setAlpha(dash ? 0.82 : 1);
    if (this.playerMetadata) {
      const facing = Math.abs(player.facing.x) > Math.abs(player.facing.y)
        ? player.facing.x >= 0 ? 'east' : 'west'
        : player.facing.y >= 0 ? 'south' : 'north';
      const motion = this.stick.magnitude > 0.16 ? 'walk' : 'idle';
      this.playerSprite.setFrame(strike
        ? this.playerMetadata.animations[this.strikeFacing].attack[strike.frameIndex]
        : animationFrame(this.playerMetadata, facing, motion, this.clockMs, 150));
    }
    this.swingGraphics?.clear();
    if (dash && this.swingGraphics) {
      const dashVector = this.dashFacing === 'east' ? { x: 1, y: 0 }
        : this.dashFacing === 'west' ? { x: -1, y: 0 }
          : this.dashFacing === 'south' ? { x: 0, y: 1 } : { x: 0, y: -1 };
      const baseX = player.position.x - dashVector.x * 8;
      const baseY = player.position.y - dashVector.y * 8 - 16;
      for (let i = 1; i <= 3; i++) {
        const amount = dash.trailLength * i / 3;
        this.swingGraphics.fillStyle(0x6ce9e2, dash.alpha * (0.24 - i * 0.045))
          .fillCircle(baseX - dashVector.x * amount, baseY - dashVector.y * amount, 7 - i);
      }
      this.swingGraphics.lineStyle(3, 0x8df9d7, dash.alpha * 0.65)
        .lineBetween(
          baseX - dashVector.x * dash.trailLength,
          baseY - dashVector.y * dash.trailLength,
          baseX + dashVector.x * 9,
          baseY + dashVector.y * 9,
        );
    }
    if (strike && this.swingGraphics) {
      // Large layered crescent, leading blade, trailing afterimage and impact
      // burst. Drawn in world space using the original protagonist's animation.
      const angle = this.strikeFacing === 'east' ? 0
        : this.strikeFacing === 'west' ? Math.PI
          : this.strikeFacing === 'south' ? Math.PI / 2 : -Math.PI / 2;
      const cx = player.position.x + facingVector.x * 10;
      const cy = player.position.y - 16 + facingVector.y * 10;
      const radius = 43 * strike.strength;
      const alpha = strike.trailAlpha;
      const lead = angle + strike.sweepAngle;
      const trailStart = lead - 1.35;
      // Broad afterimage gives the eye a clear path to follow.
      for (let layer = 0; layer < 3; layer++) {
        const r = radius - layer * 8;
        this.swingGraphics.lineStyle((14 - layer * 3) * strike.strength,
          layer === 0 ? 0x2cb7f5 : layer === 1 ? 0x59f1e3 : 0xffffff,
          alpha * (0.26 + layer * 0.14));
        this.swingGraphics.beginPath();
        this.swingGraphics.arc(cx, cy, r, trailStart, lead, false);
        this.swingGraphics.strokePath();
      }
      // White leading edge: the sweep visibly travels across the character.
      this.swingGraphics.lineStyle(5.5 * strike.strength, 0xffffff, alpha);
      this.swingGraphics.beginPath();
      this.swingGraphics.arc(cx, cy, radius, lead - 0.28, lead + 0.12, false);
      this.swingGraphics.strokePath();
      const tipX = cx + Math.cos(lead) * radius;
      const tipY = cy + Math.sin(lead) * radius;
      this.swingGraphics.fillStyle(0xffffff, alpha).fillCircle(tipX, tipY, 5 * strike.strength);
      this.swingGraphics.fillStyle(0x55e9fb, alpha * 0.65)
        .fillCircle(tipX, tipY, 9 * strike.strength);
    }
    if (this.strikeImpact && this.swingGraphics) {
      const age = this.clockMs - this.strikeImpact.startedAt;
      if (age >= 210) this.strikeImpact = null;
      else {
        const t = age / 210;
        const { x, y } = this.strikeImpact;
        this.swingGraphics.lineStyle(4 * (1 - t) + 1, 0xffe7ac, 1 - t)
          .strokeCircle(x, y, 8 + 25 * t);
        this.swingGraphics.lineStyle(2, 0xffffff, (1 - t) * 0.85);
        for (let i = 0; i < 6; i++) {
          const theta = i * Math.PI / 3;
          const r = 9 + 20 * t;
          this.swingGraphics.lineBetween(
            x + Math.cos(theta) * r, y + Math.sin(theta) * r,
            x + Math.cos(theta) * (r + 8), y + Math.sin(theta) * (r + 8));
        }
      }
    }
    this.dangerGraphics?.clear();
    for (const enemy of state.enemies) {
      if (enemy.hp > 0 && enemy.phase === 'telegraph') {
        const progress = Math.max(0, Math.min(1,
          1 - (enemy.phaseEndsAt - this.clockMs) / enemy.telegraphMs));
        const pulse = 0.32 + 0.24 * Math.sin(this.clockMs / 75);
        this.dangerGraphics?.lineStyle(2 + progress * 2, 0xff625c, 0.7 + pulse * 0.25)
          .strokeCircle(enemy.position.x, enemy.position.y, enemy.reach);
        this.dangerGraphics?.fillStyle(0xff4d59, 0.09 + progress * 0.2)
          .fillCircle(enemy.position.x, enemy.position.y, enemy.reach);
      }
      const sprite = this.enemySprites.get(enemy.id);
      if (!sprite) continue;
      sprite.setPosition(enemy.position.x, enemy.position.y);
      if (this.enemyMetadata && enemy.hp > 0) {
        const motion = enemy.phase === 'telegraph' ? 'attack' : enemy.phase === 'chase' ? 'walk' : 'idle';
        sprite.setFrame(animationFrame(this.enemyMetadata, 'south', motion, this.clockMs, 150));
      }
      sprite.setVisible(enemy.hp > 0);
      sprite.setTint(enemy.phase === 'telegraph' ? 0xff6672
        : enemy.phase === 'stagger' ? 0xffd49a : 0xffffff);
      if (enemy.phase === 'stagger') {
        sprite.setAlpha(0.82 + 0.18 * Math.sin(this.clockMs / 38) ** 2);
      } else sprite.setAlpha(1);
      sprite.setDepth(Math.floor(enemy.position.y));
      const bar = this.enemyHealthBars.get(enemy.id);
      if (bar) {
        bar.clear().setVisible(enemy.hp > 0);
        if (enemy.hp > 0) {
          bar.fillStyle(0x06121c, 0.9).fillRoundedRect(enemy.position.x - 22, enemy.position.y - 51, 44, 8, 2);
          bar.fillStyle(enemy.phase === 'telegraph' ? 0xffac56 : 0xd95168, 1)
            .fillRect(enemy.position.x - 20, enemy.position.y - 49, 40 * enemy.hp / enemy.maxHp, 4);
        }
      }
    }
    this.playerBars?.clear();
    if (this.playerBars) {
      const x = this.hudLeft;
      this.playerBars.fillStyle(0x06121c, 0.95).fillRoundedRect(x - 6, 32, 164, 34, 6);
      this.playerBars.fillStyle(0x2a3946).fillRect(x, 39, 152, 8);
      this.playerBars.fillStyle(0xe45d70).fillRect(x, 39, 152 * player.hp / player.maxHp, 8);
      this.playerBars.fillStyle(0x2a3946).fillRect(x, 52, 152, 7);
      this.playerBars.fillStyle(0x4db9e3).fillRect(x, 52, 152 * player.mp / player.maxMp, 7);
    }
    this.playerSprite.setDepth(Math.floor(player.position.y));
    this.hud?.setText(
      `HP ${Math.ceil(player.hp)}/${player.maxHp}   MP ${Math.floor(player.mp)}/${player.maxMp}   敵人 ${state.enemies.filter(e => e.hp > 0).length}`,
    );
    for (const event of state.events) {
      if (event.kind === 'player-hit') {
        this.hitFlashExpiresAt = this.clockMs + 180;
        this.cameras.main.shake(130, 0.003);
        this.showFeedback(`受到 ${event.damage} 點傷害`);
      }
      if (event.kind === 'enemy-defeated') this.showFeedback('擊倒敵人！');
      if (event.kind === 'attack' && event.damage) this.showFeedback(`命中 ${event.damage}！`);
    }
  }

  private showFeedback(message: string): void {
    this.feedbackExpiresAt = this.clockMs + 950;
    this.feedback?.setText(message);
  }

  private showOutcome(cleared: boolean): void {
    if (this.outcomePanel) return;
    const width = Math.min(386, this.scale.width - 48);
    const half = width / 2;
    const overlay = this.add.graphics()
      .fillStyle(0x050d18, 0.64)
      .fillRect(-this.scale.width / 2, -this.scale.height / 2,
        this.scale.width, this.scale.height)
      .fillStyle(0x0b1e30, 0.97)
      .fillRoundedRect(-half, -77, width, 154, 14)
      .lineStyle(2, cleared ? 0x58d8be : 0xef7485, 1)
      .strokeRoundedRect(-half, -77, width, 154, 14);
    const eyebrow = this.add.text(0, -56, cleared ? 'CHAPTER 01  ·  CLEAR' : 'CHAPTER 01  ·  RETRY', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#93b9cb',
      fontStyle: 'bold', letterSpacing: 2,
    }).setOrigin(0.5);
    const title = this.add.text(0, -26, cleared ? '成功逃出巷弄' : '挑戰失敗', {
      fontFamily: 'system-ui, sans-serif', fontSize: '26px',
      color: cleared ? '#8df9d7' : '#ff8b9c', fontStyle: 'bold',
    }).setOrigin(0.5);
    const detail = this.add.text(0, 9,
      cleared ? '阿澤暫時安全了，下一段旅程即將開始' : '調整戰鬥節奏，再挑戰一次', {
        fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#e5f2f8',
        align: 'center', wordWrap: { width: width - 24 },
      }).setOrigin(0.5);
    const clue = this.add.text(0, 36,
      cleared ? (this.clueDiscovered ? '✓ 已記錄 B2 停車場線索' : '尚未發現巷弄中的隱藏線索') : '保留戰鬥經驗，再試一次', {
        fontFamily: 'system-ui, sans-serif', fontSize: '13px',
        color: this.clueDiscovered ? '#f5d28d' : '#9cb7c7',
      }).setOrigin(0.5);
    const instruction = this.add.text(0, 61, '點擊右上角「重新挑戰」再玩一次', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#c4e7ec',
    }).setOrigin(0.5);
    this.outcomePanel = this.add.container(this.scale.width / 2, this.scale.height / 2,
      [overlay, eyebrow, title, detail, clue, instruction]).setScrollFactor(0).setDepth(150);
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
