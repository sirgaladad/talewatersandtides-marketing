// Renders the news page, its RSS feed and the "What shipped" block on /lab/ from
// data/news.json (issues, metrics, asks) and data/pfg-whats-new.json (a snapshot of
// pocket-fishing-guide/data/whats-new.json). No dependencies; runs in CI next to
// scripts/check-site.mjs.
//
//   node scripts/build-news.mjs           # write news/index.html, news/feed.xml, the lab block
//   node scripts/build-news.mjs --check   # exit 1 when any rendered file is stale or the data breaks a rule
//
// Rules the data must pass (the same ones the app's copy lint holds): no exclamation
// marks, no stock phrases, no bracketed placeholder copy, every entry's area known,
// every issue dated and newest first. Runbook: docs/NEWS-AND-UPDATES.md.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://talewatersandtides.com';
const CHECK = process.argv.includes('--check');

const news = JSON.parse(readFileSync(join(root, 'data/news.json'), 'utf8'));
const pfg = JSON.parse(readFileSync(join(root, 'data/pfg-whats-new.json'), 'utf8'));

// ---------- rules ----------
const STOCK = [
  /\bnot just another\b/i, /\bwhether you(?:'|’)re\b/i, /\bat your fingertips\b/i, /\bseamless(?:ly)?\b/i,
  /\beffortless(?:ly)?\b/i, /\belevate\b/i, /\bempower(?:s|ing|ed)?\b/i, /\bleverag(?:e|es|ing)\b/i,
  /\bunlock your\b/i, /\bunleash\b/i, /\bsupercharge\b/i, /\bstreamline\b/i, /\bgame[- ]chang(?:er|ing)\b/i,
  /\bcutting[- ]edge\b/i, /\bworld[- ]class\b/i, /\brobust\b/i, /\bdive (?:in|into)\b/i, /\bdelve\b/i,
  /\bjourney\b/i, /\blook no further\b/i, /\bin today(?:'|’)s\b/i, /\bsay goodbye to\b/i, /\bnext level\b/i,
];
const problems = [];
const prose = (where, s) => {
  if (typeof s !== 'string') return;
  if (/!/.test(s)) problems.push(`${where}: exclamation mark`);
  if (/\[[^\]]+\]/.test(s)) problems.push(`${where}: bracketed placeholder copy`);
  for (const re of STOCK) if (re.test(s)) problems.push(`${where}: stock phrase ${re}`);
};
const walkProse = (where, v) => {
  if (typeof v === 'string') prose(where, v);
  else if (Array.isArray(v)) v.forEach((x, i) => walkProse(`${where}[${i}]`, x));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!/^(href|path|url|source|key|id|date|week|commit|repo|utm|\$comment)$/.test(k)) walkProse(`${where}.${k}`, x);
};
walkProse('news', { issues: news.issues, metrics: news.metrics, asks: news.asks, site: { title: news.site.title, description: news.site.description } });
if (!Array.isArray(news.issues) || !news.issues.length) problems.push('news.issues is empty');
news.issues.forEach((it, i) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date || '')) problems.push(`issue ${i}: date must be YYYY-MM-DD`);
  if (i > 0 && it.date > news.issues[i - 1].date) problems.push(`issue ${it.id}: issues must be newest first`);
  if (!it.title || it.title.length > 90) problems.push(`issue ${it.id}: title missing or over 90 characters`);
});
const areaById = new Map((pfg.areas || []).map((a) => [a.id, a]));
for (const e of pfg.entries || []) if (!areaById.has(e.area)) problems.push(`pfg entry ${e.id}: unknown area ${e.area}`);
for (const t of news.metrics.tiles) {
  if (typeof t.show !== 'boolean') problems.push(`metric ${t.key}: show must be true or false`);
  // A number never renders without its value, its label and where it came from (README: every
  // number carries its source and read date); a hint is optional.
  for (const k of ['key', 'value', 'label', 'source']) if (typeof t[k] !== 'string' || !t[k].trim()) problems.push(`metric ${t.key ?? '?'}: ${k} must be a non-empty string`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(news.metrics.as_of || '')) problems.push('metrics.as_of must be YYYY-MM-DD');
for (const b of news.metrics.breakdowns || []) for (const i of b.items || []) if (typeof i.name !== 'string' || typeof i.value !== 'number') problems.push(`breakdown ${b.title}: every item needs a name and a numeric value`);
if (problems.length) {
  for (const p of problems) console.error(`✗ ${p}`);
  process.exit(1);
}

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (iso, opts = { month: 'long', day: 'numeric', year: 'numeric' }) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
const fmtShort = (iso) => fmtDate(iso, { month: 'short', day: 'numeric' });
const pfgHref = (path) => {
  if (!path) return null;
  const [base, hash] = path.split('#');
  const sep = base.includes('?') ? '&' : '?';
  return `${news.site.pfg_url}${base}${sep}${news.site.utm}${hash ? `#${hash}` : ''}`;
};
// The hostname of an absolute URL, or "" for a relative path; hosts are compared whole, never by substring.
const hostOf = (href) => { try { return new URL(href).hostname; } catch { return ''; } };
const PFG_HOSTS = new Set(['pocketfishinguide.com', 'www.pocketfishinguide.com']);
const isPfg = (href) => PFG_HOSTS.has(hostOf(href));
const isOurs = (href) => hostOf(href) === '' || hostOf(href) === 'talewatersandtides.com';
const extHref = (href) => (isPfg(href) && !/[?&]utm_/.test(href) ? `${href}${href.includes('?') ? '&' : '?'}${news.site.utm}` : href);
const AUD = { angler: 'Anglers', guide: 'Guides', all: 'Everyone' };
const num = (n) => Number(n).toLocaleString('en-US');

const byDay = (entries) => {
  const out = [];
  for (const e of entries) {
    const last = out[out.length - 1];
    if (last && last.date === e.date) last.entries.push(e);
    else out.push({ date: e.date, entries: [e] });
  }
  return out;
};
const foldWords = (entries) => {
  const counts = new Map();
  for (const e of entries) counts.set(e.area, (counts.get(e.area) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const names = sorted.slice(0, 2).map(([id]) => areaById.get(id)?.label ?? id);
  const more = sorted.length - names.length;
  return `${entries.length} ${entries.length === 1 ? 'change' : 'changes'}${names.length ? ` · ${names.join(', ')}${more > 0 ? ` and ${more} more` : ''}` : ''}`;
};

function changeCard(e, { image = true, tag = 'li' } = {}) {
  const area = areaById.get(e.area);
  const href = pfgHref(e.link);
  const img = image && e.image && e.image.src && e.image.width && e.image.height
    ? `<img src="${esc(news.site.pfg_url + e.image.src)}" alt="${esc(e.image.alt)}" width="${e.image.width}" height="${e.image.height}" loading="lazy" decoding="async">`
    : '';
  return `<${tag} class="card change" id="${esc(e.id)}">
  <div class="change-top"><span class="chip-area">${esc(area?.label ?? e.area)}</span><span class="chip-who">${esc(AUD[e.audience] ?? e.audience)} · ${esc(fmtShort(e.date))}</span></div>
  <h4>${esc(e.title)}</h4>
  <p>${esc(e.body)}</p>${img}
  ${href ? `<a class="change-link" href="${esc(href)}" data-ga="news_change_${esc(e.area)}">Open in the app →</a>` : ''}
</${tag}>`;
}

function releaseBlock(day, { cap = Infinity } = {}) {
  // An open day shows its first `cap` cards; the rest of that day folds behind one line, so a
  // 21-change day never becomes a screen-long scroll on a phone (the app folds the same way).
  const shown = day.entries.slice(0, cap);
  const rest = day.entries.slice(cap);
  return `<div class="release" id="release-${day.date}">
  <div class="release-h"><h3>${esc(fmtDate(day.date))}</h3><p class="label">${esc(foldWords(day.entries))}</p></div>
  <ul class="changes">
${shown.map((e) => changeCard(e)).join('\n')}
  </ul>${rest.length ? `
  <details class="fold fold-day"><summary><span>${rest.length} more from ${esc(fmtDate(day.date))}</span><span class="label">${esc(foldWords(rest))}</span></summary><ul class="changes">
${rest.map((e) => changeCard(e)).join('\n')}
  </ul></details>` : ''}
</div>`;
}

// ---------- shared chrome ----------
const nav = (current) => `<nav class="nav" aria-label="Main">
  <div class="wrap nav-in">
    <a class="brand" href="/" data-ga="nav_brand"><img src="/assets/TalewatersandTides_Logo_White_Horizontal.png" alt="Tale Waters and Tides" width="80" height="52"></a>
    <div class="nav-links">
      <a href="/#how" data-ga="nav_how">How we work</a>
      <a href="/#proof" data-ga="nav_work">Work</a>
      <a href="/#teach" data-ga="nav_teach">Teach</a>
      <a href="/lab/" data-ga="nav_lab">Lab</a>
      <a href="/news/"${current === 'news' ? ' aria-current="page"' : ''} data-ga="nav_news">News</a>
      <a href="/corey/" data-ga="nav_corey">About Corey</a>
    </div>
    <div class="nav-r">
      <a class="btn btn-sm" href="https://calendar.app.google/MmHqpVo9QuN93jYt8" target="_blank" rel="noopener" data-ga="nav_book">Book a call</a>
      <button class="menu-btn" type="button" data-menu-btn aria-expanded="false" aria-controls="menu-panel" aria-label="Menu"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </div>
  <div class="menu-panel" id="menu-panel" data-open="false">
    <a href="/#how">How we work</a><a href="/#proof">Work</a><a href="/#teach">Teach</a><a href="/lab/">Lab</a><a href="/news/">News</a><a href="/guiding/">Guided fishing</a><a href="/corey/">About Corey</a><a href="/readiness/">Readiness check</a>
  </div>
</nav>`;

// The footer is the one every new-style page carries (lab/index.html is the reference copy).
const footer = readFileSync(join(root, 'lab/index.html'), 'utf8').match(/<footer class="footer"[\s\S]*?<\/footer>/)[0];

// ---------- the page ----------
const issue = news.issues[0];
const earlier = news.issues.slice(1);
const days = byDay(pfg.entries);
const open = days.slice(0, news.site.whats_new_open_days);
const folded = days.slice(news.site.whats_new_open_days);
const m = news.metrics;
const tiles = m.tiles.filter((t) => t.show);

function barChart(series) {
  const W = 640, H = 220, padL = 44, padR = 8, padT = 12, padB = 36;
  const pts = series.points;
  const max = Math.max(...pts.map((p) => p.value), 1);
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const bw = innerW / pts.length;
  const y = (v) => padT + innerH - (v / top) * innerH;
  const grid = [0, 0.5, 1].map((f) => {
    const v = Math.round(top * f);
    return `<line x1="${padL}" x2="${W - padR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="rgba(245,240,232,0.12)"/><text x="${padL - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="rgba(245,240,232,0.6)" font-family="Spline Sans Mono, ui-monospace, monospace">${num(v)}</text>`;
  }).join('');
  const bars = pts.map((p, i) => {
    const x = padL + i * bw + bw * 0.18, w = bw * 0.64, h = Math.max(1.5, innerH * (p.value / top));
    const label = `${fmtShort(p.week)}: ${num(p.value)} visitors${p.partial ? ', week in progress' : ''}`;
    return `<rect x="${x.toFixed(1)}" y="${(padT + innerH - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="#d4a843"${p.partial ? ' fill-opacity="0.45"' : ''}><title>${esc(label)}</title></rect>${i % 2 === 0 || i === pts.length - 1 ? `<text x="${(x + w / 2).toFixed(1)}" y="${H - 14}" text-anchor="middle" font-size="11" fill="rgba(245,240,232,0.68)" font-family="Spline Sans Mono, ui-monospace, monospace">${esc(fmtShort(p.week))}</text>` : ''}`;
  }).join('');
  const rows = pts.map((p) => `${fmtShort(p.week)} ${num(p.value)}${p.partial ? ' (in progress)' : ''}`).join('; ');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.title)}. ${esc(rows)}.">${grid}${bars}</svg>`;
}

function barList(b) {
  const max = Math.max(...b.items.map((i) => i.value), 1);
  return `<div class="bars"><h3>${esc(b.title)}</h3><p class="chart-sub">${esc(b.sub)}</p><ul class="bar-list">
${b.items.map((i) => `  <li class="bar-row"><span>${esc(i.name)}</span><span class="mono">${num(i.value)}</span><span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${Math.max(2, Math.round((i.value / max) * 100))}%"></span></span></li>`).join('\n')}
</ul></div>`;
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  '@id': `${ORIGIN}/news/#blog`,
  name: `Tale Waters and Tides · ${news.site.title}`,
  url: `${ORIGIN}/news/`,
  description: news.site.description,
  publisher: { '@type': 'Organization', '@id': `${ORIGIN}/#org`, name: 'Tale Waters and Tides, LLC' },
  blogPost: news.issues.map((it) => ({
    '@type': 'BlogPosting',
    '@id': `${ORIGIN}/news/#issue-${it.id}`,
    headline: it.title,
    datePublished: it.date,
    author: { '@type': 'Person', name: it.byline, url: `${ORIGIN}/corey/` },
    description: it.summary,
    url: `${ORIGIN}/news/#issue-${it.id}`,
  })),
};

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(news.site.title)} | Tale Waters and Tides</title>
<meta name="description" content="${esc(news.site.description)}">
<link rel="canonical" href="${ORIGIN}/news/">
<link rel="alternate" type="application/rss+xml" title="Tale Waters and Tides · News and updates" href="/news/feed.xml">
<link rel="icon" type="image/png" href="/assets/twt_favicon.png">
<meta name="theme-color" content="#0d1b2a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Tale Waters and Tides">
<meta property="og:title" content="${esc(issue.title)} | Tale Waters and Tides">
<meta property="og:description" content="${esc(issue.summary)}">
<meta property="og:url" content="${ORIGIN}/news/">
<meta property="og:image" content="${ORIGIN}/assets/TWT_Logo_horizontal_blue.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Spline+Sans+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/news.css">
<script async src="https://www.googletagmanager.com/gtag/js?id=GTM-TZVTR5TG"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','GTM-TZVTR5TG');</script>
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

