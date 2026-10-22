// Leads inbox Edge Function for talewatersandtides.com (/admin/leads/).
//
//   POST /functions/v1/leads/list         {}                                -> { summary, leads, pfg_connected }
//   POST /functions/v1/leads/update       { id, status?, note? }            -> { lead }
//   POST /functions/v1/leads/send-to-pfg  { id, business, kind, note? }     -> { lead, pfg_lead_id }
//
// Every call carries the signed-in admin's access token as Authorization: Bearer, and
// the email on that token must be on the allowlist. Reads and writes use the service
// role; leads and lead_events have RLS on with no policies.
//
// Secrets (supabase secrets set ...):
//   LEADS_ADMIN_EMAILS      optional comma list; falls back to METRICS_ADMIN_EMAILS, then the facilitator pair
//   PFG_SUPABASE_URL        Pocket Fishing Guide project URL, for send-to-pfg
//   PFG_SUPABASE_ANON_KEY   PFG public anon key; partner_leads takes anon inserts (the /partners apply form does the same)
//   ALLOWED_ORIGINS         optional comma list, same default as intake

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.1';
import { adminEmails, corsHeaders, json, originAllowed } from './http.ts';
import {
  appendNote,
  type LeadEvent,
  type LeadRow,
  noteLine,
  parseSend,
  parseUpdate,
  pfgLeadRow,
  RequestError,
  summarize,
} from './inbox.ts';

// Everything but user_agent and ip_hash, which never leave the database.
const COLUMNS =
  'id, created_at, source, status, name, email, role, company, looking_for, message, website, facts, tools, tools_other, ' +
  'stack_maturity, hurts, impacts, pain_note, ai_today, score, stage, fit, kickoff, slot, page, utm, notes, updated_at, ' +
  'sent_to_pfg_at, pfg_lead_id';

function service(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

function pfgConfig(): { url: string; key: string } | null {
  const url = Deno.env.get('PFG_SUPABASE_URL');
  const key = Deno.env.get('PFG_SUPABASE_ANON_KEY');
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null;
}

async function adminEmail(req: Request): Promise<string | null> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.auth.getUser(token);
  const email = (data?.user?.email ?? '').toLowerCase();
  return error || !email ? null : email;
}

async function readLead(db: SupabaseClient, id: string): Promise<LeadRow | null> {
  const { data, error } = await db.from('leads').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error('lead read failed: ' + error.message);
  return (data as LeadRow | null) ?? null;
}

async function logEvent(db: SupabaseClient, e: Omit<LeadEvent, 'created_at'>): Promise<void> {
  const { error } = await db.from('lead_events').insert(e);
  if (error) throw new Error('event write failed: ' + error.message);
}

async function list(db: SupabaseClient) {
  const [{ data: leads, error }, { data: events, error: evError }] = await Promise.all([
    db.from('leads').select(COLUMNS).order('created_at', { ascending: false }).limit(500),
    db.from('lead_events').select('lead_id, created_at, actor, kind, from_status, to_status, note').order('created_at').limit(5000),
  ]);
  if (error) throw new Error('leads query failed: ' + error.message);
  if (evError) throw new Error('events query failed: ' + evError.message);
  const rows = (leads ?? []) as unknown as LeadRow[];
  const evs = (events ?? []) as LeadEvent[];
  const byLead = new Map<string, LeadEvent[]>();
  for (const e of evs) byLead.set(e.lead_id, [...(byLead.get(e.lead_id) ?? []), e]);
  return {
    summary: summarize(rows, evs, new Date()),
    leads: rows.map((l) => ({ ...l, events: byLead.get(l.id) ?? [] })),
    pfg_connected: !!pfgConfig(),
  };
}

