// Unit tests for the pure parts of the metrics function.
//   deno test --no-check=remote --allow-env supabase/functions/metrics/metrics_test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1.0.13';
import { buildPayload, groupReferrers, referrerName } from './build.ts';
import { alignWeekly, bucketWeekly, fullWeekWindows, pctChange, redactForPartner, trendLine, weekKeys, weekStart } from './shape.ts';
import { adminEmails, matchPartner, sha256Hex } from './http.ts';
import { NOW, RAW, SOURCES } from './fixture.ts';
import { pemToDer } from './google.ts';

Deno.test('weekStart lands on Monday UTC', () => {
  assertEquals(weekStart(new Date('2026-10-22T14:00:00Z')).toISOString().slice(0, 10), '2026-10-19');
  assertEquals(weekStart(new Date('2026-10-19T00:00:00Z')).toISOString().slice(0, 10), '2026-10-19');
  assertEquals(weekStart(new Date('2026-10-25T23:59:00Z')).toISOString().slice(0, 10), '2026-10-19');
});

Deno.test('weekKeys ends with the current week, oldest first', () => {
  const k = weekKeys(NOW, 12);
  assertEquals(k.length, 12);
  assertEquals(k[11], '2026-10-19');
  assertEquals(k[0], '2026-08-03');
});

Deno.test('bucketWeekly counts inside the window only', () => {
  const k = weekKeys(NOW, 2);
  const p = bucketWeekly(['2026-10-13T10:00:00Z', '2026-10-20T10:00:00Z', '2026-10-21T10:00:00Z', '2025-01-01', 'bad'], k);
  assertEquals(p, [{ week: '2026-10-12', value: 1 }, { week: '2026-10-19', value: 2 }]);
});

Deno.test('alignWeekly sums daily rows into weeks', () => {
  const k = weekKeys(NOW, 2);
  const p = alignWeekly([
    { timestamp: '2026-10-12T00:00:00Z', value: 2 },
    { timestamp: '2026-10-18T00:00:00Z', value: 3 },
    { timestamp: '2026-10-20T00:00:00Z', value: 4 },
  ], k);
  assertEquals(p.map((x) => x.value), [5, 4]);
});

Deno.test('pctChange refuses a zero base', () => {
  assertEquals(pctChange(10, 0), null);
  assertEquals(pctChange(15, 10), 50);
  assertEquals(pctChange(null, 10), null);
});

Deno.test('trendLine compares the last complete week, never the partial one', () => {
  const k = weekKeys(NOW, 6);
  const pts = k.map((week, i) => ({ week, value: [10, 10, 10, 10, 15, 1][i] }));
  const line = trendLine(pts, 'visitors', NOW)!;
  assert(line.startsWith('Visitors up 50% in the week of Oct 12'), line);
  const big = trendLine(k.map((week, i) => ({ week, value: [10, 10, 10, 10, 120, 1][i] })), 'visitors', NOW)!;
  assert(big.includes('about 12 times the 4-week average'), big);
});

Deno.test('referrers group into readable names', () => {
  assertEquals(referrerName(''), 'Direct or app');
  assertEquals(referrerName('m.facebook.com'), 'Facebook');
  assertEquals(referrerName('com.linkedin.android'), 'LinkedIn');
  const g = groupReferrers([{ name: 'facebook.com', value: 2 }, { name: 'l.facebook.com', value: 3 }, { name: 'google.com', value: 4 }]);
  assertEquals(g[0], { name: 'Facebook', value: 5 });
});

Deno.test('payload tells the story and names the gaps', () => {
  const p = buildPayload(RAW, SOURCES, NOW);
  const pfg = p.businesses.pfg;
  const twt = p.businesses.twt;
  // Four full weeks; the partial current week (150) is left out of both windows.
  assertEquals(pfg.kpis.find((k) => k.key === 'visitors_4w')!.value, 47 + 55 + 120 + 210);
  assertEquals(pfg.kpis.find((k) => k.key === 'visitors_4w')!.prev, 52 + 48 + 45 + 50);
  assert(pfg.story.some((s) => s.includes('no referrer')));
  assert(pfg.story.some((s) => s.includes('none is confirmed')));
  assertEquals(twt.kpis.find((k) => k.key === 'leads_total')!.value, 6); // spam excluded
  assert(twt.admin_story!.some((s) => s.includes('unattributed')));
  assert(twt.admin_story!.some((s) => s.includes('early-interest')));
  assert(twt.story.some((s) => s.includes('Google Analytics for Tale Waters and Tides is not connected')));
  assert(pfg.story.some((s) => s.includes('Search Console')));
  assertEquals((twt.admin_only!.pipeline as { name: string }[])[0].name, 'new');
});

