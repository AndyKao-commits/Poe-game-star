import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateSpriteSheetMetadata, type SpriteSheetMetadata } from '../../src/rebirth/art/animationContract';

const pngPath = join(process.cwd(), 'public/rebirth/art/fire-brawler-character.png');
const jsonPath = join(process.cwd(), 'public/rebirth/art/fire-brawler-character.json');
const sourcePath = join(process.cwd(), 'art/rebirth/source/fire-brawler-character.ora');

describe('Committed Rebirth CHAR-02 original art', () => {
  it('contains a real PNG with exactly 36 character frames', () => {
    const bytes = readFileSync(pngPath);
    expect(bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))).toBe(true);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    expect({ width, height }).toEqual({ width: 288, height: 192 });
    const meta = JSON.parse(readFileSync(jsonPath, 'utf8')) as SpriteSheetMetadata;
    expect(() => validateSpriteSheetMetadata(meta, width, height)).not.toThrow();
  });

  it('keeps explicit review status and source provenance', () => {
    const meta = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
      id: string; approved: boolean; reviewStatus: string; sourceFile: string;
    };
    expect(meta.id).toBe('CHAR-02');
    expect(meta.approved).toBe(false);
    expect(meta.reviewStatus).toContain('CANDIDATE');
    expect(meta.sourceFile).toBe('art/rebirth/source/fire-brawler-character.ora');
  });

  it('ships editable OpenRaster source, not just a flattened image', () => {
    const bytes = readFileSync(sourcePath);
    expect(bytes.subarray(0, 2).toString('ascii')).toBe('PK');
    expect(bytes.includes(Buffer.from('stack.xml'))).toBe(true);
    expect(bytes.includes(Buffer.from('data/layer0.png'))).toBe(true);
  });
});
