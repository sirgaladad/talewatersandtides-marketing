// Unit tests for the pure parts of the intake function.
//   deno test supabase/functions/intake/intake_test.ts

import { assertEquals, assertThrows } from 'jsr:@std/assert@1.0.13';
import { detectSignals, extractText, heuristicFacts, normaliseUrl, publicScan } from './scan.ts';
import { buildLead, LeadError } from './lead.ts';

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