async function update(db: SupabaseClient, actor: string, body: Record<string, unknown>) {
  const req = parseUpdate(body);
  const lead = await readLead(db, req.id);
  if (!lead) return { status: 404, body: { error: 'lead not found' } };
  const now = new Date();
  const patch: Record<string, unknown> = { updated_at: now.toISOString() };
  if (req.status && req.status !== lead.status) patch.status = req.status;
  if (req.note) patch.notes = appendNote(lead.notes, noteLine(now, actor, req.note));
  const { error } = await db.from('leads').update(patch).eq('id', lead.id);
  if (error) throw new Error('lead update failed: ' + error.message);
  if (patch.status) {
    await logEvent(db, { lead_id: lead.id, actor, kind: 'status', from_status: lead.status, to_status: req.status, note: req.note });
  } else if (req.note) {
    await logEvent(db, { lead_id: lead.id, actor, kind: 'note', from_status: null, to_status: null, note: req.note });
  }
  return { status: 200, body: { lead: await readLead(db, lead.id) } };
}

async function sendToPfg(db: SupabaseClient, actor: string, body: Record<string, unknown>) {
  const req = parseSend(body);
  const pfg = pfgConfig();
  if (!pfg) return { status: 503, body: { error: 'Pocket Fishing Guide is not connected yet: set PFG_SUPABASE_URL and PFG_SUPABASE_ANON_KEY' } };
  const lead = await readLead(db, req.id);
  if (!lead) return { status: 404, body: { error: 'lead not found' } };
  if (lead.sent_to_pfg_at) return { status: 409, body: { error: 'already sent to Pocket Fishing Guide', lead } };
  if (lead.status === 'spam') return { status: 400, body: { error: 'take it out of spam before sending it on' } };

  const id = crypto.randomUUID();
  const res = await fetch(pfg.url + '/rest/v1/partner_leads', {
    method: 'POST',
    headers: { apikey: pfg.key, Authorization: 'Bearer ' + pfg.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(pfgLeadRow(lead, req, id)),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error('pfg insert failed', res.status, (await res.text()).slice(0, 200));
    return { status: 502, body: { error: 'Pocket Fishing Guide did not take the lead. Nothing changed here; try again.' } };
  }

  const now = new Date().toISOString();
  const moveTo = lead.status === 'new' || lead.status === 'contacted' ? 'qualified' : null;
  const patch: Record<string, unknown> = { sent_to_pfg_at: now, pfg_lead_id: id, updated_at: now };
  if (moveTo) patch.status = moveTo;
  const { error } = await db.from('leads').update(patch).eq('id', lead.id);
  if (error) throw new Error('lead update failed: ' + error.message);
  await logEvent(db, {
    lead_id: lead.id,
    actor,
    kind: 'sent_to_pfg',
    from_status: lead.status,
    to_status: (moveTo ?? lead.status) as LeadRow['status'],
    note: `Sent to PFG partner Leads as ${req.business} (${req.kind})`,
  });
  return { status: 200, body: { lead: await readLead(db, lead.id), pfg_lead_id: id } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });
  if (!originAllowed(req)) return json(req, 403, { error: 'origin not allowed' });
  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop();
  if (!['list', 'update', 'send-to-pfg'].includes(route ?? '')) return json(req, 404, { error: 'unknown route' });

  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.length > 10_000) return json(req, 413, { error: 'payload too large' });
    body = text ? JSON.parse(text) : {};
  } catch {
    return json(req, 400, { error: 'invalid json' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(req, 400, { error: 'body must be a json object' });

  try {
    const email = await adminEmail(req);
    if (!email) return json(req, 401, { error: 'sign in to see leads' });
    if (!adminEmails().includes(email)) return json(req, 403, { error: 'this account does not have leads access' });
    const db = service();
    if (route === 'list') return json(req, 200, await list(db));
    const out = route === 'update' ? await update(db, email, body) : await sendToPfg(db, email, body);
    return json(req, out.status, out.body);
  } catch (err) {
    if (err instanceof RequestError) return json(req, 400, { error: err.message });
    console.error('leads error', (err as Error).message);
    return json(req, 500, { error: 'the leads inbox could not answer, try again in a minute' });
  }
});
