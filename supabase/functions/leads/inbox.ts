// Pure logic for the leads inbox: request checks, the summary the admin page draws
// (funnel, weekly chart, speed to first contact, story lines), and the row sent to
// Pocket Fishing Guide's partner Leads. No I/O here, so it is all unit-tested.

export const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'] as const;
export type Status = (typeof STATUSES)[number];

// The kinds PFG's partner Leads accepts (pocket-fishing-guide lib/partners/taxonomy.ts).
export const PFG_KINDS = ['guide', 'outfitter', 'tackle', 'lodging', 'marina', 'dealer'] as const;
export type PfgKind = (typeof PFG_KINDS)[number];

export const WEEKS = 12;
const DAY = 86_400_000;

export interface LeadEvent {
  lead_id: string;
  created_at: string;
  actor: string;
  kind: 'status' | 'note' | 'sent_to_pfg';
  from_status: Status | null;
  to_status: Status | null;
  note: string | null;
}

// A leads row as the function reads it. user_agent and ip_hash are never selected.
export interface LeadRow {
  id: string;
  created_at: string;
  source: 'contact' | 'readiness';
  status: Status;
  name: string;
  email: string;
  role: string | null;
  company: string | null;
  looking_for: string | null;
  message: string | null;
  website: string | null;
  facts: Record<string, string>;
  tools: string[];
  tools_other: string | null;
  stack_maturity: string | null;
  hurts: string[];
  impacts: string[];
  pain_note: string | null;
  ai_today: string | null;
  score: number | null;
  stage: string | null;
  fit: string | null;
  kickoff: string | null;
  slot: string | null;
  page: string | null;
  utm: Record<string, string>;
  notes: string | null;
  updated_at: string | null;
  sent_to_pfg_at: string | null;
  pfg_lead_id: string | null;
}

/** Which form a lead came from, in words. Guide-trip interest posts as contact + stage. */
export function formOf(l: Pick<LeadRow, 'source' | 'stage'>): 'readiness' | 'guiding' | 'contact' {
  if (l.source === 'readiness') return 'readiness';
  if ((l.stage ?? '').startsWith('guiding')) return 'guiding';
  return 'contact';
}
export const FORM_WORD = { readiness: 'Readiness check', guiding: 'Guide trip interest', contact: 'Contact form' };

export class RequestError extends Error {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\r\n?/g, '\n').trim();
  return t ? t.slice(0, max) : null;
}

/** POST /leads/update { id, status?, note? } */
export function parseUpdate(body: Record<string, unknown>): { id: string; status: Status | null; note: string | null } {
  const id = typeof body.id === 'string' && UUID_RE.test(body.id) ? body.id : null;
  if (!id) throw new RequestError('id must be a lead id');
  const status = body.status == null ? null : (STATUSES as readonly string[]).includes(String(body.status)) ? (body.status as Status) : undefined;
  if (status === undefined) throw new RequestError('status must be one of ' + STATUSES.join(', '));
  const note = text(body.note, 2000);
  if (!status && !note) throw new RequestError('send a status, a note, or both');
  return { id, status, note };
}

/** POST /leads/send-to-pfg { id, business, kind, note? } */
export function parseSend(body: Record<string, unknown>): { id: string; business: string; kind: PfgKind; note: string | null } {
  const id = typeof body.id === 'string' && UUID_RE.test(body.id) ? body.id : null;
  if (!id) throw new RequestError('id must be a lead id');
  const business = text(body.business, 160);
  if (!business || business.length < 2) throw new RequestError('business name is required');
  const kind = (PFG_KINDS as readonly string[]).includes(String(body.kind)) ? (body.kind as PfgKind) : null;
  if (!kind) throw new RequestError('kind must be one of ' + PFG_KINDS.join(', '));
  return { id, business, kind, note: text(body.note, 1000) };
}

/** A note line as it is appended to leads.notes: dated, attributed, newest last. */
export function noteLine(now: Date, actor: string, note: string): string {
  return `${now.toISOString().slice(0, 16).replace('T', ' ')}Z ${actor}: ${note}`;
}
export function appendNote(existing: string | null, line: string): string {
  const all = existing ? existing + '\n' + line : line;
  // Keep the newest notes if the column limit is ever reached.
  return all.length > 8000 ? all.slice(all.length - 8000) : all;
}

/** The partner_leads row for PFG. Only what the lead told us, marked with where it came from. */
export function pfgLeadRow(lead: LeadRow, req: { business: string; kind: PfgKind; note: string | null }, id: string) {
  const said = [lead.looking_for, lead.message, lead.pain_note].filter(Boolean).join(' / ');
  const note = [
    `From talewatersandtides.com (${FORM_WORD[formOf(lead)].toLowerCase()}, ${lead.created_at.slice(0, 10)}).`,
    said ? `They said: ${said}` : null,
    req.note ? `Corey: ${req.note}` : null,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 2000);
  const website = lead.website && /^https?:\/\//.test(lead.website) ? lead.website.replace(/^http:/, 'https:') : lead.website ? 'https://' + lead.website : null;
  return {
    id,
    source: 'twt:website',
    business: req.business,
    kind: req.kind,
    email: lead.email,
    phone: null,
    note,
    payload: { from: 'talewatersandtides.com', twt_lead_id: lead.id, contact: lead.name, role: lead.role, website, form: formOf(lead) },
  };
}

// ---------------------------------------------------------------- summary

