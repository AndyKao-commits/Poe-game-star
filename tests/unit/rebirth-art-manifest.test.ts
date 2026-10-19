import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rebirthArtRegistry } from '../../src/rebirth/art/assetRegistry';

const root = resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/rebirth/T04_CANDIDATE_MANIFEST.json'), 'utf8')) as
  Record<string, { releaseApproved: boolean; ownerProvisionalApproval: boolean; files: Record<string, string> }>;

describe('T04 byte-exact candidate metadata integration', () => {
  for (const [id, filename] of [
    ['CHAR-01', 'aze-character.json'],
    ['ENV-01', 'urban-ground-atlas.json'],
  ] as const) {
    it(`${id} JSON is identical to the pinned V2 candidate`, () => {
      const path = `public/rebirth/art/${filename}`;
      const actual = readFileSync(resolve(root, path));
      const digest = createHash('sha256').update(actual).digest('hex');
      expect(digest).toBe(manifest[id].files[path]);
      expect(JSON.parse(actual.toString('utf8')).approved).toBe(false);
    });
  }

  it('does not accidentally grant release approval to either candidate', () => {
    expect(manifest['CHAR-01'].ownerProvisionalApproval).toBe(true);
    expect(manifest['ENV-01'].ownerProvisionalApproval).toBe(false);
    expect(manifest['CHAR-01'].releaseApproved).toBe(false);
    expect(manifest['ENV-01'].releaseApproved).toBe(false);
    expect(rebirthArtRegistry['CHAR-01'].releaseApproved).toBe(false);
    expect(rebirthArtRegistry['ENV-01'].releaseApproved).toBe(false);
  });
});
