import { describe, expect, it } from 'vitest';
import {
  detectPlayOrientation,
  shouldShowRotatePrompt,
  shouldShowTouchControls,
} from '../../src/core/input/orientation';

describe('orientation helpers', () => {
  it('detects landscape vs portrait', () => {
    expect(detectPlayOrientation(800, 400)).toBe('landscape');
    expect(detectPlayOrientation(400, 800)).toBe('portrait');
  });

  it('shows rotate prompt only in portrait', () => {
    expect(shouldShowRotatePrompt('portrait')).toBe(true);
    expect(shouldShowRotatePrompt('landscape')).toBe(false);
  });

  it('shows touch controls only for coarse landscape', () => {
    expect(
      shouldShowTouchControls({ orientation: 'landscape', coarsePointer: true }),
    ).toBe(true);
    expect(
      shouldShowTouchControls({ orientation: 'portrait', coarsePointer: true }),
    ).toBe(false);
    expect(
      shouldShowTouchControls({ orientation: 'landscape', coarsePointer: false }),
    ).toBe(false);
  });
});