const RANK: Record<Status, number> = { new: 0, contacted: 1, qualified: 2, won: 3, lost: -1, spam: -2 };

/** Monday (UTC) of the week holding d, as YYYY-MM-DD. */
export function weekOf(d: Date): string {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - dow * DAY).toISOString().slice(0, 10);
}
export function weekKeys(now: Date, n: number): string[] {
  const last = Date.parse(weekOf(now) + 'T00:00:00Z');
  return Array.from({ length: n }, (_, i) => new Date(last - (n - 1 - i) * 7 * DAY).toISOString().slice(0, 10));
}

/** The furthest stage a lead reached: its current status, or any status in its history. */
export function reached(lead: LeadRow, events: LeadEvent[]): number {
  let best = RANK[lead.status];
  for (const e of events) if (e.to_status && RANK[e.to_status] > best) best = RANK[e.to_status];
  return best;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function hoursWords(h: number): string {
  if (h < 1) return 'under an hour';
  if (h < 48) return `${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'}`;
  return `${Math.round(h / 24)} days`;
}
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export interface Summary {
  generated_at: string;
  counts: Record<Status, number>;
  funnel: { stage: string; n: number }[];
  weekly: { week: string; readiness: number; contact: number; guiding: number }[];
  first_contact_hours: number | null;
  waiting: number;
  story: string[];
}

export function summarize(leads: LeadRow[], events: LeadEvent[], now: Date): Summary {
  const byLead = new Map<string, LeadEvent[]>();
  for (const e of events) byLead.set(e.lead_id, [...(byLead.get(e.lead_id) ?? []), e]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const l of leads) counts[l.status]++;
  const real = leads.filter((l) => l.status !== 'spam');

  const at = (l: LeadRow) => reached(l, byLead.get(l.id) ?? []);
  const touched = (l: LeadRow) => l.status !== 'new' || (byLead.get(l.id) ?? []).length > 0;
  const funnel = [
    { stage: 'Came in', n: real.length },
    { stage: 'Reviewed', n: real.filter(touched).length },
    { stage: 'Contacted', n: real.filter((l) => at(l) >= 1).length },
    { stage: 'Qualified', n: real.filter((l) => at(l) >= 2).length },
    { stage: 'Won', n: real.filter((l) => at(l) >= 3).length },
  ];

  const keys = weekKeys(now, WEEKS);
  const weekly = keys.map((week) => ({ week, readiness: 0, contact: 0, guiding: 0 }));
  const idx = new Map(keys.map((k, i) => [k, i]));
  for (const l of real) {
    const i = idx.get(weekOf(new Date(l.created_at)));
    if (i != null) weekly[i][formOf(l)]++;
  }

  // Speed: hours from arrival to the first move out of "new" (spam excluded).
  const speeds: number[] = [];
  for (const l of real) {
    const first = (byLead.get(l.id) ?? [])
      .filter((e) => e.kind === 'status' && e.to_status && e.to_status !== 'new' && e.to_status !== 'spam')
      .map((e) => Date.parse(e.created_at))
      .sort((a, b) => a - b)[0];
    if (first) speeds.push((first - Date.parse(l.created_at)) / 3_600_000);
  }
  const firstContact = median(speeds);
  const waiting = real.filter((l) => l.status === 'new' && now.getTime() - Date.parse(l.created_at) > DAY).length;

  const story: string[] = [];
  const last4 = real.filter((l) => now.getTime() - Date.parse(l.created_at) <= 28 * DAY).length;
  const prev4 = real.filter((l) => {
    const age = now.getTime() - Date.parse(l.created_at);
    return age > 28 * DAY && age <= 56 * DAY;
  }).length;
  if (!real.length) {
    story.push('No real website leads yet. Every submission so far was a test and is filed as spam.');
  } else {
    story.push(
      last4 === prev4
        ? `${plural(last4, 'lead')} in the last 4 weeks, the same as the 4 weeks before.`
        : `${plural(last4, 'lead')} in the last 4 weeks, ${last4 > prev4 ? 'up' : 'down'} from ${prev4} the 4 weeks before.`
    );
    const forms = (['readiness', 'contact', 'guiding'] as const)
      .map((f) => ({ f, n: real.filter((l) => formOf(l) === f).length }))
      .sort((a, b) => b.n - a.n);
    if (forms[0].n) story.push(`Most leads come from the ${FORM_WORD[forms[0].f].toLowerCase()} (${forms[0].n} of ${real.length}).`);
  }
  if (waiting) story.push(`${plural(waiting, 'new lead has', 'new leads have')} waited more than a day for a first reply. Start there.`);
  if (firstContact != null) story.push(`Median time to first contact is ${hoursWords(firstContact)}, across ${plural(speeds.length, 'lead')}.`);
  if (real.length) {
    const q = funnel[3].n, w = funnel[4].n;
    story.push(`${q} of ${real.length} reached qualified and ${w} ${w === 1 ? 'was' : 'were'} won. ${counts.lost} marked lost.`);
  }
  const sent = real.filter((l) => l.sent_to_pfg_at).length;
  if (sent) story.push(`${plural(sent, 'lead')} sent on to Pocket Fishing Guide partner Leads.`);
  if (counts.spam) story.push(`${plural(counts.spam, 'submission')} filed as spam and left out of every number above.`);

  return { generated_at: now.toISOString(), counts, funnel, weekly, first_contact_hours: firstContact, waiting, story };
}
