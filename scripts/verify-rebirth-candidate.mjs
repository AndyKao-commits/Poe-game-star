/**
 * Rebirth T04 candidate verification (not a release gate).
 * Usage: node scripts/verify-rebirth-candidate.mjs /path/to/unzipped/rebirth_t04_v2
 * No network calls, writes, art generation or gameplay activation.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const project = resolve(import.meta.dirname, '..');
const candidateRoot = resolve(process.argv[2] ?? project);
const manifest = JSON.parse(readFileSync(resolve(project, 'docs/rebirth/T04_CANDIDATE_MANIFEST.json'), 'utf8'));
const failures = [];
const assert = (condition, reason) => { if (!condition) failures.push(reason); };
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

for (const id of ['CHAR-01', 'ENV-01']) {
  const asset = manifest[id];
  assert(asset?.releaseApproved === false, `${id}: candidate must not imply release approval`);
  if (!asset) continue;
  for (const [relative, expectedHash] of Object.entries(asset.files)) {
    const path = resolve(candidateRoot, relative);
    if (!existsSync(path)) { failures.push(`${id}: missing ${relative}`); continue; }
    const buffer = readFileSync(path);
    const hash = createHash('sha256').update(buffer).digest('hex');
    assert(hash === expectedHash, `${id}: SHA-256 mismatch ${relative}`);
    if (relative.endsWith('.ora')) {
      assert(buffer.subarray(0, 2).toString('hex') === '504b', `${id}: source not ZIP/OpenRaster`);
    }
    if (relative.endsWith('.png')) {
      assert(buffer.length > 32 && buffer.subarray(0, 8).equals(signature), `${id}: invalid PNG`);
      if (buffer.length > 32 && buffer.subarray(0, 8).equals(signature)) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        assert(width === asset.frameWidth * asset.columns && height === asset.frameHeight * asset.rows,
          `${id}: invalid grid ${width}x${height}`);
        assert(buffer[25] === 6, `${id}: expected RGBA PNG color type 6`);
      }
    }
    if (relative.endsWith('.json')) {
      try {
        const meta = JSON.parse(buffer.toString('utf8'));
        assert(meta.id === id, `${id}: metadata ID mismatch`);
        assert(meta.frameWidth === asset.frameWidth && meta.frameHeight === asset.frameHeight,
          `${id}: metadata frame mismatch`);
        assert(meta.approved === false, `${id}: candidate metadata unexpectedly marked final`);
        if (id === 'CHAR-01') {
          const used = new Set();
          for (const direction of ['north', 'south', 'east', 'west']) {
            const states = meta.animations?.[direction];
            assert(Boolean(states), `${id}: missing direction ${direction}`);
            if (!states) continue;
            for (const [state, min] of [['idle', 1], ['walk', 4], ['attack', 3], ['hurt', 1]]) {
              const frames = states[state];
              assert(Array.isArray(frames) && frames.length >= min,
                `${id}: missing ${direction}/${state}`);
              if (!Array.isArray(frames)) continue;
              for (const index of frames) {
                assert(Number.isInteger(index) && index >= 0 && index < asset.columns * asset.rows,
                  `${id}: out-of-range frame ${index}`);
                assert(!used.has(index), `${id}: frame reused across states ${index}`);
                used.add(index);
              }
            }
          }
          assert(used.size === 36, `${id}: expected 36 distinct animation frames, found ${used.size}`);
          assert(Number.isFinite(meta.feetAnchor?.x) && Number.isFinite(meta.feetAnchor?.y),
            `${id}: missing feet anchor`);
        }
      } catch (error) { failures.push(`${id}: invalid JSON: ${error.message}`); }
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error('FAIL:', failure);
  console.error(`T04 candidate verification FAILED (${failures.length} issues); runtime remains locked.`);
  process.exitCode = 1;
} else {
  console.log('T04 candidate SHA-256, PNG grid, metadata and source signatures PASS.');
  console.log('Candidate is NOT release approved; no gameplay activation.');
}
