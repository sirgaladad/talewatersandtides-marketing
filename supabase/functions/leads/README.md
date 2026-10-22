# leads — review and convert website leads

Supabase Edge Function behind `/admin/leads/`, the private inbox for leads from the readiness check, the home contact form and the guide-trip interest form.
Project: `feldynpqhzvstpssztra` (talewatersandtides-events). Design notes: [docs/LEADS-INBOX.md](../../../docs/LEADS-INBOX.md).

---

## Routes

| Route | Body | Returns |
|-------|------|---------|
| `POST /functions/v1/leads/list` | `{}` | `{ summary, leads, pfg_connected }`: up to 500 leads, newest first, each with its history |
| `POST /functions/v1/leads/update` | `{ id, status?, note? }` | `{ lead }`; a status change and a note can go in one call |
| `POST /functions/v1/leads/send-to-pfg` | `{ id, business, kind, note? }` | `{ lead, pfg_lead_id }`; once per lead |

Every call needs the signed-in admin's access token as `Authorization: Bearer`. The email on the token must be on the allowlist, or the call gets 403. `user_agent` and `ip_hash` are never read.

`kind` is one of PFG's partner kinds: `guide`, `outfitter`, `tackle`, `lodging`, `marina`, `dealer`.

## What send-to-pfg does

1. Inserts one row into PFG's `partner_leads` with the PFG anon key (that table takes anon inserts, the same path as the `/partners` apply form): source `twt:website`, the business name and kind you picked, the lead's email, a note that says where it came from and what they asked, and `payload.twt_lead_id`.
2. Marks the TWT lead `sent_to_pfg_at` and `pfg_lead_id`, moves a new or contacted lead to qualified, and logs a `sent_to_pfg` event.
3. In PFG, the lead shows on `/admin/partners/leads?source=twt:website`, ready for Convert to draft.

If the PFG insert fails, nothing changes on the TWT side and the page says to try again.

## Data

| Table | Change |
|-------|--------|
| `leads` | adds `notes`, `updated_at`, `sent_to_pfg_at`, `pfg_lead_id` |
| `lead_events` | new: one row per status change, note or send, with the admin's email |

Migration: `supabase/migrations/20261022000000_leads_review.sql`. RLS on, no policies, anon and authenticated revoked.

## Secrets

```bash
supabase secrets set PFG_SUPABASE_URL=https://wokyutorqkhoqocglnte.supabase.co PFG_SUPABASE_ANON_KEY=...   # for send-to-pfg
supabase secrets set LEADS_ADMIN_EMAILS=...       # optional; falls back to METRICS_ADMIN_EMAILS, then the facilitator pair
supabase secrets set ALLOWED_ORIGINS=...          # optional, same default as intake
```

Without the two PFG values the inbox still works; the send button is off and says why.

## Develop and deploy

```bash
cd supabase/functions/leads
deno lint && deno check index.ts fixture.ts && deno test --no-check=remote --allow-env leads_test.ts
deno run fixture.ts > ../../../admin/leads/sample.json   # after changing the summary or the fixture
supabase functions deploy leads --project-ref feldynpqhzvstpssztra
```

CI runs the same checks in `.github/workflows/leads-function.yml`.
