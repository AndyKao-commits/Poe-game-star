import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Static import-graph guard for the active Rebirth entry path only.
 * Never reads or follows legacy source files; fails before crossing that boundary.
 * This is not a replacement for npm/typecheck/unit/browser/device QA.
 */
const root = resolve(process.env.REBIRTH_PROJECT_ROOT || fileURLToPath(new URL('..', import.meta.url)));
const sourceRoot = resolve(root, 'src');
const rebirthRoot = resolve(sourceRoot, 'rebirth');
const entry = resolve(sourceRoot, 'main.ts');
const visited = new Set();
const errors = [];

function within(path, parent) {
  return path === parent || path.startsWith(parent + sep);
}

function visit(file) {
  if (visited.has(file)) return;
  if (!within(file, rebirthRoot) && file !== entry) {
    errors.push('Disallowed runtime import outside Rebirth: ' + relative(root, file));
    return;
  }
  if (!existsSync(file)) {
    errors.push('Missing Rebirth runtime file: ' + relative(root, file));
    return;
  }
  visited.add(file);
  const source = readFileSync(file, 'utf8');
  const imports = /(?:^|\n)\s*(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(imports)) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) {
      if (specifier !== 'phaser') errors.push('Unexpected external runtime import: ' + specifier);
      continue;
    }
    const base = resolve(dirname(file), specifier);
    const target = ['.ts', '.tsx', '.js', '/index.ts'].map((suffix) => base + suffix).find(existsSync);
    if (!target) {
      errors.push('Unresolved local import from ' + relative(root, file) + ': ' + specifier);
      continue;
    }
    visit(target);
  }
  if (/\bimport\s*\(/.test(source) || /\brequire\s*\(/.test(source)) {
    errors.push('Dynamic runtime import requires manual review: ' + relative(root, file));
  }
  if (/['"`]\s*\/(?:assets|legacy)\//.test(source)) {
    errors.push('Forbidden legacy asset path: ' + relative(root, file));
  }
}

visit(entry);
const config = resolve(rebirthRoot, 'config.ts');
if (visited.has(config)) {
  const source = readFileSync(config, 'utf8');
  if (!/scene:\s*\[\s*RebirthEntryScene\s*\]/.test(source)) {
    errors.push('Gameplay gate changed: manual art and QA approval required');
  }
}
if (errors.length) {
  for (const error of errors) console.error('FAIL:', error);
  process.exitCode = 1;
} else {
  console.log('PASS: Rebirth entry import graph isolated (' + visited.size + ' files); non-playable gate retained.');
}
