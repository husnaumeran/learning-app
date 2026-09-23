-- =====================================================================
-- Migration 20260914_01 — security hardening
-- =====================================================================
-- Status:  NOT YET APPLIED. Review, then run once in the Supabase SQL
--          editor for the production project (qwcigjclpxnwtfjhjqgr).
--          Apply when no one is mid-session.
--
-- The whole script runs in one transaction and verifies its own result
-- at the end. If anything is not exactly as expected it raises, and
-- nothing is changed. Running it a second time is harmless.
--
-- ---------------------------------------------------------------------
-- WHAT THIS FIXES — each verified against the live database, 2026-09-14
-- ---------------------------------------------------------------------
--
-- 1. Signed-out callers could get past the ownership checks.
--
--    record_response, finalize_session and get_daily_status are
--    SECURITY DEFINER, so they bypass row-level security, and all three
--    were executable by the `anon` role. Each guards ownership with:
--
--        if v_parent_id <> auth.uid() then raise ...
--
--    For a signed-out caller auth.uid() is NULL, so the comparison is
--    NULL, and IF NULL does not raise: the guard silently passes.
--    get_daily_status also returns active_session_id, which is exactly
--    the input the other two need. (Supabase advisor lint 0028.)
--
--    Fixed two independent ways:
--      a) The checks become NULL-safe, so they are correct on their own.
--      b) EXECUTE is revoked from `anon` and from `public`. Revoking
--         `anon` alone would not work: Postgres grants EXECUTE on new
--         functions to PUBLIC by default, and anon inherits it.
--
-- 2. Two trigger functions had a mutable search_path. (Lint 0011.)
--
-- ---------------------------------------------------------------------
-- DELIBERATELY NOT CHANGED
-- ---------------------------------------------------------------------
--
-- - parent_of_child. Also anon-executable, but every RLS policy calls
--   it, so revoking it would make signed-out table reads error instead
--   of returning no rows. It only maps a child id to a parent id. It
--   needs its own tested change.
-- - The `authenticated` grants on these functions (lint 0029). Those are
--   intentional: the app calls these functions while signed in.
--   Revoking them would break the app.
--
-- ---------------------------------------------------------------------
-- WHY THIS IS SAFE FOR THE APP
-- ---------------------------------------------------------------------
--
-- - The client only calls these functions while signed in, and never
--   calls get_daily_status at all.
-- - For a signed-in parent acting on their own child, the new checks
--   behave exactly like the old ones.
-- - .github/workflows/keepalive.yml reads /rest/v1/children with the
--   anon key. That is a table read, not a function call, so it is
--   unaffected.
--
-- MANUAL STEP (dashboard, not SQL): turn on leaked password protection
-- under Authentication > Password security.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1a. NULL-safe ownership checks, patched in place
-- ---------------------------------------------------------------------
-- Each function's live definition is read back, the one flawed line is
-- replaced, and the result is re-executed. Nothing is retyped, so every
-- other line of each function is guaranteed unchanged. If a target line
-- is not found exactly once, the migration aborts.

do $patch$
declare
  r record;
  v_def text;
  v_count int;
begin
  for r in
    select * from (values
      ('public.finalize_session(uuid)',
       'if v_parent_id <> auth.uid() then',
       'if auth.uid() is null or v_parent_id is distinct from auth.uid() then'),
      ('public.get_daily_status(uuid)',
       'if v_parent_id <> auth.uid() then',
       'if auth.uid() is null or v_parent_id is distinct from auth.uid() then'),
      ('public.record_response(uuid, uuid, text, jsonb, text, integer, text, integer, jsonb, text, text, integer, boolean, boolean, boolean, integer, text, timestamptz)',
       'if v_parent_id <> auth.uid() then',
       'if auth.uid() is null or v_parent_id is distinct from auth.uid() then'),
      ('public.record_response(uuid, uuid, text, jsonb, text, integer, text, integer, jsonb, text, text, integer, boolean, boolean, boolean, integer, text, timestamptz)',
       'if v_session_child <> p_child_id then',
       'if v_session_child is distinct from p_child_id then')
    ) as t(fn, old_text, new_text)
  loop
    v_def := pg_get_functiondef(r.fn::regprocedure);
    v_count := (length(v_def) - length(replace(v_def, r.old_text, ''))) / length(r.old_text);

    if v_count = 0 and strpos(v_def, r.new_text) > 0 then
      raise notice 'Already patched, skipping: % in %', r.old_text, r.fn;
      continue;
    end if;

    if v_count is distinct from 1 then
      raise exception 'Aborted: expected "%" exactly once in %, found % times',
        r.old_text, r.fn, v_count;
    end if;

    execute replace(v_def, r.old_text, r.new_text);
  end loop;
