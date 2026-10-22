-- Review and convert for website leads: the /admin/leads/ inbox.
--
-- Adds working notes and a send-to-Pocket-Fishing-Guide marker to public.leads, and a
-- history table so the inbox can show who changed what and how fast leads were worked.
-- Written only by the `leads` Edge Function with the service role, after it checks the
-- signed-in admin's email. RLS is on with no policies and anon/authenticated privileges
-- are revoked, exactly like the intake tables.
--
-- Not applied yet. Apply with the Supabase MCP or `supabase db push` before deploying
-- the `leads` function.

alter table public.leads
  add column if not exists notes          text check (char_length(notes) <= 8000),
  add column if not exists updated_at     timestamptz,
  add column if not exists sent_to_pfg_at timestamptz,
  add column if not exists pfg_lead_id    uuid;

create table if not exists public.lead_events (
  id          bigint generated always as identity primary key,
  lead_id     uuid not null references public.leads (id) on delete cascade,
  created_at  timestamptz not null default now(),
  actor       text not null check (char_length(actor) <= 254),
  kind        text not null check (kind in ('status', 'note', 'sent_to_pfg')),
  from_status text check (from_status in ('new', 'contacted', 'qualified', 'won', 'lost', 'spam')),
  to_status   text check (to_status in ('new', 'contacted', 'qualified', 'won', 'lost', 'spam')),
  note        text check (char_length(note) <= 2000)
);

create index if not exists lead_events_lead_idx on public.lead_events (lead_id, created_at);

alter table public.lead_events enable row level security;
revoke all on public.lead_events from anon, authenticated;
