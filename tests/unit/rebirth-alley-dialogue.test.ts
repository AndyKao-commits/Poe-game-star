import { describe, expect, it } from 'vitest';
import { alleyDialogueAt } from '../../src/rebirth/dev/alleyDialogue';

describe('Chapter 1 dialogue captions', () => {
  it('introduces the protagonist and a hostile response without blocking combat', () => {
    expect(alleyDialogueAt('fight', 0)).toEqual({
      speaker: '阿澤', text: '我只是想買個宵夜，還得順便處理勒索？',
    });
    expect(alleyDialogueAt('fight', 2400)?.speaker).toBe('混混');
    expect(alleyDialogueAt('fight', 4400)?.speaker).toBe('阿澤');
    expect(alleyDialogueAt('fight', 6700)).toBeNull();
  });

  it('only reveals the garage hint after the enemy encounter clears', () => {
    expect(alleyDialogueAt('fight', 1000)?.text).not.toContain('地下停車場');
    expect(alleyDialogueAt('reach-exit', 0)?.text).toContain('地下停車場');
    expect(alleyDialogueAt('reach-exit', 2500)?.text).toContain('巷口');
    expect(alleyDialogueAt('reach-exit', 5100)).toBeNull();
  });

  it('does not show stale dialogue on victory or defeat', () => {
    expect(alleyDialogueAt('complete', 0)).toBeNull();
    expect(alleyDialogueAt('defeated', 0)).toBeNull();
  });

  it('rejects invalid time values and returns safe copies', () => {
    expect(() => alleyDialogueAt('fight', -1)).toThrow();
    expect(() => alleyDialogueAt('fight', NaN)).toThrow();
    const cue = alleyDialogueAt('fight', 0)!;
    cue.text = 'changed';
    expect(alleyDialogueAt('fight', 0)?.text).not.toBe('changed');
  });
});
