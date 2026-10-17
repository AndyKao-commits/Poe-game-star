/**
 * Generates legal, replaceable placeholder pixel PNGs.
 * These are original procedural pixels — not concept art sheets.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../public/assets');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function px(rgba, w, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  rgba[i] = r;
  rgba[i + 1] = g;
  rgba[i + 2] = b;
  rgba[i + 3] = a;
}

function fillRect(rgba, w, x0, y0, rw, rh, r, g, b, a = 255) {
  for (let y = y0; y < y0 + rh; y++) {
    for (let x = x0; x < x0 + rw; x++) px(rgba, w, x, y, r, g, b, a);
  }
}

function drawDiamondFloor(rgba, w, h, palette) {
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = Math.abs((x + 0.5 - cx) / (w / 2));
      const ny = Math.abs((y + 0.5 - cy) / (h / 2));
      if (nx + ny <= 1.02) {
        const shade = (x + y) % 7 === 0 ? 1 : 0;
        const c = palette[shade];
        px(rgba, w, x, y, c[0], c[1], c[2], 255);
      }
    }
  }
}

function makeTile(kind) {
  const w = 64;
  const h = 32;
  const rgba = Buffer.alloc(w * h * 4);
  if (kind === 'floor') {
    drawDiamondFloor(rgba, w, h, [
      [58, 52, 48],
      [72, 64, 56],
    ]);
  } else if (kind === 'wall') {
    drawDiamondFloor(rgba, w, h, [
      [36, 34, 40],
      [48, 44, 52],
    ]);
    // upright block hint
    fillRect(rgba, w, 22, 2, 20, 18, 70, 66, 78, 255);
    fillRect(rgba, w, 24, 4, 16, 14, 90, 82, 96, 255);
  } else if (kind === 'obstacle') {
    drawDiamondFloor(rgba, w, h, [
      [50, 46, 42],
      [62, 56, 50],
    ]);
    fillRect(rgba, w, 26, 8, 12, 12, 110, 90, 70, 255);
    fillRect(rgba, w, 28, 10, 8, 8, 140, 110, 80, 255);
  } else {
    // void — faint rim only
    drawDiamondFloor(rgba, w, h, [
      [18, 16, 22],
      [24, 20, 28],
    ]);
  }
  return encodePng(w, h, rgba);
}

/**
 * Player sheet layout (replaceable art spec):
 * - Cell: 32×32, columns = 8 facings (e,se,s,sw,w,nw,n,ne)
 * - Rows 0–1: idle | Rows 2–3: run | Rows 4–5: attack (windup, strike/hit)
 */
function makeCharacterSheet() {
  const cols = 8;
  const rows = 6;
  const cw = 32;
  const ch = 32;
  const w = cols * cw;
  const h = rows * ch;
  const rgba = Buffer.alloc(w * h * 4);

  const body = [160, 140, 110];
  const cloak = [90, 40, 48];
  const trim = [190, 160, 70];

  for (let facing = 0; facing < 8; facing++) {
    for (let frame = 0; frame < rows; frame++) {
      const ox = facing * cw;
      const oy = frame * ch;
      const bob = frame % 2 === 1 ? 1 : 0;
      const lean = facing >= 4 ? -1 : 1;
      const attack = frame >= 4;
      const strike = frame === 5;
      fillRect(rgba, w, ox + 10, oy + 26, 12, 4, 0, 0, 0, 90);
      fillRect(rgba, w, ox + 11 + lean, oy + 12 + bob, 10, 12, cloak[0], cloak[1], cloak[2]);
      fillRect(rgba, w, ox + 12, oy + 10 + bob, 8, 10, body[0], body[1], body[2]);
      fillRect(rgba, w, ox + 13, oy + 5 + bob, 6, 6, 210, 190, 160);
      const weaponReach = attack ? (strike ? 7 : 4) : 0;
      fillRect(
        rgba,
        w,
        ox + 20 + lean + (strike ? lean : 0),
        oy + 12 + bob,
        3 + weaponReach,
        8,
        trim[0],
        trim[1],
        trim[2],
      );
      if (strike) {
        fillRect(rgba, w, ox + 24 + lean * 2, oy + 10 + bob, 4, 4, 240, 220, 140, 200);
      }
      if (frame >= 2 && frame <= 3) {
        fillRect(rgba, w, ox + 12 + (frame === 2 ? -1 : 1), oy + 22 + bob, 3, 4, 70, 60, 50);
        fillRect(rgba, w, ox + 17 + (frame === 2 ? 1 : -1), oy + 22 + bob, 3, 4, 70, 60, 50);
      } else {
        fillRect(rgba, w, ox + 13, oy + 22 + bob, 3, 4, 70, 60, 50);
        fillRect(rgba, w, ox + 16, oy + 22 + bob, 3, 4, 70, 60, 50);
      }
    }
  }
  return encodePng(w, h, rgba);
}

