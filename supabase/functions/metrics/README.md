# metrics — progress dashboard data

Supabase Edge Function behind `/admin/metrics/` and `/partners/progress/`.
Project: `feldynpqhzvstpssztra` (talewatersandtides-events). Design and rollout: [`docs/METRICS-DASHBOARD.md`](../../../docs/METRICS-DASHBOARD.md).

---

## Route

| Call | Auth | Returns |
|------|------|---------|
| `POST /functions/v1/metrics/summary` with `{}` | Signed-in user's access token; email must be in `METRICS_ADMIN_EMAILS` | Admin payload: both businesses, lead pipeline included |
| `POST /functions/v1/metrics/summary` with `{ "partner_token": "..." }` | Public anon key plus a share token whose SHA-256 is in `PARTNER_TOKENS_SHA256` | Partner payload: trends and totals, no lead counts, no pipeline, no source notes |

Every response is aggregates. Lead rows are reduced to date, form, status, page and source inside the function and never returned. Results are cached in memory for 10 minutes.

## Sources

Each source is independent. Without its secrets it reports `not_connected` and the dashboard says so in plain words.

| Source key | Data | Secrets |
|------------|------|---------|
| `twt_leads` | TWT leads by week, page, channel, status | none (service role, same project) |
| `pfg_web` | PFG visitors and pageviews by week, referrers (Vercel Web Analytics) | `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PFG_PROJECT_ID` |
| `pfg_app` | PFG accounts, active anglers, signups by week, trip requests, published partners | `PFG_METRICS_URL`, `PFG_METRICS_TOKEN` |
| `google` | TWT sessions by week and channel (GA4 Data API) | `GOOGLE_SERVICE_ACCOUNT_JSON`, `GA4_PROPERTY_ID_TWT` |
| `search` | Search Console clicks and impressions by day, both sites | `GOOGLE_SERVICE_ACCOUNT_JSON`, `GSC_SITES` |

### PFG endpoint contract (`pfg_app`)

PFG serves this from its own app so PFG database keys never leave PFG. Demo accounts excluded, aggregates only. The numbers below are examples.

```http
GET {PFG_METRICS_URL}
Authorization: Bearer {PFG_METRICS_TOKEN}

200 application/json
{
  "users_total": 120, "new_30d": 30, "active_7d": 25, "active_30d": 48,
  "signups_weekly": [{ "week": "2026-10-12", "n": 9 }],
  "trips_real": 6, "trips_confirmed": 0, "partners_published": 5
}
```

## Secrets

```bash
supabase secrets set --project-ref feldynpqhzvstpssztra \
  VERCEL_TOKEN=... VERCEL_TEAM_ID=team_... VERCEL_PFG_PROJECT_ID=prj_... \
  PFG_METRICS_URL=https://pocketfishinguide.com/api/metrics/summary PFG_METRICS_TOKEN=... \
  GOOGLE_SERVICE_ACCOUNT_JSON="$(cat sa.json)" GA4_PROPERTY_ID_TWT=123456789 \
  GSC_SITES="twt=sc-domain:talewatersandtides.com,pfg=sc-domain:pocketfishinguide.com" \
  PARTNER_TOKENS_SHA256="river-co:<sha256 of the token>"
```

Make a partner token and its hash:

```bash
token=$(openssl rand -base64 33 | tr '+/' '-_' | tr -d '=')
printf '%s' "$token" | sha256sum   # store label:hash in PARTNER_TOKENS_SHA256
echo "https://talewatersandtides.com/partners/progress/#t=$token"   # send this link
```

Remove the label from `PARTNER_TOKENS_SHA256` to switch a link off.

## Develop and deploy

```bash
cd supabase/functions/metrics
deno lint && deno check index.ts && deno test --no-check=remote --allow-env metrics_test.ts
deno run fixture.ts > ../../../admin/metrics/sample.json   # refresh the sample after a payload change
supabase functions deploy metrics --project-ref feldynpqhzvstpssztra
```

CI runs the same checks in `.github/workflows/metrics-function.yml`.
