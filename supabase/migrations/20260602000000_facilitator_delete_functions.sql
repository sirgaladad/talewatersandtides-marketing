-- Migration: facilitator_delete_functions
--
-- Gives allowlisted facilitators the ability to:
--   (1) delete a single participant and ALL of their tied data, FK-safe & atomic;
--   (2) wipe all data rows for a given event_slug ("clear all test data").
--
-- Deletes flow ONLY through these SECURITY DEFINER functions. No table-level
-- DELETE policies are added, so the anon participant page gains zero delete
-- capability (EXECUTE is revoked from anon/public below).
--
-- FK notes that drive the delete ordering:
--   feedback.participant_id  -> participants.id   ON DELETE NO ACTION (delete first)
--   prompts.participant_id   -> participants.id   ON DELETE NO ACTION (delete first)
--   votes.problem_id         -> problems.id       ON DELETE CASCADE
--   solution_votes.solution_id -> solutions.id    ON DELETE CASCADE
--   solutions.problem_id     -> problems.id       ON DELETE SET NULL
--   votes/solutions/solution_votes/results/reflections carry participant_id with NO FK.

-- ---- helper: allowlist guard -------------------------------------------------
create or replace function public.is_facilitator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') in (
      'cboelkens@gmail.com',
      'corey@talewatersandtides.com'
    ),
    false
  );
$$;

-- ---- delete one participant + everything tied to them ------------------------
create or replace function public.delete_participant(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_facilitator() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_id is null then
    raise exception 'invalid participant id' using errcode = '22000';
  end if;

  -- NO ACTION FKs first: feedback & prompts reference participants.id
  delete from public.feedback        where participant_id = p_id;
  delete from public.prompts         where participant_id = p_id;

  -- This participant's own votes & solution_votes (leaf rows)
  delete from public.solution_votes  where participant_id = p_id;
  delete from public.votes           where participant_id = p_id;

  -- Solutions authored by this participant.
  -- solution_votes -> solutions is ON DELETE CASCADE, so votes by *other* people
  -- on this participant's solutions are removed automatically here.
  delete from public.solutions       where participant_id = p_id;

  -- Problems authored by this participant.
  --   votes     -> problems  ON DELETE CASCADE  (other people's votes go too)
  --   solutions -> problems  ON DELETE SET NULL (other people's solutions kept,
  --                                              problem_id nulled)
  delete from public.problems        where participant_id = p_id;

  -- Other tied leaf data
  delete from public.results         where participant_id = p_id;
  delete from public.reflections     where participant_id = p_id;

  -- Finally the participant row itself (feedback/prompts already gone)
  delete from public.participants    where id = p_id;
end;
$$;

-- ---- clear all data for an event --------------------------------------------
create or replace function public.reset_event_data(p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_facilitator() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_slug is null or trim(p_slug) = '' then
    raise exception 'invalid event slug' using errcode = '22000';
  end if;

  -- Order respects every FK; children before parents.
  delete from public.solution_votes where event_slug = p_slug;
  delete from public.votes          where event_slug = p_slug;
  delete from public.feedback       where event_slug = p_slug;
  delete from public.prompts        where event_slug = p_slug;
  delete from public.solutions      where event_slug = p_slug;
  delete from public.problems       where event_slug = p_slug;
  delete from public.results        where event_slug = p_slug;
  delete from public.reflections    where event_slug = p_slug;
  delete from public.subscribers    where event_slug = p_slug;
  delete from public.participants   where event_slug = p_slug;

  -- session_state: reset the live phase to a clean start rather than deleting
  -- the row, so the participant page always reads a valid state.
  update public.session_state
     set phase = 'welcome', hmw_text = null, updated_at = now()
   where event_slug = p_slug;
end;
$$;

-- ---- grants: only authenticated may execute; never anon/public --------------
revoke all on function public.is_facilitator()            from public, anon, authenticated;
revoke all on function public.delete_participant(uuid)    from public, anon;
revoke all on function public.reset_event_data(text)      from public, anon;

grant execute on function public.delete_participant(uuid) to authenticated;
grant execute on function public.reset_event_data(text)   to authenticated;
-- is_facilitator is only called internally by the two definer functions, so it
-- needs no direct grant; it stays revoked above.
