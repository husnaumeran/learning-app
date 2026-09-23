-- =====================================================================
-- Migration 20260914_02 — unified mastery engine
-- =====================================================================
-- Status:  NOT YET APPLIED. Apply AFTER 20260914_01_security_hardening.sql
--          (this script checks and refuses otherwise). Then push the
--          client release built against docs/MASTERY.md.
--          Apply when no one is mid-session.
--
-- Design:  docs/MASTERY.md is the contract. It records the owner's
--          decisions (2026-09-14) and the data behind them.
--
-- One transaction. It verifies itself at the end — including a runtime
-- probe that calls the new functions as a real parent and rolls the
-- probe back — and if anything is wrong it raises and changes nothing.
-- Safe to run twice.
--
-- ---------------------------------------------------------------------
-- WHAT IT DOES
-- ---------------------------------------------------------------------
--
-- 1. skills: adds mastery_type ('mastery' | 'qaida' | 'practice' |
--    'adaptive') plus per-skill thresholds (mastery_questions,
--    mastery_days, mastery_accuracy). The owner can tune thresholds per
--    skill in the Supabase table editor.
--
-- 2. responses.is_passive: marks rows that are not real answers — tracing,
--    videos, book pages (recorded with correct_answer 'seen'), the
--    numbers_all listen-and-tap, and the find_pairs memory game. A trigger
--    sets it on insert, so clients never pass it. History is backfilled.
--    Weekend-challenge find_pairs rows are real answers and are NOT marked:
--    the memory game is recognised by its `total_pairs` key.
--
-- 3. The engine, as small functions so every caller uses one definition
--    of the rules:
--      mastery_evidence       the evidence for a child/skill/level
--      is_level_mastered      the owner's rules applied to that evidence
--      levels_needing_review  earlier levels failing weekend review
--      evaluate_skill_mastery one unlock step (at most one level)
--    New client RPCs: get_skill_progress, raise_skill_level,
--    evaluate_skill_mastery.
--
-- 4. finalize_session: rewritten to run the unlock step for every leveled
--    skill practised in the session. Its return shape is unchanged apart
--    from a new `levels_unlocked` key, so the current client keeps
--    working. Slices are now first-try and exclude passive and review
--    answers, so adjustFocusNumbers is never fed easy review questions.
--
-- 5. child_skill_progress becomes the single source of truth for
--    mastery/qaida levels. Every child gets a row per leveled skill, set
--    to the highest level known: greatest(existing, content_level).
--    NO LEVEL IS EVER LOWERED — the verification block enforces it.
--
--    What that means per skill, from production on 2026-09-14:
--      - Figure Matrices, Verbal Analogies, Numbers Urdu, Arabic Qaida:
--        the app's content_level was ahead of the server; the app wins.
--      - Numbers Arabic: the server had already recorded level 3 as earned
--        for every profile, while the app tracked the level only on the
--        device. Arabic Numbers will open at level 3 at minimum.
--      - Numbers English / Qaida progress that lived only in localStorage
--        is pushed up by the client's one-time syncLegacyLevels().
--
-- No catch-up unlocks happen here. The new rules evaluate a skill the
-- next time it is practised, so a child sees "new level" in context.
--
-- ---------------------------------------------------------------------
-- SECURITY
-- ---------------------------------------------------------------------
-- New functions are SECURITY INVOKER: they run with the caller's rights,
-- so row-level security applies and a parent can only reach their own
-- children. finalize_session stays SECURITY DEFINER with the NULL-safe
-- ownership check from migration 01. EXECUTE on every new function is
-- revoked from `public` and `anon` and granted to `authenticated`.
-- The trigger function is deliberately left alone: it cannot be called
-- through the API, and a mistake there would break every answer insert.
--
-- ROLLBACK: the current client works against this schema, so a bad
-- client release is rolled back by reverting the push. If
-- finalize_session itself misbehaves, restore its definition from
-- sql/schema.sql and re-apply migration 01's patch to it.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Preconditions
-- ---------------------------------------------------------------------

do $pre$
begin
  if strpos(pg_get_functiondef('public.finalize_session(uuid)'::regprocedure),
            'is distinct from auth.uid()') = 0
     or has_function_privilege('anon', 'public.finalize_session(uuid)'::regprocedure, 'execute') then
    raise exception 'Apply sql/migrations/20260914_01_security_hardening.sql first.';
  end if;
end
$pre$;