${nav('news')}

<main id="main">

<header class="wrap section news-hero" data-ga-section="news_hero" id="issue-${esc(issue.id)}">
  <p class="eyebrow">${esc(news.site.title)} · ${esc(fmtDate(issue.date))}</p>
  <h1 class="h1">${esc(issue.title)}</h1>
  <p class="lede">${esc(issue.summary)}</p>
  <p class="news-meta">By ${esc(issue.byline)} · Changes through ${esc(fmtDate(issue.shipped_through))} · <a href="/news/feed.xml">RSS</a></p>
  <div class="btn-row"><a class="btn" href="${esc(pfgHref('/whats-new'))}" data-ga="news_open_whats_new">What's new in the app</a><a class="btn btn-ghost" href="#numbers" data-ga="news_to_numbers">The numbers</a></div>
</header>

<section class="band" data-ga-section="news_note">
  <div class="wrap section note">
    <div class="note-body">
      <p class="eyebrow">${esc(issue.note.eyebrow)}</p>
${issue.note.lines.map((l) => `      <p>${esc(l)}</p>`).join('\n')}
      ${issue.note.source ? `<p class="note-source">${esc(issue.note.source)}</p>` : ''}
    </div>
    <aside class="ask" aria-label="${esc(issue.ask.title)}">
      <p class="eyebrow">${esc(issue.ask.title)}</p>
