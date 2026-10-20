import { describe, expect, it } from 'vitest';
import { alphaViewport } from '../../src/rebirth/dev/alphaViewport';

describe('Rebirth landscape viewport', () => {
  it('preserves original 480x270 composition on 16:9 displays', () => {
    expect(alphaViewport(960, 540)).toEqual({ width: 480, height: 270 });
  });
  it('extends the world horizontally on extra-wide Safari landscape', () => {
    expect(alphaViewport(844, 300)).toEqual({ width: 760, height: 270 });
  });
  it('does not compress the battle arena on narrower viewports', () => {
    expect(alphaViewport(600, 390)).toEqual({ width: 480, height: 270 });
  });
  it('rejects invalid screen measurements', () => {
    expect(() => alphaViewport(0, 300)).toThrow('Invalid Alpha viewport');
  });
});
