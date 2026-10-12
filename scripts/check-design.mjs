#!/usr/bin/env node
// Checks the design package in design/guides/ so a board never drifts from its assets or ships placeholder copy.
// Run: node scripts/check-design.mjs

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const root = resolve('design/guides');
const canvasDir = join(root, 'canvas');
const errors = [];

const canvasPath = join(canvasDir, 'canvas.json');
if (!existsSync(canvasPath)) {
  console.error(`missing ${canvasPath}`);
  process.exit(1);
}
const canvas = JSON.parse(readFileSync(canvasPath, 'utf8'));
const boards = Object.keys(canvas.boards ?? {});
if (boards.length === 0) errors.push('canvas.json lists no boards');

for (const board of boards) {
  const file = join(canvasDir, board);
  if (!existsSync(file)) {
    errors.push(`canvas.json names ${board} but the file is missing`);
    continue;
  }
  const html = readFileSync(file, 'utf8');

  // Every src/href that points at a local asset must exist.
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|#|data:)/.test(ref)) continue;
    if (ref.includes('{{')) continue; // template slot, resolved by the board's renderVals()
    if (ref.endsWith('support.js')) continue; // canvas runtime, not shipped
    const target = resolve(dirname(file), ref.split('?')[0]);
    if (!existsSync(target)) errors.push(`${board}: ${ref} does not exist`);
  }
  for (const m of html.matchAll(/url\((["']?)([^)"']+)\1\)/g)) {
    const ref = m[2];
    if (/^(https?:|data:)/.test(ref)) continue;
    const target = resolve(dirname(file), ref);
    if (!existsSync(target)) errors.push(`${board}: css url ${ref} does not exist`);
  }

  // Assets named inside the board's renderVals() data (img: '../assets/...') are not attributes; check them too.
  for (const m of html.matchAll(/\.\.\/assets\/[^"'\s)]+/g)) {
    const target = resolve(dirname(file), m[0]);
    if (!existsSync(target)) errors.push(`${board}: ${m[0]} does not exist`);
  }

  // Leftover canvas blobs mean the asset was never copied into the repo.
  if (html.includes('/_blob/')) errors.push(`${board}: still references a /_blob/ asset`);

  // Rules that must hold on every board.
  if (/fly[- ]fish/i.test(html) && !/no fly fishing|not fly|don't fly/i.test(html)) {
    errors.push(`${board}: mentions fly fishing as an offer`);
  }
  if (/guid(e|ing)[^.]{0,40}on the Buffalo/i.test(html)) errors.push(`${board}: implies guiding on the Buffalo`);
  for (const m of html.matchAll(/pocketfishinguide\.com\/(?:water|species)\/[^"'\s]+/g)) {
    if (!m[0].includes('utm_source=twt')) errors.push(`${board}: PFG link without UTM: ${m[0]}`);
  }
}

// Boards may hold bracketed placeholders; the list here is what is allowed to stay bracketed.
const allowedPlaceholders = new Set(['Guides.dc.html', 'Trip.dc.html']);
for (const board of boards) {
  if (allowedPlaceholders.has(board)) continue;
  const html = readFileSync(join(canvasDir, board), 'utf8');
  const hits = [...html.matchAll(/\[(?:Photo|Second|Third|A guide|Status|\$—|date|—)[^\]]*\]/g)];
  if (hits.length) errors.push(`${board}: ${hits.length} bracketed placeholder(s) e.g. ${hits[0][0]}`);
}

// Every image in assets/ should be used by at least one board.
const assetsDir = join(root, 'assets');
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const allHtml = boards.map((b) => readFileSync(join(canvasDir, b), 'utf8')).join('\n');
for (const asset of walk(assetsDir)) {
  const name = asset.slice(root.length + 1); // e.g. assets/species/walleye.png; boards reference ../assets/...
  if (!allHtml.includes(name)) errors.push(`asset ${name} is not referenced by any board`);
}

if (errors.length) {
  console.error(`check-design: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check-design: ${boards.length} boards, assets resolved, rules hold`);