end
$patch$;

-- ---------------------------------------------------------------------
-- 1b. Remove signed-out access to the three functions
-- ---------------------------------------------------------------------

revoke execute on function public.finalize_session(uuid) from public, anon;
revoke execute on function public.get_daily_status(uuid) from public, anon;
revoke execute on function public.record_response(uuid, uuid, text, jsonb, text, integer, text, integer, jsonb, text, text, integer, boolean, boolean, boolean, integer, text, timestamptz) from public, anon;

-- The app calls these two while signed in. Grant explicitly so they no
-- longer depend on the PUBLIC grant removed above.
grant execute on function public.finalize_session(uuid) to authenticated;
grant execute on function public.record_response(uuid, uuid, text, jsonb, text, integer, text, integer, jsonb, text, text, integer, boolean, boolean, boolean, integer, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Pin search_path on the trigger functions
-- ---------------------------------------------------------------------
-- `public`, not '': validate_response_session_child refers to `sessions`
-- without a schema prefix and would fail under an empty search_path.

alter function public.update_updated_at() set search_path = public;
alter function public.validate_response_session_child() set search_path = public;

-- ---------------------------------------------------------------------
-- 3. Verify. Any failure raises and rolls back everything above.
-- ---------------------------------------------------------------------

do $verify$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as fn, pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('finalize_session', 'record_response', 'get_daily_status')
  loop
    if has_function_privilege('anon', r.fn, 'execute') then
      raise exception 'Verification failed: anon can still execute %', r.fn;
    end if;
    if strpos(r.def, 'if v_parent_id <> auth.uid() then') > 0
       or strpos(r.def, 'if v_session_child <> p_child_id then') > 0 then
      raise exception 'Verification failed: an unsafe comparison remains in %', r.fn;
    end if;
  end loop;

  if not has_function_privilege('authenticated', 'public.finalize_session(uuid)'::regprocedure, 'execute')
     or not has_function_privilege('authenticated', 'public.record_response(uuid, uuid, text, jsonb, text, integer, text, integer, jsonb, text, text, integer, boolean, boolean, boolean, integer, text, timestamptz)'::regprocedure, 'execute') then
    raise exception 'Verification failed: signed-in users lost access to a function the app needs';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('update_updated_at', 'validate_response_session_child')
      and not coalesce('search_path=public' = any(p.proconfig), false)
  ) then
    raise exception 'Verification failed: search_path is not pinned on a trigger function';
  end if;

  raise notice 'Security hardening applied and verified.';
end
$verify$;

commit;

-- =====================================================================
-- EMERGENCY ROLLBACK
-- =====================================================================
-- If signed-in use of the app breaks after applying this, restore access
-- with the statements below. They reopen the security hole, so treat
-- them as temporary and investigate before re-applying.
--
-- The NULL-safe checks and search_path settings are intentionally not
-- reversed: for signed-in parents they behave identically to before, and
-- undoing them would only reintroduce the flaw.
--
--   grant execute on function public.finalize_session(uuid) to public, anon;
--   grant execute on function public.get_daily_status(uuid) to public, anon;
--   grant execute on function public.record_response(uuid, uuid, text, jsonb, text, integer, text, integer, jsonb, text, text, integer, boolean, boolean, boolean, integer, text, timestamptz) to public, anon;
-- =====================================================================