create temp table _mastery_levels_before on commit drop as
select child_id, skill_id, unlocked_level from public.child_skill_progress;

-- ---------------------------------------------------------------------
-- 1. Skill classification and thresholds
-- ---------------------------------------------------------------------

alter table public.skills
  add column if not exists mastery_type text not null default 'adaptive',
  add column if not exists mastery_questions integer not null default 15,
  add column if not exists mastery_days integer not null default 3,
  add column if not exists mastery_accuracy numeric(3,2) not null default 0.80;

alter table public.skills drop constraint if exists skills_mastery_type_check;
alter table public.skills add constraint skills_mastery_type_check
  check (mastery_type in ('mastery', 'qaida', 'practice', 'adaptive'));

alter table public.skills drop constraint if exists skills_mastery_thresholds_check;
alter table public.skills add constraint skills_mastery_thresholds_check
  check (mastery_questions >= 1 and mastery_days >= 1
         and mastery_accuracy > 0 and mastery_accuracy <= 1);

update public.skills set mastery_type = 'mastery'
where id in ('verbal_analogies', 'figure_matrices', 'numbers_english', 'numbers_urdu', 'numbers_arabic');

update public.skills set mastery_type = 'qaida'
where id in ('arabic_qaida', 'urdu_qaida');

-- Only replaces the column defaults, so re-running never undoes a tuned value.
update public.skills set mastery_questions = 10, mastery_days = 5
where id in ('arabic_qaida', 'urdu_qaida')
  and mastery_questions = 15 and mastery_days = 3;

update public.skills set mastery_type = 'practice'
where id in ('arabic_trace', 'trace_upper', 'trace_lower', 'trace_numbers', 'urdu_trace',
             'urdu_videos', 'connect_dots', 'find_pairs', 'numbers_all', 'urdu_2letter',
             'two_letter_words', 'three_letter_words');

-- ---------------------------------------------------------------------
-- 2. Passive answers
-- ---------------------------------------------------------------------

alter table public.responses
  add column if not exists is_passive boolean not null default false;

create or replace function public.set_response_is_passive()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  new.is_passive := new.correct_answer = 'seen'
                 or new.skill_id = 'numbers_all'
                 or (new.skill_id = 'find_pairs' and new.question_data ? 'total_pairs');
  return new;
end
$fn$;

drop trigger if exists trg_set_response_is_passive on public.responses;
create trigger trg_set_response_is_passive
  before insert on public.responses
  for each row execute function public.set_response_is_passive();

update public.responses
set is_passive = true
where not is_passive
  and (correct_answer = 'seen'
       or skill_id = 'numbers_all'
       or (skill_id = 'find_pairs' and question_data ? 'total_pairs'));

-- ---------------------------------------------------------------------
-- 3. The rules
-- ---------------------------------------------------------------------
-- "First-try" means attempt_count = 1: one row per question. Skips count
-- as wrong. Days are local calendar days in the parent's timezone.

create or replace function public.mastery_evidence(p_child_id uuid, p_skill_id text, p_level integer)
returns table (
  questions integer,
  correct integer,
  days integer,
  practice_days integer,
  check_questions integer,
  check_correct integer
)
language sql
stable
security invoker
set search_path = public
as $fn$
  with params as (
    select
      sk.mastery_questions as n,
      coalesce(
        (select p.timezone from children c join parents p on p.id = c.parent_id where c.id = p_child_id),
        'America/Chicago'
      ) as tz
    from skills sk
    where sk.id = p_skill_id
  ),
  recent as (
    select r.is_correct, (r.created_at at time zone params.tz)::date as local_day
    from responses r
    cross join params
    where r.child_id = p_child_id
      and r.skill_id = p_skill_id
      and r.level = p_level
      and r.attempt_count = 1
      and not r.is_passive
      and coalesce(r.question_data->>'purpose', '') not in ('review', 'check')
    order by r.created_at desc
    limit (select n from params)
  ),
  recent_checks as (
    select r.is_correct
    from responses r
    where r.child_id = p_child_id
      and r.skill_id = p_skill_id
      and r.level = p_level
      and r.attempt_count = 1
      and not r.is_passive
      and r.question_data->>'purpose' = 'check'
    order by r.created_at desc
    limit (select n from params)
  )
  select
    (select count(*)::integer from recent),
    (select (count(*) filter (where is_correct))::integer from recent),
    (select count(distinct local_day)::integer from recent),
    (select count(distinct (r.created_at at time zone params.tz)::date)::integer
       from responses r
       cross join params
       where r.child_id = p_child_id and r.skill_id = p_skill_id and r.level = p_level),
    (select count(*)::integer from recent_checks),
    (select (count(*) filter (where is_correct))::integer from recent_checks)