Deno.test('a Search Console property missing from GSC_SITES is named, not shown as fine', () => {
  const raw = { ...RAW, search: { twt: RAW.search?.twt ?? [] } };
  const p = buildPayload(raw, { ...SOURCES, search: { status: 'ok' } }, NOW);
  assert(p.businesses.pfg.story.some((s) => s.includes('no property set for Pocket Fishing Guide')));
  assert(!p.businesses.twt.story.some((s) => s.includes('no property set')));
});

Deno.test('fullWeekWindows leaves out the partial current week', () => {
  const pts = [1, 2, 3, 4, 5, 6, 7, 8, 100].map((value, i) => ({ week: `w${i}`, value }));
  assertEquals(fullWeekWindows(pts), [5 + 6 + 7 + 8, 1 + 2 + 3 + 4]);
});

Deno.test('trip totals stay on the dashboard after the first confirmation', () => {
  const raw = { ...RAW, pfgApp: { ...RAW.pfgApp!, trips_real: 9, trips_confirmed: 2 } };
  const pfg = buildPayload(raw, SOURCES, NOW).businesses.pfg;
  assertEquals(pfg.kpis.find((k) => k.key === 'trips_real')!.value, 9);
  assertEquals(pfg.kpis.find((k) => k.key === 'trips_confirmed')!.value, 2);
  assert(pfg.story.some((s) => s.includes('2 of 9 real guide-trip requests are confirmed')));
  assert(!pfg.story.some((s) => s.includes('none is confirmed')));
  assert(pfg.series.pageviews!.length > 0);
});

Deno.test('partner view drops leads, pipeline and source notes', () => {
  const p = redactForPartner(buildPayload(RAW, SOURCES, NOW));
  const twt = p.businesses.twt;
  assertEquals(p.scope, 'partner');
  assertEquals(twt.kpis.some((k) => k.key.startsWith('leads')), false);
  assertEquals('leads' in twt.series, false);
  assertEquals('lead_sources' in twt.breakdowns, false);
  assertEquals('admin_only' in twt, false);
  assertEquals('admin_story' in twt, false);
  // The fixture has a /guiding/ lead; its count must not reach partners in any wording.
  assertEquals(JSON.stringify(twt.story).includes('guide service'), false);
  assertEquals(twt.story.some((s) => /lead|pipeline|unattributed/i.test(s)), false);
  assertEquals(Object.values(p.sources).some((s) => 'note' in s), false);
  assertEquals(JSON.stringify(p).includes('@'), false);
});

Deno.test('partner tokens match by hash and refuse short tokens', async () => {
  const token = 'partner-link-token-0123456789abcdef';
  Deno.env.set('PARTNER_TOKENS_SHA256', `river-co:${await sha256Hex(token)},bad-entry`);
  assertEquals(await matchPartner(token), 'river-co');
  assertEquals(await matchPartner(token + 'x'), null);
  assertEquals(await matchPartner('short'), null);
  Deno.env.delete('PARTNER_TOKENS_SHA256');
  assertEquals(await matchPartner(token), null);
});

Deno.test('admin allowlist defaults to the facilitator emails', () => {
  Deno.env.delete('METRICS_ADMIN_EMAILS');
  assertEquals(adminEmails().includes('corey@talewatersandtides.com'), true);
  Deno.env.set('METRICS_ADMIN_EMAILS', ' A@B.com ');
  assertEquals(adminEmails(), ['a@b.com']);
  Deno.env.delete('METRICS_ADMIN_EMAILS');
});

Deno.test('service-account PEM imports as an RS256 signing key', async () => {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify']
  );
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der)).replace(/(.{64})/g, '$1\n')}\n-----END PRIVATE KEY-----\n`;
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode('a.b'));
  assertEquals(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pair.publicKey, sig, new TextEncoder().encode('a.b')), true);
});
