// SEO checks for the pages listed in sitemap.xml, plus link and alt-text checks for
// every HTML page in the repo (and any extra paths passed as arguments). No dependencies; runs in CI next to HTMLHint.
//
//   node scripts/check-site.mjs            # pages from sitemap.xml
//   node scripts/check-site.mjs readiness/ # plus extra pages
//
// Per page: <title> (<= 70 chars), meta description (<= 160), canonical that
// matches the sitemap URL, exactly one <h1>, parseable JSON-LD, alt on every
// <img>, and every internal href/src resolving to a file in the repo
// (including #fragments that must exist on the target page).
//
// Site-wide interlocks (added after the October 2026 audit, see
// docs/AUDIT-RESPONSE-2026-10.md):
//   - every indexable page carries the Google Tag Manager snippet and noscript
//     iframe for GTM_ID, and no page still loads gtag.js or passes a GTM- ID to
//     gtag('config'); noindex and redirect pages are exempt from the snippet
//   - every indexable page is listed in sitemap.xml
//   - Organization JSON-LD sameAs only lists company identities (ORG_SAMEAS);
//     personal profiles belong on the Person entity in /corey/
//   - an UPCOMING or LIVE NOW badge must carry data-until="YYYY-MM-DD" in the future

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://talewatersandtides.com';
// Google Tag Manager container. The GA4 property lives inside the container; see README "Analytics".
const GTM_ID = 'GTM-TZVTR5TG';
// Company identities allowed on the Organization entity. Personal profiles (LinkedIn /in/,
// TikTok, GitHub user) belong on the Person entity in /corey/ only.
const ORG_SAMEAS = new Set(['https://www.facebook.com/talewatersandtides']);
const TODAY = new Date().toISOString().slice(0, 10);

const fileFor = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  const p = join(root, clean);
  if (existsSync(p) && statSync(p).isDirectory()) return join(p, 'index.html');
  return p;
};

const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, ''));
const sitemapPages = new Set(pages);
for (const extra of process.argv.slice(2)) pages.push('/' + extra.replace(/^\//, ''));

// Every other HTML page in the repo gets the link and alt-text checks too, so a page
// that isn't in the sitemap (an event page, a project page) can't keep dead links.
const walk = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((d) => {
    if (d.name.startsWith('.') || d.name === 'node_modules' || d.name === 'supabase') return [];
    const rel = dir + d.name;
    return d.isDirectory() ? walk(rel + '/') : d.name.endsWith('.html') ? ['/' + rel] : [];
  });
for (const f of walk('')) {
  const page = f.endsWith('/index.html') ? f.slice(0, -'index.html'.length) : f;
  if (!pages.includes(page)) pages.push(page);
}

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
const STRICT = new Set(['/', '/corey/', '/lab/', '/privacy/', '/readiness/', '/ai-implementation/', '/fractional-ai-martech/', '/ai-workshops/', '/work/pocket-fishing-guide/']);

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

  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  const redirect = /<meta http-equiv="refresh"/.test(html);
  const indexable = !noindex && !redirect;

  // Analytics: one install path, on every indexable page, with the right container.
  if (/googletagmanager\.com\/gtag\/js/.test(html)) fail(page, 'loads gtag.js; the site uses the GTM container snippet');
  const badConfig = html.match(/gtag\(\s*["']config["']\s*,\s*["'](GTM-[^"']+)["']/);
  if (badConfig) fail(page, `gtag('config') with container ID ${badConfig[1]} (no-op)`);
  const hasGtm = html.includes('googletagmanager.com/gtm.js?id=') && html.includes(`'${GTM_ID}'`);
  const hasNoscript = html.includes(`googletagmanager.com/ns.html?id=${GTM_ID}`);
  if (indexable) {
    if (!hasGtm) fail(page, `indexable page without the GTM snippet (${GTM_ID})`);
    if (!hasNoscript) fail(page, 'indexable page without the GTM noscript iframe');
    if (!sitemapPages.has(page)) fail(page, 'indexable page missing from sitemap.xml (add it, or mark it noindex)');
  }
  for (const m of html.matchAll(/googletagmanager\.com\/(?:gtm|ns)\.(?:js|html)\?id=(GTM-[A-Z0-9]+)/g)) {
    if (m[1] !== GTM_ID) fail(page, `unexpected container ${m[1]} (want ${GTM_ID})`);
  }

  // Organization sameAs allowlist (any page with Organization JSON-LD carrying sameAs).
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data;
    try { data = JSON.parse(m[1]); } catch { continue; }
    const nodes = [];
    const walk = (n) => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (n && typeof n === 'object') { nodes.push(n); Object.values(n).forEach(walk); }
    };
    walk(data);
    for (const n of nodes) {
      const types = [].concat(n['@type'] || []);
      if (!types.includes('Organization') && !types.includes('ProfessionalService')) continue;
      if (n['@id'] && n['@id'] !== ORIGIN + '/#org') continue; // employers etc. referenced from the Person entity
      for (const u of [].concat(n.sameAs || [])) {
        if (!ORG_SAMEAS.has(u)) fail(page, `Organization sameAs ${u} is not an approved company identity (personal profiles go on the Person entity)`);
      }
    }
  }

  // Booking links carry the event date; on an indexable page, one for a past date is a stale CTA
  // (noindex event-day pages keep their history).
  if (indexable) {
    for (const m of html.matchAll(/ecom\.roller\.app[^"'\s]*[?&]date=(\d{4}-\d{2}-\d{2})/g)) {
      if (m[1] < TODAY) fail(page, `booking link for a past date (${m[1]})`);
    }
  }

  // Stale event badges: UPCOMING / LIVE NOW must be date-gated with data-until.
  for (const m of html.matchAll(/<([a-z]+)\b([^>]*)>\s*(UPCOMING|LIVE NOW)\s*<\/\1>/g)) {
    const until = m[2].match(/data-until="(\d{4}-\d{2}-\d{2})"/)?.[1];
    if (!until) fail(page, `"${m[3]}" badge without data-until="YYYY-MM-DD"`);
    else if (until < TODAY) fail(page, `"${m[3]}" badge expired on ${until}`);
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
console.log(`✓ ${pages.length} pages: titles, descriptions, canonicals, h1s, JSON-LD, alt text, internal links, analytics, sitemap and sameAs OK.`);