$fn$;

create or replace function public.is_level_mastered(p_child_id uuid, p_skill_id text, p_level integer)
returns boolean
language sql
stable
security invoker
set search_path = public
as $fn$
  select coalesce(
    case sk.mastery_type
      when 'mastery' then
        ev.questions >= sk.mastery_questions
        and ev.days >= sk.mastery_days
        and ev.correct::numeric / nullif(ev.questions, 0) >= sk.mastery_accuracy
      when 'qaida' then
        ev.practice_days >= sk.mastery_days
        and ev.check_questions >= sk.mastery_questions
        and ev.check_correct::numeric / nullif(ev.check_questions, 0) >= sk.mastery_accuracy
      else false
    end,
    false)
  from skills sk
  cross join lateral public.mastery_evidence(p_child_id, sk.id, p_level) ev
  where sk.id = p_skill_id
$fn$;

create or replace function public.levels_needing_review(p_child_id uuid, p_skill_id text, p_below_level integer)
returns integer[]
language sql
stable
security invoker
set search_path = public
as $fn$
  select coalesce(array_agg(t.level order by t.level), '{}'::integer[])
  from (
    select ranked.level
    from (
      select r.level, r.is_correct,
             row_number() over (partition by r.level order by r.created_at desc) as rn
      from responses r
      where r.child_id = p_child_id
        and r.skill_id = p_skill_id
        and r.level < p_below_level
        and r.attempt_count = 1
        and not r.is_passive
        and r.question_data->>'purpose' = 'review'
    ) ranked
    where ranked.rn <= 10
    group by ranked.level
    having count(*) >= 5
       and (count(*) filter (where ranked.is_correct))::numeric / count(*)
           < (select sk.mastery_accuracy from skills sk where sk.id = p_skill_id)
  ) t
$fn$;

-- ---------------------------------------------------------------------
-- 4. The unlock step
-- ---------------------------------------------------------------------