${issue.ask.lines.map((l) => `      <p>${esc(l)}</p>`).join('\n')}
      ${issue.ask.cta ? `<a class="btn" href="${esc(pfgHref(issue.ask.cta.path))}" data-ga="news_ask_cta">${esc(issue.ask.cta.label)} →</a>` : ''}
    </aside>
  </div>
</section>

<section class="wrap section" data-ga-section="news_shipped" id="shipped">
  <p class="eyebrow">What shipped in Pocket Fishing Guide</p>
  <h2 class="h2 narrow">One entry per change a person can see or use.</h2>
  <p class="lab-p" style="margin-top:18px">The same notes anglers read at <a class="link-u" href="${esc(pfgHref('/whats-new'))}">pocketfishinguide.com/whats-new</a>, where feedback on any change goes straight back to the build it came from. Newest day first; earlier days fold.</p>
${open.map((d) => releaseBlock(d, { cap: news.site.open_day_cards })).join('\n')}
${folded.map((day) => `<details class="fold" id="fold-${day.date}">
  <summary><span>${esc(fmtDate(day.date))}</span><span class="label">${esc(foldWords(day.entries))}</span></summary>
${releaseBlock(day)}
</details>`).join('\n')}
</section>

<section class="band" data-ga-section="news_numbers" id="numbers">
  <div class="wrap section">
    <p class="eyebrow">By the numbers · read ${esc(fmtDate(m.as_of))}</p>
    <h2 class="h2 narrow" style="margin-bottom:36px">The numbers we watch, with their sources.</h2>
    <ul class="tiles">
