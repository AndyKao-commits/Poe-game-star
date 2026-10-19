import { describe, expect, it } from 'vitest';
import { ALLEY_CLUE_POSITION, ALLEY_CLUE_RADIUS, inspectAlleyClue } from '../../src/rebirth/dev/alleyClue';

describe('optional Chapter 1 environmental evidence', () => {
  it('does not reveal evidence before combat ends', () => {
    expect(inspectAlleyClue(ALLEY_CLUE_POSITION, 'fight', false)).toMatchObject({
      discovered: false, justDiscovered: false, nearby: true, hint: null,
    });
  });

  it('reveals original drain-tile clue exactly once when approached after combat', () => {
    const found = inspectAlleyClue(ALLEY_CLUE_POSITION, 'reach-exit', false);
    expect(found).toMatchObject({ discovered: true, justDiscovered: true });
    expect(found.hint).toContain('增幅器');
    const repeat = inspectAlleyClue(ALLEY_CLUE_POSITION, 'reach-exit', true);
    expect(repeat.justDiscovered).toBe(false);
    expect(repeat.discovered).toBe(true);
  });

  it('does not block completion or require player to visit clue', () => {
    expect(inspectAlleyClue({ x: 430, y: 135 }, 'reach-exit', false).discovered).toBe(false);
    expect(inspectAlleyClue({ x: 430, y: 135 }, 'complete', false).discovered).toBe(false);
  });

  it('includes radius edge and persists journal text after walking away', () => {
    expect(inspectAlleyClue({
      x: ALLEY_CLUE_POSITION.x + ALLEY_CLUE_RADIUS, y: ALLEY_CLUE_POSITION.y,
    }, 'reach-exit', false).justDiscovered).toBe(true);
    expect(inspectAlleyClue({ x: 24, y: 24 }, 'reach-exit', true).hint).toContain('線索已記錄');
  });

  it('rejects non-finite positions', () => {
    expect(() => inspectAlleyClue({ x: Infinity, y: 1 }, 'reach-exit', false)).toThrow();
  });
});
