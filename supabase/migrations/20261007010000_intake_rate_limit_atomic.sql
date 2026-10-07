-- Atomic rate limit for the intake function (review finding on PR #77).
--
-- The function previously counted intake_events and inserted in separate
-- PostgREST calls, so a parallel burst could all read the same count and pass.
-- This does count + check + insert in one transaction under an advisory lock
-- per kind. Callable by the service role only.
--
-- Applied to project feldynpqhzvstpssztra on 2026-10-07.

create or replace function public.intake_rate_limit(p_kind text, p_ip_hash text, p_per_ip int, p_global int)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  mine int;
  total int;
begin
  perform pg_advisory_xact_lock(hashtext('intake_rate_limit:' || p_kind));
  select count(*) into mine from public.intake_events
    where kind = p_kind and ip_hash = p_ip_hash and created_at >= now() - interval '1 hour';
  select count(*) into total from public.intake_events
    where kind = p_kind and created_at >= now() - interval '1 day';
  if mine >= p_per_ip or total >= p_global then
    return false;
  end if;
  insert into public.intake_events (kind, ip_hash) values (p_kind, p_ip_hash);
  return true;
end;
$$;

revoke all on function public.intake_rate_limit(text, text, int, int) from public, anon, authenticated;
grant execute on function public.intake_rate_limit(text, text, int, int) to service_role;
