-- Migration: dashboard_sections
--
-- Stores the gated intelligence dashboard's INTERNAL tab content (Self-Assessment,
-- Game Plan) OUT of the static page, so the sensitive HTML is never shipped in the
-- GitHub Pages source (the deploy uploads the whole repo). Rows are readable ONLY by
-- allowlisted team members via RLS; the client fetches and renders them after an
-- authorized magic-link sign-in. The html column holds gzip+base64-encoded markup
-- (opaque at rest) and is seeded out-of-band (service/MCP) — NOT committed to the repo.
--
-- Same team allowlist as public.is_facilitator() (20260602000000_facilitator_delete_functions.sql),
-- but INLINED in the policy: is_facilitator() has EXECUTE revoked from `authenticated`, so calling it
-- inside an RLS policy fails for the very users it should allow. The participants policies inline the
-- email check the same way — we follow that convention here.
--
-- Applied to project feldynpqhzvstpssztra.

create table if not exists public.dashboard_sections (
  key        text primary key,
  html       text not null,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_sections enable row level security;

-- Only the TWT team (same allowlist as is_facilitator()) may read these rows.
drop policy if exists "team reads dashboard sections" on public.dashboard_sections;
create policy "team reads dashboard sections"
  on public.dashboard_sections for select to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) in ('cboelkens@gmail.com', 'corey@talewatersandtides.com')
  );

-- No insert/update/delete policies: content is managed out-of-band (service role / MCP),
-- and RLS default-deny blocks anon and non-allowlisted authenticated users.
