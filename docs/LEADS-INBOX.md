# LEADS INBOX

A private inbox in the site's admin for every website lead: review it, work it, and send fishing businesses on to Pocket Fishing Guide's partner Leads.

| | |
|---|---|
| Page | `/admin/leads/` (magic-link sign-in, allowlisted emails) |
| Data service | Supabase Edge Function `leads` ([README](../supabase/functions/leads/README.md)) |
| Sample view | `/admin/leads/#demo` (made-up people, nothing saved) |
| Status | Branch `feat/leads-inbox`. Not deployed; migration not applied; secrets not set. |

---

## Why

Website forms save to the `leads` table and nowhere else. There was no screen to read them, the email alert never fired, and the only "convert" flow (PFG partner Leads) is built for fishing businesses becoming listings, not consulting asks or anglers asking about a trip.

## The flow

| Step | Where | What happens |
|------|-------|--------------|
| 1. Lead arrives | Site form to `intake` | Row in `leads`, status `new`. Alert email to Corey with a "Review it" link to the lead. |
| 2. Review | `/admin/leads/#lead-<id>` | Everything they told us, in one card. Reply by email from the card. |
| 3. Work it | Same card | Move to contacted, qualified, won, lost or spam, with a note. Each move is logged. |
| 4. Convert (fishing businesses) | Same card | Send to PFG partner Leads: pick the business name and kind. The lead moves to qualified. |
| 5. Finish in PFG | `pocketfishinguide.com/admin/partners/leads?source=twt:website` | Convert to draft listing, as with any partner lead. |

Statuses are the ones the table already had: `new`, `contacted`, `qualified`, `won`, `lost`, `spam`. Spam stays in the table and is left out of every number.

## What the page shows

- Story lines first: leads in the last 4 weeks against the 4 before, which form brings the most, who has waited over a day, median time to first contact, how many reached qualified and won.
- KPI tiles: new and waiting, open, median first contact, won and lost.
- Funnel: came in, reviewed, contacted, qualified, won. A lead counts at every stage it reached, even if it was later lost, and each step shows its share of the one before.
- Leads per week for 12 weeks, stacked by form. The current week is faded.
- Inbox: status chips with counts (Open by default), a form filter and search.

Every chart has a table view.

## Privacy

- Only allowlisted admins can call the function; the tables are service-role only.
- Browser and network details (`user_agent`, `ip_hash`) are never read by the function.
- Lead text is rendered with `textContent` only.
- The public repo holds only made-up sample data (`admin/leads/sample.json`, from `fixture.ts`; a test checks it uses example.com addresses).

## Go-live checklist

| # | Step | Who |
|---|------|-----|
| 1 | Merge the PR | Corey |
| 2 | Apply `20261022000000_leads_review.sql` to the TWT project | Corey, or Claude on his yes |
| 3 | Deploy `leads`; redeploy `intake` (alert link) | Corey, or Claude on his yes |
| 4 | Set `RESEND_API_KEY` and `LEAD_NOTIFY_EMAIL` on the TWT project (alerts) | Corey |
| 5 | Set `PFG_SUPABASE_URL` and `PFG_SUPABASE_ANON_KEY` (send to PFG) | Corey |
| 6 | Make sure `https://talewatersandtides.com/admin/leads/` is an allowed redirect URL in Supabase Auth | Corey |
| 7 | Send one test through the contact form, open the alert link, mark it spam | Corey |
