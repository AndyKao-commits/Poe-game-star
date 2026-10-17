/** Verify Art D binary handoff without touching placeholder assets.
 * Usage: node scripts/verify-art-d.mjs [path/to/art-d]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'public/assets/art-d';
const manifestPath = join(root, 'manifest.json');
if (!existsSync(manifestPath)) {
  console.error('Missing Art D manifest:', manifestPath);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const expected = [
  ['player.png', 256, 192, 32, 32],
  ['crawler.png', 128, 160, 32, 32],
  ['sentinel.png', 128, 160, 32, 32],
  ...['tile-floor', 'tile-wall', 'tile-obstacle', 'tile-void'].map((n) => [n + '.png', 64, 32]),
  ...['slash', 'telegraph', 'hit'].map((n) => [n + '.png', 48, 48]),
  ...['ui-attack', 'ui-skill', 'ui-potion'].map((n) => [n + '.png', 32, 32]),
];
let errors = 0;
for (const [file, width, height, cellW, cellH] of expected) {
  const path = join(root, file);
  if (!existsSync(path)) {
    console.error('MISSING', file);
    errors++;
    continue;
  }
  const png = readFileSync(path);
  if (png.length < 33 || !png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || png.toString('ascii', 12, 16) !== 'IHDR') {
    console.error('INVALID PNG', file);
    errors++;
    continue;
  }
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  const colorType = png[25];
  const dimensionsOk = w === width && h === height;
  const alphaCapable = colorType === 4 || colorType === 6 || png.includes(Buffer.from('tRNS'));
  const gridOk = !cellW || (w % cellW === 0 && h % cellH === 0);
  if (!dimensionsOk || !alphaCapable || !gridOk) {
    console.error('INVALID', file, { width: w, height: h, colorType, dimensionsOk, alphaCapable, gridOk });
    errors++;
  } else {
    console.log('OK', file, w + 'x' + h, 'alpha-capable');
  }
}
if (manifest.status?.includes('pending')) {
  console.warn('Manifest still marks binary delivery as pending.');
}
console.log(expected.length - errors + '/' + expected.length + ' Art D PNG headers verified');
if (errors) process.exitCode = 1;
