-- Lead intake for the services site: the /readiness/ check and the home contact form.
--
-- All three tables are written ONLY by the `lead-intake` and `site-scan` Edge
-- Functions using the service role. RLS is enabled with no policies, and
-- anon/authenticated privileges are revoked, so the public anon key embedded in
-- the site cannot read or write them directly. Validation lives both here
-- (CHECK constraints) and in the functions.
--
-- Applied to project feldynpqhzvstpssztra on 2026-10-07.

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  source        text not null check (source in ('contact', 'readiness')),
  status        text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost', 'spam')),
  name          text not null check (char_length(name) between 2 and 120),
  email         text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role          text check (char_length(role) <= 40),
  company       text check (char_length(company) <= 160),
  looking_for   text check (char_length(looking_for) <= 80),
  message       text check (char_length(message) <= 4000),
  website       text check (char_length(website) <= 255),
  facts         jsonb not null default '{}'::jsonb,
  tools         text[] not null default '{}',
  tools_other   text check (char_length(tools_other) <= 400),
  stack_maturity text check (char_length(stack_maturity) <= 20),
  hurts         text[] not null default '{}',
  impacts       text[] not null default '{}',
  pain_note     text check (char_length(pain_note) <= 1000),
  ai_today      text check (char_length(ai_today) <= 60),
  score         smallint check (score between 0 and 100),
  stage         text check (char_length(stage) <= 20),
  fit           text check (char_length(fit) <= 40),
  kickoff       date,
  slot          text check (char_length(slot) <= 40),
  scan          jsonb,
  page          text check (char_length(page) <= 255),
  utm           jsonb not null default '{}'::jsonb,
  user_agent    text check (char_length(user_agent) <= 400),
  ip_hash       text check (char_length(ip_hash) <= 64)
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_email_idx on public.leads (lower(email));

-- Rate-limit ledger shared by both functions. Rows older than a day are pruned
-- opportunistically by the functions.
create table if not exists public.intake_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind       text not null check (kind in ('scan', 'lead')),
  ip_hash    text not null check (char_length(ip_hash) <= 64)
);

create index if not exists intake_events_kind_time_idx on public.intake_events (kind, created_at desc);
create index if not exists intake_events_ip_idx on public.intake_events (ip_hash, kind, created_at desc);

-- Per-domain cache of site-scan results, so repeat scans cost nothing.
create table if not exists public.site_scans (
  domain     text primary key check (char_length(domain) <= 255),
  created_at timestamptz not null default now(),
  result     jsonb not null
);

alter table public.leads enable row level security;
alter table public.intake_events enable row level security;
alter table public.site_scans enable row level security;

revoke all on public.leads, public.intake_events, public.site_scans from anon, authenticated;