/**
 * Enemy sheet layout:
 * - Cell 32×32, 4 columns (animation frames)
 * - Row 0 idle | 1 chase | 2 hurt | 3 windup (telegraph) | 4 attack
 */
function makeEnemySheet() {
  const cols = 4;
  const rows = 5;
  const cw = 32;
  const ch = 32;
  const w = cols * cw;
  const h = rows * ch;
  const rgba = Buffer.alloc(w * h * 4);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ox = col * cw;
      const oy = row * ch;
      const pulse = col % 2;
      let body = [70, 90, 60];
      if (row === 2) body = [200, 80, 70];
      if (row === 3) body = [180, 160, 40]; // windup telegraph
      if (row === 4) body = [120, 40, 40]; // strike
      fillRect(rgba, w, ox + 9, oy + 24, 14, 5, 0, 0, 0, 100);
      fillRect(rgba, w, ox + 10, oy + 12 + pulse, 12, 12, body[0], body[1], body[2]);
      fillRect(rgba, w, ox + 12, oy + 6 + pulse, 8, 8, 40, 50, 35);
      fillRect(rgba, w, ox + 13, oy + 8 + pulse, 2, 2, 220, 60, 40);
      fillRect(rgba, w, ox + 17, oy + 8 + pulse, 2, 2, 220, 60, 40);
      if (row === 1 || row === 4) {
        fillRect(rgba, w, ox + 8, oy + 16 + pulse, 4, 3, 90, 110, 70);
        fillRect(rgba, w, ox + 20, oy + 16 + pulse, 4, 3, 90, 110, 70);
      }
      if (row === 3) {
        fillRect(rgba, w, ox + 8, oy + 4 + pulse, 16, 2, 240, 200, 60, 220);
      }
    }
  }
  return encodePng(w, h, rgba);
}

function makeSlash() {
  const w = 48;
  const h = 48;
  const rgba = Buffer.alloc(w * h * 4);
  const cx = 24;
  const cy = 24;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const ang = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);
      if (dist > 8 && dist < 22 && Math.abs(ang) < 1.05) {
        const a = Math.floor(220 - dist * 6);
        px(rgba, w, x, y, 230, 210, 150, Math.max(40, a));
      }
    }
  }
  return encodePng(w, h, rgba);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'tile-floor.png'), makeTile('floor'));
fs.writeFileSync(path.join(outDir, 'tile-wall.png'), makeTile('wall'));
fs.writeFileSync(path.join(outDir, 'tile-obstacle.png'), makeTile('obstacle'));
fs.writeFileSync(path.join(outDir, 'tile-void.png'), makeTile('void'));
fs.writeFileSync(path.join(outDir, 'player.png'), makeCharacterSheet());
fs.writeFileSync(path.join(outDir, 'enemy.png'), makeEnemySheet());
fs.writeFileSync(path.join(outDir, 'slash.png'), makeSlash());
fs.writeFileSync(
  path.join(outDir, 'ATTRIBUTION.txt'),
  `Ashen Reliquary placeholder assets
Generated procedurally by scripts/generate-placeholders.mjs
Original pixel placeholders — free to replace with licensed art.
Not derived from concept illustrations or third-party sprite sheets.

SPRITE SPEC (replaceable)
player.png  32x32 cells, 8 cols (e,se,s,sw,w,nw,n,ne) x 6 rows
            rows 0-1 idle, 2-3 run, 4-5 attack (windup, hit)
enemy.png   32x32 cells, 4 cols x 5 rows
            row0 idle, 1 chase, 2 hurt, 3 windup, 4 attack
`,
);

console.log('Placeholder assets written to public/assets');
