// POST /intake/lead
// Validates and stores a lead from either the home contact form (source=contact)
// or the readiness check (source=readiness). Optional email alert via Resend
// when RESEND_API_KEY and LEAD_NOTIFY_EMAIL are set.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.1';
import { str, strList } from './http.ts';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const LOOKING_FOR = [
  'AI setup and training for my business',
  'A fractional AI / MarTech lead',
  'A workshop or talk',
  'A partnership',
  'Something else',
];

export class LeadError extends Error {}

// deno-lint-ignore no-explicit-any
type Body = Record<string, any>;

export function buildLead(body: Body, meta: { ipHash: string; userAgent: string }) {
  // Honeypot: a hidden field real visitors never fill. Elapsed time: bots submit instantly.
  if (str(body.company_website, 200)) throw new LeadError('spam');
  if (typeof body.elapsed_ms === 'number' && body.elapsed_ms < 2500) throw new LeadError('spam');

  const source = body.source === 'readiness' ? 'readiness' : body.source === 'contact' ? 'contact' : null;
  if (!source) throw new LeadError('source must be contact or readiness');

  const name = str(body.name, 120);
  const email = str(body.email, 254)?.toLowerCase() ?? null;
  if (!name || name.length < 2) throw new LeadError('name is required');
  if (!email || !EMAIL_RE.test(email)) throw new LeadError('a valid email is required');

  const facts = body.facts && typeof body.facts === 'object' ? body.facts : {};
  const cleanFacts: Record<string, string> = {};
  for (const k of ['industry', 'size', 'locations', 'crm', 'booking', 'reviews']) {
    const v = str(facts[k], 80);
    if (v) cleanFacts[k] = v;
  }
  const utm: Record<string, string> = {};
  if (body.utm && typeof body.utm === 'object') {
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref']) {
      const v = str(body.utm[k], 120);
      if (v) utm[k] = v;
    }
  }
  const score = Number.isInteger(body.score) && body.score >= 0 && body.score <= 100 ? body.score : null;
  const kickoff = typeof body.kickoff === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.kickoff) ? body.kickoff : null;
  const lookingFor = str(body.looking_for, 80);

  return {
    source,
    name,
    email,
    role: str(body.role, 40),
    company: str(body.company, 160),
    looking_for: lookingFor && LOOKING_FOR.includes(lookingFor) ? lookingFor : lookingFor ? 'Something else' : null,
    message: str(body.message, 4000),
    website: str(body.website, 255),
    facts: cleanFacts,
    tools: strList(body.tools, 30, 80),
    tools_other: str(body.tools_other, 400),
    stack_maturity: str(body.stack_maturity, 20),
    hurts: strList(body.hurts, 4, 60),
    impacts: strList(body.impacts, 10, 60),
    pain_note: str(body.pain_note, 1000),
    ai_today: str(body.ai_today, 60),
    score,
    stage: str(body.stage, 20),
    fit: str(body.fit, 40),
    kickoff,
    slot: str(body.slot, 40),
    scan:
      body.scan && typeof body.scan === 'object'
        ? {
            domain: str(body.scan.domain, 255),
            source: str(body.scan.source, 20),
            summary: str(body.scan.summary, 240),
            signals: strList(body.scan.signals, 15, 80),
          }
        : null,
    page: str(body.page, 255),
    utm,
    user_agent: meta.userAgent.slice(0, 400),
    ip_hash: meta.ipHash,
  };
}

export async function saveLead(db: SupabaseClient, lead: ReturnType<typeof buildLead>): Promise<string> {
  const { data, error } = await db.from('leads').insert(lead).select('id').single();
  if (error) throw new Error(error.message);
  await notify(lead).catch((e) => console.error('notify failed', e.message));
  return data.id as string;
}

async function notify(lead: ReturnType<typeof buildLead>): Promise<void> {
  const key = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('LEAD_NOTIFY_EMAIL');
  if (!key || !to) return;
  const rows = Object.entries(lead)
    .filter(([k, v]) => !['user_agent', 'ip_hash'].includes(k) && v != null && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('LEAD_FROM_EMAIL') ?? 'TWT Leads <leads@talewatersandtides.com>',
      to: [to],
      reply_to: lead.email,
      subject: `New ${lead.source} lead: ${lead.name}${lead.company ? ' · ' + lead.company : ''}${lead.stage ? ' · ' + lead.stage : ''}`,
      text: rows.join('\n'),
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
