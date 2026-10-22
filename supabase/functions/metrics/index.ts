// Metrics Edge Function for the talewatersandtides.com progress dashboard.
//
//   POST /functions/v1/metrics/summary   {}                      admin view (signed-in allowlisted email)
//   POST /functions/v1/metrics/summary   { partner_token: "..." } partner view (trends and totals only)
//
// Admin calls carry the signed-in user's access token as Authorization: Bearer.
// Partner calls carry the public anon key and a share token; only its SHA-256 is stored.
// Every response is aggregates. No row about a person ever leaves this function.
//
// Secrets (supabase secrets set ...); every source is optional and shows as
// "not connected" until its secrets exist:
//   METRICS_ADMIN_EMAILS         comma list; defaults to the facilitator allowlist
//   PARTNER_TOKENS_SHA256        comma list of label:sha256hex, one per partner link
//   VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PFG_PROJECT_ID          PFG traffic
//   PFG_METRICS_URL, PFG_METRICS_TOKEN                           PFG accounts and bookings
//   GOOGLE_SERVICE_ACCOUNT_JSON, GA4_PROPERTY_ID_TWT, GSC_SITES  Google analytics and search
//   ALLOWED_ORIGINS              optional comma list, same default as intake

import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
import { buildPayload, type Raw, WEEKS } from './build.ts';
import { NotConnected, type Payload, redactForPartner, type SourceState, weekKeys } from './shape.ts';
import { pfgApp, pfgWeb, search, twtLeads, twtWeb } from './sources.ts';
import { adminEmails, corsHeaders, json, matchPartner, originAllowed } from './http.ts';

const CACHE_MS = 10 * 60_000;
let cached: { at: number; payload: Payload } | null = null;

async function collect(now: Date): Promise<Payload> {
  if (cached && now.getTime() - cached.at < CACHE_MS) return cached.payload;
  const keys = weekKeys(now, WEEKS);
  const since = keys[0];
  const until = now.toISOString().slice(0, 10);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const jobs: Record<string, () => Promise<Partial<Raw>>> = {
    twt_leads: () => twtLeads(db),
    pfg_web: () => pfgWeb(since, until),
    pfg_app: () => pfgApp(),
    google: () => twtWeb(since, until),
    search: () => search(since, until),
  };
  const raw: Raw = {};
  const sources: Record<string, SourceState> = {};
  await Promise.all(
    Object.entries(jobs).map(async ([name, run]) => {
      try {
        Object.assign(raw, await run());
        sources[name] = { status: 'ok' };
      } catch (err) {
        if (err instanceof NotConnected) {
          sources[name] = { status: 'not_connected', note: err.message };
        } else {
          console.error('metrics source failed', name, (err as Error).message);
          sources[name] = { status: 'error', note: 'failed to load' };
        }
      }
    })
  );
  const payload = buildPayload(raw, sources, now);
  cached = { at: now.getTime(), payload };
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });
  if (!originAllowed(req)) return json(req, 403, { error: 'origin not allowed' });
  if (new URL(req.url).pathname.split('/').filter(Boolean).pop() !== 'summary') {
    return json(req, 404, { error: 'unknown route' });
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.length > 2_000) return json(req, 413, { error: 'payload too large' });
    body = text ? JSON.parse(text) : {};
  } catch {
    return json(req, 400, { error: 'invalid json' });
  }

  try {
    if (typeof body.partner_token === 'string' && body.partner_token) {
      const label = await matchPartner(body.partner_token);
      if (!label) return json(req, 403, { error: 'this link is not active, ask Corey for a new one' });
      console.log('metrics partner view', label);
      return json(req, 200, redactForPartner(await collect(new Date())));
    }

    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false },
    });
    const { data, error } = await db.auth.getUser(token);
    const email = (data?.user?.email ?? '').toLowerCase();
    if (error || !email) return json(req, 401, { error: 'sign in to see the dashboard' });
    if (!adminEmails().includes(email)) return json(req, 403, { error: 'this account does not have dashboard access' });
    return json(req, 200, await collect(new Date()));
  } catch (err) {
    console.error('metrics error', (err as Error).message);
    return json(req, 500, { error: 'the dashboard could not load, try again in a minute' });
  }
});
