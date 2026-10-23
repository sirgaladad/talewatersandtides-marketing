import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  appendNote,
  formOf,
  type LeadRow,
  noteLine,
  parseSend,
  parseUpdate,
  pfgLeadRow,
  reached,
  RequestError,
  summarize,
  weekKeys,
  weekOf,
} from './inbox.ts';
import { EVENTS, LEADS, NOW, samplePayload } from './fixture.ts';

const ID = '00000000-0000-4000-8000-000000000001';

Deno.test('formOf tells the three website forms apart', () => {
  assertEquals(formOf({ source: 'readiness', stage: 'Exploring' }), 'readiness');
  assertEquals(formOf({ source: 'contact', stage: 'guiding-early' }), 'guiding');
  assertEquals(formOf({ source: 'contact', stage: null }), 'contact');
});

Deno.test('parseUpdate accepts a status, a note or both, and nothing else', () => {
  assertEquals(parseUpdate({ id: ID, status: 'contacted' }), { id: ID, status: 'contacted', note: null });
  assertEquals(parseUpdate({ id: ID, note: '  called, left a message ' }), { id: ID, status: null, note: 'called, left a message' });
  assertThrows(() => parseUpdate({ id: 'nope', status: 'won' }), RequestError);
  assertThrows(() => parseUpdate({ id: ID, status: 'deleted' }), RequestError);
  assertThrows(() => parseUpdate({ id: ID }), RequestError);
  assertEquals(parseUpdate({ id: ID, note: 'x'.repeat(3000) }).note?.length, 2000);
});

Deno.test('parseSend requires a business name and a PFG partner kind', () => {
  assertEquals(parseSend({ id: ID, business: 'Example Fly Shop', kind: 'tackle' }).kind, 'tackle');
  assertThrows(() => parseSend({ id: ID, business: 'Example', kind: 'consultant' }), RequestError);
  assertThrows(() => parseSend({ id: ID, business: ' ', kind: 'guide' }), RequestError);
});

Deno.test('notes append dated and attributed, and keep the newest when full', () => {
  const line = noteLine(new Date('2026-10-22T15:04:09Z'), 'corey@talewatersandtides.com', 'Booked a call');
  assertEquals(line, '2026-10-22 15:04Z corey@talewatersandtides.com: Booked a call');
  assertEquals(appendNote(null, 'a'), 'a');
  assertEquals(appendNote('a', 'b'), 'a\nb');
  const full = appendNote('x'.repeat(7990), 'the newest note');
  assertEquals(full.length, 8000);
  assert(full.endsWith('the newest note'));
});

Deno.test('the PFG row carries only what the lead said, marked as from the website', () => {
  const lead = LEADS.find((l) => l.company === 'Example Fly Shop') as LeadRow;
  const row = pfgLeadRow(lead, { business: 'Example Fly Shop', kind: 'tackle', note: 'Wants a card on the Norfork' }, 'pfg-id');
  assertEquals(row.source, 'twt:website');
  assertEquals(row.email, lead.email);
  assertEquals(row.phone, null);
  assertEquals(row.payload.twt_lead_id, lead.id);
  assertEquals(row.payload.website, 'https://example.com');
  assert(row.note.startsWith('From talewatersandtides.com (contact form, '));
  assert(row.note.includes('Corey: Wants a card on the Norfork'));
  // No browser or network detail ever travels.
  assert(!JSON.stringify(row).includes('ip_hash') && !JSON.stringify(row).includes('user_agent'));
});

Deno.test('a bare domain becomes an https link for the PFG draft', () => {
  const lead = { ...LEADS[0], website: 'example.com' };
  assertEquals(pfgLeadRow(lead, { business: 'X Co', kind: 'guide', note: null }, 'i').payload.website, 'https://example.com');
});

Deno.test('weeks start on Monday in UTC', () => {
  assertEquals(weekOf(new Date('2026-10-22T15:00:00Z')), '2026-10-19');
  assertEquals(weekOf(new Date('2026-10-19T00:00:00Z')), '2026-10-19');
  assertEquals(weekOf(new Date('2026-10-18T23:59:00Z')), '2026-10-12');
  const keys = weekKeys(NOW, 12);
  assertEquals(keys.length, 12);
  assertEquals(keys[11], '2026-10-19');
});

Deno.test('reached counts the furthest stage, even after a lead is marked lost', () => {
  const lost = LEADS.find((l) => l.status === 'lost') as LeadRow;
  assertEquals(reached(lost, EVENTS.filter((e) => e.lead_id === lost.id)), 1);
});

Deno.test('summary: funnel, counts, speed and the story leave spam out', () => {
  const s = summarize(LEADS, EVENTS, NOW);
  assertEquals(s.counts.spam, 1);
  assertEquals(s.funnel.map((f) => f.n), [6, 4, 4, 2, 1]);
  assertEquals(s.waiting, 1);
  assertEquals(s.first_contact_hours, 6);
  const weeklyTotal = s.weekly.reduce((a, w) => a + w.readiness + w.contact + w.guiding, 0);
  assertEquals(weeklyTotal, 6);
  assert(s.story.some((l) => l.includes('waited more than a day')));
  assert(s.story.some((l) => l.includes('left out of every number')));
});

Deno.test('summary with only test rows says so plainly', () => {
  const spamOnly = LEADS.map((l) => ({ ...l, status: 'spam' as const }));
  const s = summarize(spamOnly, [], NOW);
  assertEquals(s.funnel[0].n, 0);
  assert(s.story[0].startsWith('No real website leads yet'));
  assertEquals(s.first_contact_hours, null);
});

Deno.test('the sample payload never carries browser or network detail', () => {
  const text = JSON.stringify(samplePayload());
  assert(!text.includes('ip_hash') && !text.includes('user_agent'));
  assert(!/@(?!example\.com|talewatersandtides\.com)[a-z0-9.-]+\.[a-z]+/i.test(text), 'only example.com addresses in the public sample');
});
