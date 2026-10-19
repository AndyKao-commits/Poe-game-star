/**
 * T04 candidate-art audit. Run manually with: node scripts/audit-rebirth-art.mjs
 * Intentionally exits nonzero until approved final assets are delivered.
 * Never generates substitutes or enables gameplay.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const candidates = [
  { id: 'ENV-01', name: 'urban-ground-atlas', frame: [32, 32], kind: 'tile' },
  { id: 'CHAR-01', name: 'aze-character', frame: [32, 48], kind: 'character' },
];
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
for (const asset of candidates) {
  const base = resolve(root, 'public/rebirth/art', asset.name);
  const sources = ['.aseprite', '.kra', '.psd'].map(ext => resolve(root, 'art/rebirth/source', asset.name + ext));
  check(sources.some(existsSync), asset.id + ': editable source missing');
  const pngPath = base + '.png';
  const jsonPath = base + '.json';
  if (!existsSync(pngPath)) {
    failures.push(asset.id + ': PNG missing');
  } else {
    const buf = readFileSync(pngPath);
    const signature = Buffer.from([137,80,78,71,13,10,26,10]);
    if (buf.length < 33 || !buf.subarray(0,8).equals(signature) || buf.toString('ascii',12,16) !== 'IHDR') {
      failures.push(asset.id + ': invalid PNG header');
    } else {
      const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
      check(w > 0 && h > 0 && w % asset.frame[0] === 0 && h % asset.frame[1] === 0,
        asset.id + ': PNG dimensions not aligned to ' + asset.frame.join('x') + ': ' + w + 'x' + h);
      check([4,6].includes(buf[25]), asset.id + ': PNG must support alpha transparency');
    }
  }
  if (!existsSync(jsonPath)) {
    failures.push(asset.id + ': metadata JSON missing');
  } else {
    try {
      const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
      check(data.frameWidth === asset.frame[0] && data.frameHeight === asset.frame[1],
        asset.id + ': metadata frame dimensions mismatch');
      check(typeof data.creator === 'string' && data.creator.trim().length > 0,
        asset.id + ': creator provenance missing');
      check(typeof data.sourceFile === 'string' && data.sourceFile.trim().length > 0,
        asset.id + ': sourceFile provenance missing');
      check(data.approved === true, asset.id + ': visual approval not recorded');
      if (asset.kind === 'character') {
        for (const dir of ['north', 'south', 'east', 'west']) {
          const states = data.animations?.[dir];
          check(states && Array.isArray(states.idle) && states.idle.length >= 1 &&
            Array.isArray(states.walk) && states.walk.length >= 4 &&
            Array.isArray(states.attack) && states.attack.length >= 3 &&
            Array.isArray(states.hurt) && states.hurt.length >= 1,
            asset.id + ': missing animation frames for ' + dir);
        }
        check(data.feetAnchor && Number.isFinite(data.feetAnchor.x) && Number.isFinite(data.feetAnchor.y),
          asset.id + ': feetAnchor missing');
      }
    } catch (error) { failures.push(asset.id + ': invalid metadata: ' + error.message); }
  }
}
if (failures.length) {
  for (const failure of failures) console.error('BLOCKED:', failure);
  console.error('T04 art gate CLOSED (' + failures.length + ' unmet checks).');
  process.exitCode = 1;
} else {
  console.log('T04 file-format checks PASS; independent visual/mobile review still required.');
}