${tiles.map((t) => `      <li class="tile"><div class="tile-v">${esc(t.value)}</div><p class="tile-k">${esc(t.label)}</p>${t.hint ? `<p class="tile-h">${esc(t.hint)}</p>` : ''}<p class="tile-h mono">${esc(t.source)}</p></li>`).join('\n')}
    </ul>
    <div class="numbers">
      <div class="chart">
        <h3>${esc(m.series.title)}</h3>
        <p class="chart-sub">${esc(m.series.sub)}</p>
        ${barChart(m.series)}
        <p class="chart-src">${esc(m.series.source)}</p>
      </div>
      <div>
${m.breakdowns.map(barList).join('\n')}
      </div>
    </div>
    <ul class="observations">
${issue.observations.map((o) => `      <li>${esc(o)}</li>`).join('\n')}
    </ul>
    <p class="metrics-note">${esc(m.note)}</p>
  </div>
</section>

<section class="wrap section" data-ga-section="news_twt" id="lab">
  <p class="eyebrow">From the lab and the practice</p>
  <h2 class="h2 narrow" style="margin-bottom:36px">Tale Waters and Tides this week.</h2>
  <div class="grid cols-auto-280">
${issue.twt_updates.map((u) => `    <div class="card change"><h4>${esc(u.title)}</h4><p>${esc(u.body)}</p><a class="change-link" href="${esc(extHref(u.href))}" data-ga="news_twt_${esc(u.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'))}"${isOurs(u.href) ? '' : ' rel="noopener"'}>${esc(u.label)} →</a></div>`).join('\n')}
  </div>
