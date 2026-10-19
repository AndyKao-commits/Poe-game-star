import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateSpriteSheetMetadata, type SpriteSheetMetadata } from '../../src/rebirth/art/animationContract';

const path = (file: string) => join(process.cwd(), 'public/rebirth/art', file);
const imageDimensions = (name: string) => {
  const png = readFileSync(path(name));
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
};

describe('Real reviewed V2 candidate assets committed to GitHub', () => {
  it('ships 36 original protagonist animation frames', () => {
    const size = imageDimensions('aze-character.png');
    expect(size).toEqual({ width: 288, height: 192 });
    const metadata = JSON.parse(readFileSync(path('aze-character.json'), 'utf8')) as SpriteSheetMetadata;
    expect(() => validateSpriteSheetMetadata(metadata, size.width, size.height)).not.toThrow();
  });

  it('ships all 16 original urban ground tiles', () => {
    const size = imageDimensions('urban-ground-atlas.png');
    expect(size).toEqual({ width: 128, height: 128 });
    const metadata = JSON.parse(readFileSync(path('urban-ground-atlas.json'), 'utf8')) as {
      frameWidth: number; frameHeight: number;
    };
    expect(size.width / metadata.frameWidth * size.height / metadata.frameHeight).toBe(16);
  });

  it('retains the lossless pixel recovery scripts and expected hashes', () => {
    for (const name of ['aze-v2', 'ground-v2']) {
      const source = readFileSync(join(process.cwd(), 'scripts', 'restore-rebirth-' + name + '.py'), 'utf8');
      expect(source).toContain('EXPECTED_RGBA_SHA256');
      expect(source).toContain('INDEXED_ZLIB_BASE64');
    }
  });
});
