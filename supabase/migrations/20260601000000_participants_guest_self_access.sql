-- First Contact — guest self-service registration management
--
-- Lets a guest who has proven ownership of their email via magic-link OTP
-- (Postgres role `authenticated`) read, update, and create ONLY their own
-- `participants` row, matched on the verified email claim. This backs the
-- cross-device "manage your registration" flow on /first-contact/dashboard/.
--
-- These are additive PERMISSIVE policies. The existing anon check-in
-- ("anon insert participants") and facilitator read ("facilitator reads
-- participants") policies are intentionally left untouched and OR alongside
-- these. Matching uses lower(email) = lower(auth.jwt() ->> 'email') so the
-- WITH CHECK on UPDATE/INSERT also prevents reassigning a row to another email.
--
-- Applied to project feldynpqhzvstpssztra on 2026-06-01.

drop policy if exists "auth reads own participant" on public.participants;
create policy "auth reads own participant"
  on public.participants for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "auth updates own participant" on public.participants;
create policy "auth updates own participant"
  on public.participants for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'))
  with check (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "auth inserts own participant" on public.participants;
create policy "auth inserts own participant"
  on public.participants for insert to authenticated
  with check (lower(email) = lower(auth.jwt() ->> 'email'));