</section>

<section class="light" data-ga-section="news_asks" id="asks">
  <div class="wrap section">
    <p class="eyebrow">${esc(news.asks.title)}</p>
    <h2 class="h2 narrow" style="margin-bottom:36px">Small things that move the numbers above.</h2>
    <ul class="ask-list">
${news.asks.items.map((a) => `      <li class="card-light ask-item"><p class="label">${esc(a.who)}</p><p>${esc(a.text)}</p><a class="btn btn-dark btn-sm" href="${esc(extHref(a.href))}" data-ga="news_ask_${esc(a.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'))}"${isOurs(a.href) ? '' : ' rel="noopener"'}>${esc(a.label)} →</a></li>`).join('\n')}
    </ul>
  </div>
</section>

${earlier.length ? `<section class="wrap section" data-ga-section="news_earlier" id="earlier">
  <p class="eyebrow">Earlier issues</p>
  <h2 class="h2 narrow" style="margin-bottom:28px">The record.</h2>
  <ul class="issues">
${earlier.map((it) => `    <li id="issue-${esc(it.id)}"><span class="mono">${esc(fmtDate(it.date))}</span><span class="issue-title">${esc(it.title)}</span><p>${esc(it.summary)}</p></li>`).join('\n')}
  </ul>
</section>` : ''}

</main>

${footer}

