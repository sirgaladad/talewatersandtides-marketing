// SEO and link checks for the pages listed in sitemap.xml (plus any extra
// paths passed as arguments). No dependencies; runs in CI next to HTMLHint.
//
//   node scripts/check-site.mjs            # pages from sitemap.xml
//   node scripts/check-site.mjs readiness/ # plus extra pages
//
// Per page: <title> (<= 70 chars), meta description (<= 160), canonical that
// matches the sitemap URL, exactly one <h1>, parseable JSON-LD, alt on every
// <img>, and every internal href/src resolving to a file in the repo
// (including #fragments that must exist on the target page).

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://talewatersandtides.com';

const fileFor = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  const p = join(root, clean);
  if (existsSync(p) && statSync(p).isDirectory()) return join(p, 'index.html');
  return p;
};

const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, ''));
for (const extra of process.argv.slice(2)) pages.push('/' + extra.replace(/^\//, ''));

const idsCache = new Map();
const idsOf = (file) => {
  if (!idsCache.has(file)) {
    const html = readFileSync(file, 'utf8');
    idsCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsCache.get(file);
};

let failures = 0;
const fail = (page, msg) => {
  failures++;
  console.error(`✗ ${page}: ${msg}`);
};

// Only check new-style pages strictly; legacy pages in the sitemap get link checks only.
const STRICT = new Set(['/', '/corey/', '/lab/', '/privacy/', '/readiness/']);

for (const page of pages) {
  const file = fileFor(page);
  if (!existsSync(file)) {
    fail(page, `sitemap lists a page with no file (${file.replace(root, '')})`);
    continue;
  }
  const html = readFileSync(file, 'utf8');

  if (STRICT.has(page)) {
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    if (!title) fail(page, 'missing <title>');
    else if (title.replace(/&amp;/g, '&').length > 70) fail(page, `title is ${title.length} chars (max 70)`);

    const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
    if (!desc) fail(page, 'missing meta description');
    else if (desc.replace(/&amp;/g, '&').length > 160) fail(page, `description is ${desc.length} chars (max 160)`);

    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (canonical !== ORIGIN + page) fail(page, `canonical ${canonical} != ${ORIGIN + page}`);

    const h1s = (html.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) fail(page, `${h1s} <h1> elements (want 1)`);

    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        JSON.parse(m[1]);
      } catch (e) {
        fail(page, `JSON-LD does not parse: ${e.message}`);
      }
    }
  }

  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) fail(page, `<img> without alt: ${m[0].slice(0, 80)}`);
  }

  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(ref) || ref.startsWith('//') || /['+\s]/.test(ref)) continue;
    const [pathPart, frag] = ref.split('#');
    let target;
    if (!pathPart) target = file;
    else if (pathPart.startsWith('/')) target = fileFor(pathPart);
    else target = fileFor(join(dirname(page.endsWith('/') ? page + 'x' : page), pathPart));
    if (!existsSync(target)) {
      fail(page, `broken link ${ref}`);
      continue;
    }
    if (frag && target.endsWith('.html') && !idsOf(target).has(frag)) fail(page, `missing anchor ${ref}`);
  }
}

if (failures) {
  console.error(`\n${failures} problem(s) across ${pages.length} pages.`);
  process.exit(1);
}
console.log(`✓ ${pages.length} pages: titles, descriptions, canonicals, h1s, JSON-LD, alt text and internal links OK.`);
