import { describe, expect, it } from 'vitest';
import { clampDeltaMs, MAX_DELTA_MS } from '../../src/core/time/delta';

describe('clampDeltaMs', () => {
  it('caps large deltas after tab resume', () => {
    expect(clampDeltaMs(5_000)).toBe(MAX_DELTA_MS);
    expect(clampDeltaMs(16)).toBe(16);
  });

  it('treats invalid values as zero', () => {
    expect(clampDeltaMs(Number.NaN)).toBe(0);
    expect(clampDeltaMs(-10)).toBe(0);
  });
});
