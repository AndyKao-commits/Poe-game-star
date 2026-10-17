import { describe, expect, it } from 'vitest';
import {
  advanceIdleMs,
  CONTROL_ACTIVE_OPACITY,
  CONTROL_IDLE_DELAY_MS,
  CONTROL_IDLE_OPACITY,
  resolveControlOpacity,
} from '../../src/core/input/visibility';

describe('control visibility', () => {
  it('fades to idle opacity after 3s without interaction', () => {
    expect(
      resolveControlOpacity({ mode: 'fade', idleMs: 0, interacting: true }),
    ).toBe(CONTROL_ACTIVE_OPACITY);
    expect(
      resolveControlOpacity({
        mode: 'fade',
        idleMs: CONTROL_IDLE_DELAY_MS,
        interacting: false,
      }),
    ).toBe(CONTROL_IDLE_OPACITY);
  });

  it('supports hidden and always modes', () => {
    expect(
      resolveControlOpacity({ mode: 'hidden', idleMs: 0, interacting: true }),
    ).toBe(0);
    expect(
      resolveControlOpacity({ mode: 'always', idleMs: 99999, interacting: false }),
    ).toBe(CONTROL_ACTIVE_OPACITY);
  });

  it('resets idle clock while interacting', () => {
    expect(advanceIdleMs(2000, 16, true)).toBe(0);
    expect(advanceIdleMs(2000, 16, false)).toBe(2016);
  });
});
