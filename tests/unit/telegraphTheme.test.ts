import { describe, expect, it } from 'vitest';
import {
  DAMAGE_FLASH,
  DAMAGE_FLASH_CSS,
  TELEGRAPH_AMBER,
  TELEGRAPH_AMBER_CSS,
} from '../../src/ui/telegraphTheme';

describe('telegraphTheme', () => {
  it('matches Art Bible D telegraph amber and damage flash', () => {
    expect(TELEGRAPH_AMBER).toBe(0xd5a64a);
    expect(DAMAGE_FLASH).toBe(0xd65c50);
    expect(TELEGRAPH_AMBER_CSS.toLowerCase()).toBe('#d5a64a');
    expect(DAMAGE_FLASH_CSS.toLowerCase()).toBe('#d65c50');
  });
});
