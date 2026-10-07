// Intake Edge Function for talewatersandtides.com.
//
//   POST /functions/v1/intake/scan  { url }        -> { domain, facts, signals, source }
//   POST /functions/v1/intake/lead  { source, ... } -> { id }
//
// Called from the static site with the project's public anon key (verify_jwt on).
// Writes go through the service role; the tables have RLS on and no policies.
//
// Secrets (supabase secrets set ...):
//   ANTHROPIC_API_KEY   required for the Claude scan; without it /scan uses a keyword heuristic
//   SCAN_MODEL          optional override, default claude-opus-5-5
//   ALLOWED_ORIGINS     optional comma list, defaults to talewatersandtides.com + localhost:8080
//   IP_HASH_SALT        optional salt for hashed client IPs
//   RESEND_API_KEY, LEAD_NOTIFY_EMAIL, LEAD_FROM_EMAIL   optional new-lead email alert

import { adminClient, corsHeaders, ipHash, json, originAllowed, rateLimit, str } from './http.ts';
import { publicScan, scanSite } from './scan.ts';
import { buildLead, LeadError, saveLead } from './lead.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method not allowed' });
  if (!originAllowed(req)) return json(req, 403, { error: 'origin not allowed' });

  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop();
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 20_000) return json(req, 413, { error: 'payload too large' });
    body = JSON.parse(text);
  } catch {
    return json(req, 400, { error: 'invalid json' });
  }

  const db = adminClient();
  const hash = await ipHash(req);

  try {
    if (route === 'scan') {
      const url = str(body.url, 255);
      if (!url) return json(req, 400, { error: 'url is required' });
      if (!(await rateLimit(db, 'scan', hash, 10, 400))) {
        return json(req, 429, { error: 'scan limit reached, fill the basics by hand' });
      }
      try {
        return json(req, 200, publicScan(await scanSite(db, url)));
      } catch (err) {
        return json(req, 400, { error: (err as Error).message });
      }
    }

    if (route === 'lead') {
      let lead;
      try {
        lead = buildLead(body, { ipHash: hash, userAgent: req.headers.get('user-agent') ?? '' });
      } catch (err) {
        if (err instanceof LeadError && err.message === 'spam') return json(req, 200, { id: null });
        if (err instanceof LeadError) return json(req, 400, { error: err.message });
        throw err;
      }
      if (!(await rateLimit(db, 'lead', hash, 6, 500))) {
        return json(req, 429, { error: 'too many submissions, email corey@talewatersandtides.com' });
      }
      return json(req, 200, { id: await saveLead(db, lead) });
    }

    return json(req, 404, { error: 'unknown route' });
  } catch (err) {
    console.error('intake error', (err as Error).message);
    return json(req, 500, { error: 'something went wrong, email corey@talewatersandtides.com' });
  }
});
