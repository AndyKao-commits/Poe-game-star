import { RebirthAlleyEncounter, type AlleySnapshot } from '../combat/alleyEncounter';
import { type Action, type CombatResult } from '../combat/alphaCombat';
import { type StickVector } from '../input/touchControls';

const IDLE: StickVector = { x: 0, y: 0, magnitude: 0 };
const HOLD_REPEAT_MS = 450;
const MAX_ACTIONS_PER_TICK = 1;

export interface SessionStep {
  state: AlleySnapshot;
  actions: CombatResult[];
}
export interface SessionInput {
  stick: StickVector;
  basicHeld: boolean;
}
export interface SessionActionEvent {
  action: Action;
  result: CombatResult;
}

/**
 * One authoritative integration boundary between mobile controls and the
 * Chapter 1 encounter. A Phaser scene will provide input and render snapshots;
 * this session does not render proxies or bypass the release gate.
 *
 * Hold-to-attack is sampled on each tick (one attempt per tick maximum).
 * Failed no-target attempts do not lock the attack button; a target moving into
 * range is immediately attackable. A successful hit is governed by the combat
 * core's own 450ms cooldown.
 */
export class RebirthAlleySession {
  private stick: StickVector = { ...IDLE };
  private basicHeld = false;
  private nextBasicAttemptAt = 0;
  private lastNow: number | null = null;
  private pendingActions: SessionActionEvent[] = [];
  private ended = false;

  constructor(readonly encounter = new RebirthAlleyEncounter()) {}

  setInput(input: SessionInput): void {
    if (![input.stick.x, input.stick.y, input.stick.magnitude].every(Number.isFinite) ||
        input.stick.magnitude < 0 || input.stick.magnitude > 1 ||
        Math.hypot(input.stick.x, input.stick.y) > 1.001) {
      throw new Error('Invalid session stick');
    }
    if (this.ended) return;
    this.stick = { ...input.stick };
    if (!input.basicHeld && this.basicHeld) this.nextBasicAttemptAt = 0;
    this.basicHeld = input.basicHeld;
  }

  /**
   * One-shot skills can be triggered by an independent second pointer while
   * the left thumb continues steering.
   */
  trigger(action: 'punch' | 'dash', nowMs: number): CombatResult {
    this.assertTime(nowMs);
    if (this.ended) return { ok: false, action, reason: 'dead' };
    const result = this.encounter.action(action, nowMs);
    this.pendingActions.push({ action, result });
    return result;
  }

  tick(nowMs: number): SessionStep {
    this.assertTime(nowMs);
    const actions: CombatResult[] = [];
    if (!this.ended && this.basicHeld && nowMs >= this.nextBasicAttemptAt) {
      for (let attempt = 0; attempt < MAX_ACTIONS_PER_TICK; attempt++) {
        const result = this.encounter.action('basic', nowMs);
        actions.push(result);
        // No-target retries are limited to 50ms to avoid expensive per-frame
        // sorting; cooldown/mana/death respect the authoritative combat state.
        this.nextBasicAttemptAt = result.ok
          ? nowMs + HOLD_REPEAT_MS
          : result.reason === 'cooldown'
            ? Math.max(nowMs + 1, this.encounter.player.readyAt.basic)
            : nowMs + 50;
      }
    }
    const state = this.encounter.tick(nowMs, this.stick);
    if (state.cleared || state.defeated) {
      this.ended = true;
      this.basicHeld = false;
      this.stick = { ...IDLE };
    }
    this.lastNow = nowMs;
    return { state, actions };
  }

  consumeActions(): SessionActionEvent[] {
    return this.pendingActions.splice(0);
  }

  resetInput(): void {
    this.stick = { ...IDLE };
    this.basicHeld = false;
    this.nextBasicAttemptAt = 0;
  }

  get isEnded(): boolean { return this.ended; }

  private assertTime(nowMs: number): void {
    if (!Number.isFinite(nowMs) || nowMs < 0 ||
        (this.lastNow !== null && nowMs < this.lastNow)) {
      throw new Error('Nonmonotonic session time');
    }
  }
}
