-- First Contact — guest self-service: remove (unregister) own registration
--
-- Completes the guest self-service set from 20260601000000 by letting an
-- authenticated guest DELETE ONLY their own `participants` row, matched on the
-- verified magic-link email claim. This backs "Remove my registration" on
-- /first-contact/dashboard/.
--
-- Additive PERMISSIVE policy; the anon check-in ("anon insert participants")
-- and facilitator read ("facilitator reads participants") policies are left
-- untouched and OR alongside this. Matching mirrors the SELECT/UPDATE policies:
-- lower(email) = lower(auth.jwt() ->> 'email').
--
-- Applied to project feldynpqhzvstpssztra on 2026-06-01.

drop policy if exists "auth deletes own participant" on public.participants;
create policy "auth deletes own participant"
  on public.participants for delete to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));
