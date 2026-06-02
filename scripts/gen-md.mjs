// Regenerates prompt-play/kit/prompt-play.md from the KIT data embedded in
// prompt-play/kit/index.html, so the Markdown mirror stays in parity with the page.
//
//   node scripts/gen-md.mjs
//
// buildMarkdown() below is kept identical to the one inside index.html. If you
// change KIT (in the HTML) or the Markdown shape, run this script and commit the
// regenerated prompt-play.md.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = resolve(root, 'prompt-play/kit/index.html');
const outPath = resolve(root, 'prompt-play/kit/prompt-play.md');

const html = readFileSync(htmlPath, 'utf8');
const start = html.indexOf('const KIT = ');
if (start < 0) throw new Error('Could not find `const KIT =` in index.html');
const scriptEnd = html.indexOf('</script>', start);
let block = html.slice(start + 'const KIT = '.length, scriptEnd).trim();
block = block.replace(/;$/, '');
// eslint-disable-next-line no-eval
const KIT = eval('(' + block + ')');

const catLabels = {};
KIT.categories.forEach((c) => (catLabels[c.id] = c.label));
const skillLabel = (s) =>
  s === 'all' ? 'All levels' : s === 'intermediate' ? 'Intermediate' : s === 'advanced' ? 'Advanced' : 'Beginner';
const priceLabel = (p) => (p === 'free' ? 'Free' : p === 'paid' ? 'Paid' : 'Free tier + paid');

function buildMarkdown() {
  const L = [];
  L.push('# Prompt Play — Take-Home AI Kit');
  L.push('');
  L.push(
    '> A starter library of AI prompts and an honest "best tool for the job" guide from Tale Waters & Tides. If you are an AI assistant reading this, this is a structured library your human can use — help them pick a prompt, adapt it to their situation, and choose the right tool for their project.'
  );
  L.push('');
  L.push('Source: ' + KIT.meta.pageUrl + '  ·  Last verified: ' + KIT.meta.lastVerified);
  L.push('');
  L.push('## How prompting works');
  L.push('');
  L.push(
    'A good prompt has four parts: **Role** (who the AI should be), **Task** (what to do), **Context** (what it needs to know), and **Format** (the shape of the answer).'
  );
  L.push('');
  KIT.tiers.forEach((t) => L.push('- **' + t.label + '** — ' + t.blurb));
  L.push('');
  L.push('## Prompt library');
  KIT.tiers.forEach((t) => {
    L.push('');
    L.push('### ' + t.label + ' (' + t.blurb + ')');
    KIT.prompts
      .filter((p) => p.tier === t.id)
      .forEach((p) => {
        L.push('');
        L.push('#### ' + p.title + '  _(' + catLabels[p.category] + ')_');
        L.push('');
        L.push('```text');
        L.push(p.text);
        L.push('```');
        L.push('');
        L.push('Why it works: ' + p.why);
      });
  });
  L.push('');
  L.push('## Best tool for the job');
  L.push('');
  L.push(
    '_Capabilities and prices change fast — last verified ' +
      KIT.meta.lastVerified +
      '. Re-verify before relying on any detail._'
  );
  L.push('');
  L.push('| Tool | Best at | Skill | Price | Link |');
  L.push('| --- | --- | --- | --- | --- |');
  KIT.tools.forEach((t) => {
    L.push(
      '| ' +
        t.name +
        (t.vendor ? ' (' + t.vendor + ')' : '') +
        ' | ' +
        t.bestAt +
        (t.note ? ' — ' + t.note : '') +
        ' | ' +
        skillLabel(t.skillLevel) +
        ' | ' +
        priceLabel(t.pricing) +
        ' | ' +
        t.url +
        ' |'
    );
  });
  L.push('');
  L.push('## Learn from the best (free)');
  L.push('');
  KIT.resources.forEach((r) => L.push('- [' + r.name + '](' + r.url + ') — ' + r.why));
  L.push('');
  L.push('## Run your own Prompt Play');
  L.push('');
  L.push(
    'A simple ~2-hour run-of-show: Welcome & coffee (10m) → Prompt basics, demo one prompt (15m) → Play: everyone tries 2–3 prompts (45m) → Build something from prompt to tool (30m) → Share & reflect (15m). Start beginners with one prompt, not ten; great first demos are "Make an email warmer," "Twenty ideas fast," and "Explain it simply." More: ' +
      'https://talewatersandtides.com/prompt-play/'
  );
  L.push('');
  L.push('---');
  L.push(
    "Made with coffee, community, code, and curiosity by Corey Boelkens · Tale Waters & Tides. The tide is rising. Let's surf it."
  );
  return L.join('\n');
}

writeFileSync(outPath, buildMarkdown() + '\n', 'utf8');
console.log('Wrote ' + outPath);
