// Sample payload for the /admin/leads/ demo view (`deno run fixture.ts > ../../../admin/leads/sample.json`).
// Every person and business here is made up: example.com addresses, 555-01xx numbers.
// CI checks the committed sample.json still matches this file.

import { type LeadEvent, type LeadRow, summarize } from './inbox.ts';

export const NOW = new Date('2026-10-22T15:00:00Z');
const ago = (days: number, hours = 0) => new Date(NOW.getTime() - (days * 24 + hours) * 3_600_000).toISOString();

function lead(id: string, days: number, over: Partial<LeadRow>): LeadRow {
  return {
    id,
    created_at: ago(days),
    source: 'contact',
    status: 'new',
    name: 'Sample Person',
    email: 'person@example.com',
    role: null,
    company: null,
    looking_for: null,
    message: null,
    website: null,
    facts: {},
    tools: [],
    tools_other: null,
    stack_maturity: null,
    hurts: [],
    impacts: [],
    pain_note: null,
    ai_today: null,
    score: null,
    stage: null,
    fit: null,
    kickoff: null,
    slot: null,
    page: '/',
    utm: {},
    notes: null,
    updated_at: null,
    sent_to_pfg_at: null,
    pfg_lead_id: null,
    ...over,
  };
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const LEADS: LeadRow[] = [
  lead(id(1), 0.2, {
    source: 'readiness', name: 'Dana Example', email: 'dana@example.com', company: 'Example Dental Group', role: 'Owner',
    website: 'example.com', score: 62, stage: 'Exploring', fit: 'Setup and training', facts: { industry: 'Healthcare', size: '10-49' },
    tools: ['Google Workspace', 'Weave'], hurts: ['Follow-up', 'Scheduling'], page: '/readiness/', utm: { utm_source: 'linkedin' },
  }),
  lead(id(2), 2, {
    name: 'Riley Sample', email: 'riley@example.com', looking_for: 'A workshop or talk', company: 'Example Chamber',
    message: 'Could you run a 60 minute AI basics session for members in November?', utm: { ref: 'google' },
  }),
  lead(id(3), 5, {
    source: 'contact', stage: 'guiding-early', name: 'Sam Angler', email: 'sam@example.com', looking_for: 'Something else',
    message: 'Two of us, a weekday in March on the White below Bull Shoals.', page: '/guiding/', status: 'contacted',
  }),
  lead(id(4), 9, {
    name: 'Jordan Example', email: 'jordan@example.com', company: 'Example Fly Shop', looking_for: 'A partnership',
    message: 'We run trips on the Norfork and want to be listed in the app.', website: 'https://example.com', status: 'qualified',
    sent_to_pfg_at: ago(8), pfg_lead_id: '00000000-0000-4000-8000-0000000000a4',
  }),
  lead(id(5), 16, {
    source: 'readiness', name: 'Casey Sample', email: 'casey@example.com', company: 'Example Roofing', score: 48, stage: 'Starting',
    page: '/readiness/', status: 'won', notes: '2026-10-07 16:02Z corey@talewatersandtides.com: Kickoff booked for Nov 3.',
  }),
  lead(id(6), 30, { name: 'Morgan Example', email: 'morgan@example.com', looking_for: 'A fractional AI / MarTech lead', status: 'lost' }),
  lead(id(7), 31, { name: 'Test Test', email: 'test@example.com', status: 'spam' }),
];

const ev = (lead_id: string, days: number, from: LeadRow['status'], to: LeadRow['status'], kind: LeadEvent['kind'] = 'status'): LeadEvent => ({
  lead_id, created_at: ago(days), actor: 'corey@talewatersandtides.com', kind, from_status: from, to_status: to, note: null,
});

export const EVENTS: LeadEvent[] = [
  ev(id(3), 4.8, 'new', 'contacted'),
  ev(id(4), 8.9, 'new', 'contacted'),
  ev(id(4), 8, 'contacted', 'qualified', 'sent_to_pfg'),
  ev(id(5), 15.7, 'new', 'contacted'),
  ev(id(5), 14, 'contacted', 'qualified'),
  ev(id(5), 13, 'qualified', 'won'),
  ev(id(6), 29, 'new', 'contacted'),
  ev(id(6), 20, 'contacted', 'lost'),
  ev(id(7), 31, 'new', 'spam'),
];

export function samplePayload() {
  const byLead = new Map<string, LeadEvent[]>();
  for (const e of EVENTS) byLead.set(e.lead_id, [...(byLead.get(e.lead_id) ?? []), e]);
  return {
    summary: summarize(LEADS, EVENTS, NOW),
    leads: LEADS.map((l) => ({ ...l, events: byLead.get(l.id) ?? [] })),
    pfg_connected: true,
  };
}

if (import.meta.main) console.log(JSON.stringify(samplePayload(), null, 2));