create or replace function public.evaluate_skill_mastery(p_child_id uuid, p_skill_id text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_type     text;
  v_max      integer;
  v_level    integer;
  v_state    text;
  v_unlocked boolean := false;
begin
  if auth.uid() is null or public.parent_of_child(p_child_id) is distinct from auth.uid() then
    raise exception 'Unauthorized: caller does not own child %', p_child_id;
  end if;

  select mastery_type, max_level into v_type, v_max from skills where id = p_skill_id;

  if v_type is null or v_type not in ('mastery', 'qaida') or v_max is null then
    return jsonb_build_object('skill_id', p_skill_id, 'unlocked_level', null,
                              'level_unlocked', false, 'mastery_state', null);
  end if;

  insert into child_skill_progress (child_id, skill_id)
  values (p_child_id, p_skill_id)
  on conflict (child_id, skill_id) do nothing;

  select unlocked_level, mastery_state into v_level, v_state
  from child_skill_progress
  where child_id = p_child_id and skill_id = p_skill_id
  for update;

  if public.is_level_mastered(p_child_id, p_skill_id, v_level) then
    if v_level < v_max then
      v_level := v_level + 1;
      v_state := 'learning';
      v_unlocked := true;
    else
      v_state := 'mastered';
    end if;
  end if;

  update child_skill_progress
  set unlocked_level = v_level,
      mastery_state = v_state,
      last_mastery_check_at = now()
  where child_id = p_child_id and skill_id = p_skill_id;

  return jsonb_build_object('skill_id', p_skill_id, 'unlocked_level', v_level,
                            'level_unlocked', v_unlocked, 'mastery_state', v_state);
end
$fn$;

-- ---------------------------------------------------------------------
-- 5. finalize_session
-- ---------------------------------------------------------------------

create or replace function public.finalize_session(p_session_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_child_id        uuid;
  v_parent_id       uuid;
  v_session_status  text;
  v_skill_id        text;
  v_eval            jsonb;
  v_levels_unlocked jsonb := '{}'::jsonb;
  v_slice           record;
  v_slices          jsonb := '[]'::jsonb;
begin
  -- 1. Validate session exists and caller owns it
  select s.child_id, s.status into v_child_id, v_session_status
    from sessions s where s.id = p_session_id
    for update;

  if v_child_id is null then
    raise exception 'Session % not found', p_session_id;
  end if;

  select parent_id into v_parent_id from children where id = v_child_id;
  if auth.uid() is null or v_parent_id is distinct from auth.uid() then
    raise exception 'Unauthorized: caller does not own child for session %', p_session_id;
  end if;

  if v_session_status <> 'in_progress' then
    return jsonb_build_object(
      'session_id',        p_session_id,
      'status',            v_session_status,
      'already_finalized', true,
      'slices',            '[]'::jsonb,
      'levels_unlocked',   '{}'::jsonb
    );
  end if;

  -- 2. Mark session completed
  update sessions set status = 'completed', ended_at = now() where id = p_session_id;

  -- 3. One unlock step for each leveled skill practised in this session
  for v_skill_id in
    select distinct r.skill_id
    from responses r
    join skills sk on sk.id = r.skill_id
    where r.session_id = p_session_id
      and sk.mastery_type in ('mastery', 'qaida')
  loop
    v_eval := public.evaluate_skill_mastery(v_child_id, v_skill_id);
    if (v_eval->>'level_unlocked')::boolean then
      v_levels_unlocked := v_levels_unlocked
        || jsonb_build_object(v_skill_id, (v_eval->>'unlocked_level')::integer);
    end if;
  end loop;

  -- 4. Per (skill, level) summary: first attempts only, excluding passive
  --    practice and review, so difficulty tuning sees current material only
  for v_slice in
    select r.skill_id, r.level, sk.category,
      count(*) as questions,
      count(*) filter (where r.is_correct) as correct
    from responses r
    join skills sk on sk.id = r.skill_id
    where r.session_id = p_session_id
      and r.attempt_count = 1
      and not r.is_passive
      and coalesce(r.question_data->>'purpose', '') <> 'review'
    group by r.skill_id, r.level, sk.category
  loop
    v_slices := v_slices || jsonb_build_object(
      'skill_id',       v_slice.skill_id,
      'level',          v_slice.level,
      'category',       v_slice.category,
      'attempted',      v_slice.questions,
      'correct',        v_slice.correct,
      'accuracy',       round(v_slice.correct::numeric / v_slice.questions, 2),
      'qualifies',      v_slice.questions >= 5
                        and v_slice.correct::numeric / v_slice.questions >= 0.80,
      'level_unlocked', v_levels_unlocked ? v_slice.skill_id
    );
  end loop;

  return jsonb_build_object(
    'session_id',      p_session_id,
    'status',          'completed',
    'slices',          v_slices,
    'levels_unlocked', v_levels_unlocked
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- 6. Client RPCs
-- ---------------------------------------------------------------------

create or replace function public.get_skill_progress(p_child_id uuid)
returns table (
  skill_id               text,
  mastery_type           text,
  max_level              integer,
  unlocked_level         integer,
  mastery_state          text,
  questions_needed       integer,
  days_needed            integer,
  accuracy_needed        numeric,
  window_questions       integer,
  window_correct         integer,
  window_days            integer,
  practice_days          integer,
  check_questions        integer,
  check_correct          integer,
  check_ready            boolean,
  levels_needing_review  integer[],
  review_questions       integer,
  review_correct         integer
)
language sql
stable
security invoker
set search_path = public
as $fn$
  select
    sk.id,
    sk.mastery_type,
    sk.max_level,
    case when sk.mastery_type in ('mastery', 'qaida') then coalesce(csp.unlocked_level, 1) end,
    case when sk.mastery_type in ('mastery', 'qaida') then coalesce(csp.mastery_state, 'learning') end,
    sk.mastery_questions,
    sk.mastery_days,
    sk.mastery_accuracy,
    ev.questions,
    ev.correct,
    ev.days,
    ev.practice_days,
    ev.check_questions,
    ev.check_correct,
    case when sk.mastery_type = 'qaida' then ev.practice_days >= sk.mastery_days end,
    case when sk.mastery_type in ('mastery', 'qaida')
         then public.levels_needing_review(p_child_id, sk.id, coalesce(csp.unlocked_level, 1)) end,
    rv.questions,
    rv.correct
  from skills sk
  left join child_skill_progress csp
    on csp.child_id = p_child_id and csp.skill_id = sk.id
  left join lateral public.mastery_evidence(p_child_id, sk.id, coalesce(csp.unlocked_level, 1)) ev
    on sk.mastery_type in ('mastery', 'qaida')
  left join lateral (
    select count(*)::integer as questions,
           (count(*) filter (where x.is_correct))::integer as correct
    from (
      select r.is_correct
      from responses r
      where r.child_id = p_child_id
        and r.skill_id = sk.id
        and r.attempt_count = 1
        and not r.is_passive
        and r.question_data->>'purpose' = 'review'
      order by r.created_at desc
      limit 10
    ) x
  ) rv on true
  order by sk.id
$fn$;

create or replace function public.raise_skill_level(p_child_id uuid, p_skill_id text, p_level integer)
returns integer
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_type  text;
  v_max   integer;
  v_level integer;
begin
  if auth.uid() is null or public.parent_of_child(p_child_id) is distinct from auth.uid() then
    raise exception 'Unauthorized: caller does not own child %', p_child_id;
  end if;

  select mastery_type, max_level into v_type, v_max from skills where id = p_skill_id;

  if v_type is null or v_type not in ('mastery', 'qaida') or v_max is null or p_level is null then
    return null;
  end if;

  insert into child_skill_progress (child_id, skill_id, unlocked_level)
  values (p_child_id, p_skill_id, greatest(1, least(p_level, v_max)))
  on conflict (child_id, skill_id) do update
    set unlocked_level = greatest(child_skill_progress.unlocked_level, excluded.unlocked_level)
  returning unlocked_level into v_level;

  return v_level;
end
$fn$;

-- ---------------------------------------------------------------------
-- 7. Backfill: one row per child per leveled skill, never lowered
-- ---------------------------------------------------------------------

insert into public.child_skill_progress (child_id, skill_id, unlocked_level)
select c.id, sk.id, greatest(1, least(coalesce(css.content_level, 1), sk.max_level))
from public.children c
cross join public.skills sk
left join public.child_skill_settings css
  on css.child_id = c.id and css.skill_id = sk.id
where sk.mastery_type in ('mastery', 'qaida')
on conflict (child_id, skill_id) do update
  set unlocked_level = greatest(child_skill_progress.unlocked_level, excluded.unlocked_level);

-- The old engine wrote 'mastered' on merely *unlocking* the last level.
-- Now it means the last level itself is mastered.
update public.child_skill_progress csp
set mastery_state = case
      when csp.unlocked_level >= sk.max_level
           and public.is_level_mastered(csp.child_id, csp.skill_id, sk.max_level)
        then 'mastered'
      else 'learning'
    end
from public.skills sk
where sk.id = csp.skill_id
  and sk.mastery_type in ('mastery', 'qaida');

-- ---------------------------------------------------------------------
-- 8. Privileges
-- ---------------------------------------------------------------------

revoke execute on function public.mastery_evidence(uuid, text, integer) from public, anon;
revoke execute on function public.is_level_mastered(uuid, text, integer) from public, anon;
revoke execute on function public.levels_needing_review(uuid, text, integer) from public, anon;
revoke execute on function public.evaluate_skill_mastery(uuid, text) from public, anon;
revoke execute on function public.get_skill_progress(uuid) from public, anon;
revoke execute on function public.raise_skill_level(uuid, text, integer) from public, anon;

-- The helpers need it too: get_skill_progress runs with the caller's
-- rights and calls them.
grant execute on function public.mastery_evidence(uuid, text, integer) to authenticated;
grant execute on function public.is_level_mastered(uuid, text, integer) to authenticated;
grant execute on function public.levels_needing_review(uuid, text, integer) to authenticated;
grant execute on function public.evaluate_skill_mastery(uuid, text) to authenticated;
grant execute on function public.get_skill_progress(uuid) to authenticated;
grant execute on function public.raise_skill_level(uuid, text, integer) to authenticated;

-- ---------------------------------------------------------------------
-- 9. Verify. Any failure raises and rolls back everything above.
-- ---------------------------------------------------------------------

do $verify$
declare
  v_count integer;
  v_fn    text;
begin
  -- No level was lowered.
  select count(*) into v_count
  from _mastery_levels_before b
  join public.child_skill_progress a using (child_id, skill_id)
  where a.unlocked_level < b.unlocked_level;
  if v_count > 0 then
    raise exception 'Verification failed: % levels would be lowered', v_count;
  end if;

  -- Every child has every leveled skill, at or above what the app showed.
  select count(*) into v_count
  from public.children c
  cross join public.skills sk
  left join public.child_skill_progress csp on csp.child_id = c.id and csp.skill_id = sk.id
  left join public.child_skill_settings css on css.child_id = c.id and css.skill_id = sk.id
  where sk.mastery_type in ('mastery', 'qaida')
    and (csp.id is null or csp.unlocked_level < least(coalesce(css.content_level, 1), sk.max_level));
  if v_count > 0 then
    raise exception 'Verification failed: % child/skill levels missing or below what the app showed', v_count;
  end if;

  -- Classification matches docs/MASTERY.md.
  if (select count(*) from public.skills where mastery_type = 'mastery') <> 5
     or (select count(*) from public.skills where mastery_type = 'qaida') <> 2
     or (select count(*) from public.skills where mastery_type = 'practice') <> 12 then
    raise exception 'Verification failed: skill classification does not match docs/MASTERY.md';
  end if;
  if exists (select 1 from public.skills where mastery_type in ('mastery', 'qaida') and max_level is null) then
    raise exception 'Verification failed: a mastery/qaida skill has no max_level';
  end if;

  -- Passive marking: every practice row marked, no real answer marked.
  if exists (select 1 from public.responses where correct_answer = 'seen' and not is_passive) then
    raise exception 'Verification failed: a passive row is not marked';
  end if;
  if exists (select 1 from public.responses
             where skill_id = 'find_pairs' and not (question_data ? 'total_pairs') and is_passive) then
    raise exception 'Verification failed: a real find_pairs answer was marked passive';
  end if;

  -- Nothing callable while signed out; everything the app needs callable while signed in.
  foreach v_fn in array array[
    'public.finalize_session(uuid)',
    'public.get_skill_progress(uuid)',
    'public.raise_skill_level(uuid, text, integer)',
    'public.evaluate_skill_mastery(uuid, text)',
    'public.mastery_evidence(uuid, text, integer)',
    'public.is_level_mastered(uuid, text, integer)',
    'public.levels_needing_review(uuid, text, integer)'
  ] loop
    if has_function_privilege('anon', v_fn::regprocedure, 'execute') then
      raise exception 'Verification failed: anon can execute %', v_fn;
    end if;
    if not has_function_privilege('authenticated', v_fn::regprocedure, 'execute') then
      raise exception 'Verification failed: signed-in users cannot execute %', v_fn;
    end if;
  end loop;

  if strpos(pg_get_functiondef('public.finalize_session(uuid)'::regprocedure),
            'if auth.uid() is null or v_parent_id is distinct from auth.uid() then') = 0 then
    raise exception 'Verification failed: finalize_session lost its NULL-safe ownership check';
  end if;
end
$verify$;

-- Runtime probe. PL/pgSQL bodies are only fully checked when they run, so
-- call the new functions for real, as the first child's parent. Everything
-- happens inside a sub-block that always raises, which rolls back every
-- write the probe made.
do $probe$
declare
  v_child   uuid;
  v_parent  uuid;
  v_session uuid;
  v_result  jsonb;
begin
  select c.id, c.parent_id into v_child, v_parent
  from public.children c
  order by c.id
  limit 1;

  if v_child is null then
    raise notice 'No children yet: runtime probe skipped.';
    return;
  end if;

  begin
    perform set_config('request.jwt.claims',
                       json_build_object('sub', v_parent, 'role', 'authenticated')::text, true);

    perform * from public.get_skill_progress(v_child);
    perform public.evaluate_skill_mastery(v_child, 'figure_matrices');
    perform public.evaluate_skill_mastery(v_child, 'arabic_qaida');
    perform public.raise_skill_level(v_child, 'numbers_english', 1);

    select s.id into v_session
    from public.sessions s
    where s.child_id = v_child
    order by s.started_at desc
    limit 1;

    if v_session is not null then
      update public.sessions set status = 'in_progress', ended_at = null where id = v_session;
      v_result := public.finalize_session(v_session);
      if v_result->>'status' is distinct from 'completed'
         or jsonb_typeof(v_result->'slices') is distinct from 'array'
         or jsonb_typeof(v_result->'levels_unlocked') is distinct from 'object' then
        raise exception 'finalize_session returned an unexpected shape: %', v_result;
      end if;
    end if;

    raise exception 'probe_ok';
  exception when others then
    if sqlerrm is distinct from 'probe_ok' then
      raise exception 'Verification failed: runtime probe errored: %', sqlerrm;
    end if;
  end;

  raise notice 'Mastery migration applied and verified.';
end
$probe$;

commit;
