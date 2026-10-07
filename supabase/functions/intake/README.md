# intake — lead capture and site scan

Supabase Edge Function behind the `/readiness/` check and the home contact form.
Project: `feldynpqhzvstpssztra` (talewatersandtides-events).

---

## Routes

| Route | Body | Returns | Limits |
|-------|------|---------|--------|
| `POST /functions/v1/intake/scan` | `{ url }` | `{ domain, facts, summary, signals, source }` | 10 per IP per hour, 400 per day, 7-day cache per domain |
| `POST /functions/v1/intake/lead` | lead fields, `source: contact \| readiness` | `{ id }` | 6 per IP per hour, 500 per day |

Both require the public anon key as `Authorization: Bearer` and `apikey` (verify_jwt is on) and an allowed `Origin`.

## How the scan works

1. The URL is normalised and checked: public domain only, no IP literals, private hostnames, credentials or odd ports. DNS results are checked for private ranges, and every redirect hop is re-validated (SSRF guard).
2. The homepage is fetched (8 s timeout, 400 KB cap) and reduced to title, description and visible text.
3. Third-party signals are detected deterministically: booking tools (Vagaro, Calendly, Jobber...), CRM and email scripts (HubSpot, Mailchimp...), and review profiles.
4. With `ANTHROPIC_API_KEY` set, Claude classifies the business into the exact option sets the form chips use (JSON-schema structured output, low effort, server-side refusal fallback). Without the key, or on any model error, a keyword heuristic answers instead, and the response says `source: heuristic`.
5. The visitor corrects the chips; the scan never blocks the form.

Page content is treated as untrusted data in the prompt, and the output is constrained to enums, so injected text cannot widen what the scan returns.

## Data

| Table | Written by | Purpose |
|-------|-----------|---------|
| `leads` | `/lead` | One row per submission. `status` defaults to `new` for triage. |
| `intake_events` | both | Rate-limit ledger (hashed IP, kind, time). Pruned after a day. |
| `site_scans` | `/scan` | Cached scan result per domain. |

RLS is enabled with no policies and anon/authenticated privileges are revoked: only the service role (this function) touches these tables. Read leads in the Supabase dashboard or with SQL.

## Secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=...            # enables the Claude scan
supabase secrets set LEAD_NOTIFY_EMAIL=corey@talewatersandtides.com RESEND_API_KEY=...   # optional email alert
supabase secrets set ALLOWED_ORIGINS=https://talewatersandtides.com,https://www.talewatersandtides.com   # optional
supabase secrets set IP_HASH_SALT=...                 # optional
```

`SCAN_MODEL` overrides the default model (`claude-opus-5-5`).

## Develop and deploy

```bash
cd supabase/functions/intake
deno lint && deno check index.ts && deno test --no-check=remote intake_test.ts
supabase functions deploy intake --project-ref feldynpqhzvstpssztra
```

CI runs the same checks in `.github/workflows/intake-function.yml`.
