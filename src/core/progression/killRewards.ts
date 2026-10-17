/**
 * Exactly-once kill reward claims (XP / gold).
 * Pure state machine — no Phaser. Guards against death-animation / multi-hit double awards.
 */

import {
  awardExperience,
  type ExperienceAward,
  type ProgressionState,
} from './experience';

export interface KillReward {
  /** Nonnegative XP granted when the kill is claimed. Zero is allowed. */
  xp: number;
  /** Nonnegative gold granted when the kill is claimed. Zero is allowed. */
  gold: number;
}

export interface KillRewardLedger {
  /** Kill IDs that have already been claimed. */
  readonly claimedKillIds: ReadonlySet<string>;
  /** Cumulative gold from successful claims. */
  readonly gold: number;
}

export interface KillRewardClaimResult {
  ledger: KillRewardLedger;
  progression: ExperienceAward;
  reward: KillReward;
  /** True when this call was the first successful claim for killId. */
  claimed: true;
}

export function createKillRewardLedger(gold = 0): KillRewardLedger {
  if (!Number.isSafeInteger(gold) || gold < 0) {
    throw new RangeError('gold must be a nonnegative safe integer');
  }
  return { claimedKillIds: new Set(), gold };
}

export function hasClaimedKill(ledger: KillRewardLedger, killId: string): boolean {
  return ledger.claimedKillIds.has(killId);
}

function assertReward(reward: KillReward): void {
  if (!Number.isSafeInteger(reward.xp) || reward.xp < 0) {
    throw new RangeError('kill XP must be a nonnegative safe integer');
  }
  if (!Number.isSafeInteger(reward.gold) || reward.gold < 0) {
    throw new RangeError('kill gold must be a nonnegative safe integer');
  }
}

/**
 * Claims a kill reward exactly once.
 * Returns `null` if `killId` was already claimed (duplicate death / hit).
 * Never mutates the input ledger or progression state.
 */
export function claimKillReward(
  ledger: KillRewardLedger,
  progression: ProgressionState,
  killId: string,
  reward: KillReward,
): KillRewardClaimResult | null {
  if (typeof killId !== 'string' || killId.length === 0) {
    throw new RangeError('killId must be a nonempty string');
  }
  assertReward(reward);
  if (ledger.claimedKillIds.has(killId)) {
    return null;
  }
  if (!Number.isSafeInteger(ledger.gold + reward.gold)) {
    throw new RangeError('Total gold exceeds safe integer range');
  }

  const claimedKillIds = new Set(ledger.claimedKillIds);
  claimedKillIds.add(killId);

  return {
    ledger: {
      claimedKillIds,
      gold: ledger.gold + reward.gold,
    },
    progression: awardExperience(progression, reward.xp),
    reward,
    claimed: true,
  };
}