<script src="/assets/js/site.js" defer></script>
</body>
</html>
`;

// ---------- RSS ----------
const rfc822 = (iso) => new Date(iso + 'T12:00:00Z').toUTCString();
const feedItems = [
  ...news.issues.map((it) => ({
    title: it.title,
    link: `${ORIGIN}/news/#issue-${it.id}`,
    date: it.date,
    desc: `${it.summary} ${it.note.lines.join(' ')}`,
  })),
  ...days.map((d) => ({
    title: `Pocket Fishing Guide · ${fmtDate(d.date)} · ${foldWords(d.entries)}`,
    link: `${ORIGIN}/news/#release-${d.date}`,
    date: d.date,
    desc: d.entries.map((e) => `${e.title}: ${e.body}`).join(' '),
  })),
].sort((a, b) => b.date.localeCompare(a.date)).slice(0, news.site.feed_items);
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Tale Waters and Tides · ${esc(news.site.title)}</title>
<link>${ORIGIN}/news/</link>
<atom:link href="${ORIGIN}/news/feed.xml" rel="self" type="application/rss+xml"/>
<description>${esc(news.site.description)}</description>
<language>en-us</language>
<lastBuildDate>${rfc822(issue.date)}</lastBuildDate>
${feedItems.map((i) => `<item>
<title>${esc(i.title)}</title>
<link>${esc(i.link)}</link>
<guid isPermaLink="true">${esc(i.link)}</guid>
<pubDate>${rfc822(i.date)}</pubDate>
<description>${esc(i.desc)}</description>
</item>`).join('\n')}
</channel>
</rss>
`;

// ---------- the lab block ----------
const latest = pfg.entries.slice(0, news.site.lab_block_entries);
const labBlock = `<!-- lab-news:start (written by scripts/build-news.mjs from data/pfg-whats-new.json; do not edit by hand) -->
<section class="wrap section lab-news" data-ga-section="lab_news" id="shipped">
  <p class="eyebrow">What shipped · through ${esc(fmtDate(pfg.entries[0].date))}</p>
  <h2 class="h2 narrow">The newest changes in Pocket Fishing Guide.</h2>
  <p class="lab-p" style="margin-top:18px">${esc(pfg.entries.length)} changes since ${esc(fmtDate(pfg.entries[pfg.entries.length - 1].date))}, each one a thing an angler or a guide can see or use. The six newest are here; the rest, the Friday note and the numbers are on the news page.</p>
  <ul class="changes">
${latest.map((e) => changeCard(e, { image: false })).join('\n')}
  </ul>
  <div class="btn-row"><a class="btn" href="/news/" data-ga="lab_news_all">All news and updates</a><a class="btn btn-ghost" href="${esc(pfgHref('/whats-new'))}" data-ga="lab_whats_new">What's new in the app</a></div>
</section>
<!-- lab-news:end -->`;

const labPath = join(root, 'lab/index.html');
const labHtml = readFileSync(labPath, 'utf8');
const START = '<!-- lab-news:start', END = '<!-- lab-news:end -->';
const s = labHtml.indexOf(START), e = labHtml.indexOf(END);
if (s < 0 || e < 0) {
  console.error('✗ lab/index.html has no <!-- lab-news:start --> … <!-- lab-news:end --> markers');
  process.exit(1);
}
const labOut = labHtml.slice(0, s) + labBlock + labHtml.slice(e + END.length);

// ---------- write or check ----------
const outputs = [
  ['news/index.html', page],
  ['news/feed.xml', feed],
  ['lab/index.html', labOut],
];
let stale = 0;
for (const [rel, content] of outputs) {
  const p = join(root, rel);
  const current = existsSync(p) ? readFileSync(p, 'utf8') : null;
  if (current === content) continue;
  if (CHECK) {
    stale++;
    console.error(`✗ ${rel} is stale: run node scripts/build-news.mjs and commit`);
  } else {
    writeFileSync(p, content);
    console.log(`wrote ${rel}`);
  }
}
if (CHECK) {
  if (stale) process.exit(1);
  console.log(`✓ news page, feed and lab block are current (${pfg.entries.length} changes, ${news.issues.length} issue${news.issues.length === 1 ? '' : 's'}).`);
}
