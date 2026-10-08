// Unit tests for the pure parts of the intake function.
//   deno test supabase/functions/intake/intake_test.ts

import { assertEquals, assertThrows } from 'jsr:@std/assert@1.0.13';
import { detectSignals, extractText, heuristicFacts, normaliseUrl, publicScan, scanSite, useCached } from './scan.ts';
import { buildLead, LeadError, validDate } from './lead.ts';

const meta = { ipHash: 'abc', userAgent: 'test' };

Deno.test('normaliseUrl adds https and accepts public domains', () => {
  assertEquals(normaliseUrl('swanksalon.com').href, 'https://swanksalon.com/');
  assertEquals(normaliseUrl('http://example.org/about').hostname, 'example.org');
});

Deno.test('normaliseUrl blocks SSRF targets', () => {
  for (const bad of [
    'http://127.0.0.1', 'http://169.254.169.254/latest', 'http://[::1]/', 'localhost:3000',
    'http://intranet', 'http://printer.local', 'ftp://example.com', 'http://user:pw@example.com',
    'https://example.com:8443', 'https://abc.supabase.co',
  ]) {
    assertThrows(() => normaliseUrl(bad), Error, undefined, bad);
  }
});

Deno.test('extractText strips scripts and reads title/description', () => {
  const t = extractText('<title>Swank Salon</title><meta name="description" content="Hair in LR"><script>evil()</script><p>Book now</p>');
  assertEquals(t.title, 'Swank Salon');
  assertEquals(t.description, 'Hair in LR');
  assertEquals(t.text.includes('evil'), false);
});

Deno.test('extractText handles end tags with whitespace or attributes', () => {
  const t = extractText('<p>keep</p><script>a()</script ><style>.x{}</style foo><p>also</p>');
  assertEquals(t.text, 'keep also');
});

Deno.test('publicScan never returns page-derived summary text', () => {
  const pub = publicScan({ domain: 'a.com', facts: heuristicFacts('a.com'), summary: 'internal secret', signals: [], source: 'claude' });
  assertEquals('summary' in pub, false);
});

Deno.test('useCached skips heuristic rows once a key is set', () => {
  const base = { domain: 'a.com', facts: heuristicFacts('a.com'), summary: '', signals: [] };
  assertEquals(useCached({ ...base, source: 'heuristic' }, true), false);
  assertEquals(useCached({ ...base, source: 'heuristic' }, false), true);
  assertEquals(useCached({ ...base, source: 'claude' }, true), true);
});

Deno.test('scanSite does not cache a fallback caused by a Claude error', async () => {
  const upserts: unknown[] = [];
  const db = {
    from: () => ({
      select: () => ({ eq: () => ({ gte: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }),
      upsert: (row: unknown) => (upserts.push(row), Promise.resolve({ error: null })),
    }),
  };
  const realFetch = globalThis.fetch;
  const realDns = Deno.resolveDns;
  const realKey = Deno.env.get('ANTHROPIC_API_KEY');
  globalThis.fetch = (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    if (new URL(url).hostname === 'api.anthropic.com') {
      return Promise.resolve(new Response('{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}', { status: 401, headers: { 'content-type': 'application/json' } }));
    }
    return Promise.resolve(new Response('<title>Swank Salon</title><p>hair salon</p>', { headers: { 'content-type': 'text/html' } }));
  };
  // deno-lint-ignore no-explicit-any
  (Deno as any).resolveDns = (_h: string, type: string) => Promise.resolve(type === 'A' ? ['93.184.216.34'] : []);
  Deno.env.set('ANTHROPIC_API_KEY', 'sk-ant-test-invalid');
  try {
    // deno-lint-ignore no-explicit-any
    const r = await scanSite(db as any, 'swanksalon.com');
    assertEquals(r.source, 'heuristic');
    assertEquals(upserts.length, 0);
  } finally {
    globalThis.fetch = realFetch;
    // deno-lint-ignore no-explicit-any
    (Deno as any).resolveDns = realDns;
    if (realKey === undefined) Deno.env.delete('ANTHROPIC_API_KEY');
    else Deno.env.set('ANTHROPIC_API_KEY', realKey);
  }
});

Deno.test('detectSignals and heuristicFacts', () => {
  const html = '<a href="https://www.vagaro.com/swank">Book</a><a href="https://www.yelp.com/biz/x">Yelp</a>';
  const s = detectSignals(html);
  assertEquals(s.booking, ['Vagaro']);
  assertEquals(s.reviews, ['Yelp']);
  const f = heuristicFacts('swanksalon.com', 'hair salon', s);
  assertEquals(f.industry, 'Salon / studio');
  assertEquals(f.crm, 'Booking software');
  assertEquals(f.booking, 'Yes');
});

Deno.test('buildLead validates required fields', () => {
  assertThrows(() => buildLead({ source: 'contact', name: 'A', email: 'a@b.co' }, meta), LeadError);
  assertThrows(() => buildLead({ source: 'contact', name: 'Ann', email: 'nope' }, meta), LeadError);
  assertThrows(() => buildLead({ source: 'other', name: 'Ann', email: 'a@b.co' }, meta), LeadError);
});

Deno.test('buildLead traps spam', () => {
  assertThrows(() => buildLead({ source: 'contact', name: 'Ann', email: 'a@b.co', company_website: 'x' }, meta), LeadError, 'spam');
  assertThrows(() => buildLead({ source: 'contact', name: 'Ann', email: 'a@b.co', elapsed_ms: 400 }, meta), LeadError, 'spam');
});

Deno.test('buildLead cleans and clamps a readiness payload', () => {
  const lead = buildLead({
    source: 'readiness', name: ' Ann Lee ', email: 'ANN@Swank.com', role: 'owner', elapsed_ms: 60000,
    facts: { industry: 'Salon / studio', size: '5–15', junk: 'x' }, tools: ['Google Workspace', 42, ''],
    hurts: ['Answering inquiries', 'Scheduling', 'a', 'b', 'c'], score: 140, kickoff: '2026-10-20',
    looking_for: 'Hack the planet', scan: { domain: 'swank.com', source: 'claude', extra: 'x' },
  }, meta);
  assertEquals(lead.name, 'Ann Lee');
  assertEquals(lead.email, 'ann@swank.com');
  assertEquals(lead.facts, { industry: 'Salon / studio', size: '5–15' });
  assertEquals(lead.tools, ['Google Workspace']);
  assertEquals(lead.hurts.length, 4);
  assertEquals(lead.score, null);
  assertEquals(lead.kickoff, '2026-10-20');
  assertEquals(lead.looking_for, 'Something else');
  assertEquals(Object.keys(lead.scan!).sort(), ['domain', 'signals', 'source', 'summary']);
});

Deno.test('validDate rejects impossible calendar dates', () => {
  assertEquals(validDate('2026-10-20'), '2026-10-20');
  assertEquals(validDate('2028-02-29'), '2028-02-29');
  assertEquals(validDate('2026-02-31'), null);
  assertEquals(validDate('2026-13-01'), null);
  assertEquals(validDate(20261020), null);
});
