-- =====================================================================
-- Migration 20260923_03 — daily mini-test, working level, books
-- =====================================================================
-- Status:  NOT YET APPLIED. Apply after 20260914_01 and 20260914_02.
--          Then push the matching client release.
--
-- NO `begin;` / `commit;` HERE, AND NO TEMP TABLES. The Supabase SQL
-- editor runs statements through a connection pooler, so a multi-statement
-- transaction is not preserved: that is what made 20260914_02's final
-- self-check fail with `relation "_mastery_levels_before" does not exist`
-- while every real change had already applied. Instead every statement
-- here is idempotent and safe to re-run, and the checks at the end raise
-- loudly if the result is wrong so it can be fixed and re-run.
--
-- ---------------------------------------------------------------------
-- WHY (owner's revision, 2026-09-23 — see docs/MASTERY.md)
-- ---------------------------------------------------------------------
--
-- v2 rule: practice never unlocks a level. A short daily mini-test does,
-- passed on 3 different days. And an achievement is separated from what
-- the child is served today:
--
--   unlocked_level  the permanent achievement. Never lowered.
--   current_level   the working level. Steps down after REPEATED weak
--                   weekends, climbs back on strong ones, never exceeds
--                   unlocked_level.
--
-- That is what fixes the real case behind this: a profile holding the top
-- Numbers Urdu level while answering 20% correctly is pulled back to
-- prerequisite material without losing the badge, and with no parent
-- "demote" button.
--
-- Also here:
--   * `baby_university` gets a skills row. responses.skill_id is foreign
--     keyed to skills, so every book completion the app has ever tried to
--     record was rejected and the error swallowed.
--   * Every child x skill gets a child_skill_settings row, and
--     practice_question_count gets a floor of 3. 32 pairs had no row at
--     all and silently fell back to ONE question per worksheet; 38% of
--     all worksheet runs served a single question.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Preconditions
-- ---------------------------------------------------------------------

do $pre$
begin
  if to_regclass('public.child_skill_progress') is null
     or not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'skills' and column_name = 'mastery_type') then
    raise exception 'Apply 20260914_02_mastery.sql first.';
  end if;
end
$pre$;

-- ---------------------------------------------------------------------
-- 1. Thresholds now describe a test, not a window of practice
-- ---------------------------------------------------------------------
-- mastery_questions: questions in one mini-test
-- mastery_days:      qualifying test days needed to unlock
-- mastery_accuracy:  the bar

update public.skills
set mastery_questions = 5, mastery_days = 3, mastery_accuracy = 0.80
where mastery_type in ('mastery', 'qaida')
  and (mastery_questions, mastery_days) in ((15, 3), (10, 5));   -- only the v1 defaults, never a tuned value

-- ---------------------------------------------------------------------
-- 2. Working level and weak-weekend streak
-- ---------------------------------------------------------------------

alter table public.child_skill_progress
  add column if not exists weak_weekend_streak integer not null default 0;

-- current_level existed but nothing ever read it, so it sat at 1 while
-- unlocked_level reached 5. Start it AT the achievement: the app now serves
-- the working level, so leaving it at 1 would hand level-1 material to a child
-- who had earned level 5 — the demotion this design promises never happens.
--
-- ONE-TIME INITIALISATION. Re-running this file after a weekend step-back has
-- legitimately lowered someone's working level would undo that step-back.
update public.child_skill_progress csp
set current_level = csp.unlocked_level
from public.skills sk
where sk.id = csp.skill_id
  and sk.mastery_type in ('mastery', 'qaida')
  and csp.current_level is distinct from csp.unlocked_level;

-- ---------------------------------------------------------------------
-- 3. Books become a real skill
-- ---------------------------------------------------------------------

-- display_name and domain are NOT NULL with no default, and domain is
-- constrained to the six the table already defines.
insert into public.skills (id, display_name, domain, category, mastery_type, base_weight, sort_order)
values ('baby_university', 'Books', 'literacy', 'fun', 'practice', 2, 290)
on conflict (id) do update set mastery_type = 'practice';

-- ---------------------------------------------------------------------
-- 4. Nothing falls back to one question
-- ---------------------------------------------------------------------

insert into public.child_skill_settings (child_id, skill_id, difficulty_level, practice_question_count, challenge_question_count, content_level)
select c.id, sk.id, 1, 3, 5, 1
from public.children c
cross join public.skills sk
on conflict (child_id, skill_id) do nothing;

update public.child_skill_settings
set practice_question_count = 3
where practice_question_count < 3;

-- ---------------------------------------------------------------------
-- 5. The rules
-- ---------------------------------------------------------------------
-- Return types change, so these are dropped and recreated in dependency
-- order. Nothing else references them.

drop function if exists public.get_skill_progress(uuid);
drop function if exists public.is_level_mastered(uuid, text, integer);
drop function if exists public.mastery_evidence(uuid, text, integer);

-- A mini-test is one group of purpose:'check' answers for a skill at a
-- level inside one session. A day qualifies when any test that day had at
-- least mastery_questions first-try answers at or above the bar, so a level
-- cannot be farmed by retaking a test.
create or replace function public.mastery_evidence(p_child_id uuid, p_skill_id text, p_level integer)
returns table (
  qualifying_days integer,
  last_test_questions integer,
  last_test_correct integer,
  practice_days integer
)
language sql
stable
security invoker
set search_path = public
as $fn$
  with params as (
    select sk.mastery_questions as need_q, sk.mastery_accuracy as need_acc,
      coalesce(
        (select p.timezone from children c join parents p on p.id = c.parent_id where c.id = p_child_id),
        'America/Chicago'
      ) as tz
    from skills sk
    where sk.id = p_skill_id
  ),
  tests as (
    select r.session_id,
      (r.created_at at time zone params.tz)::date as local_day,
      max(r.created_at) as ended_at,
      count(*) as questions,
      count(*) filter (where r.is_correct) as correct
    from responses r
    cross join params
    where r.child_id = p_child_id
      and r.skill_id = p_skill_id
      and r.level = p_level
      and r.attempt_count = 1
      and not r.is_passive
      and r.question_data->>'purpose' = 'check'
    group by r.session_id, 2
  )
  select
    (select count(distinct t.local_day)::integer
       from tests t, params
       where t.questions >= params.need_q
         and t.correct::numeric / nullif(t.questions, 0) >= params.need_acc),
    (select t.questions::integer from tests t order by t.ended_at desc limit 1),
    (select t.correct::integer from tests t order by t.ended_at desc limit 1),
    (select count(distinct (r.created_at at time zone params.tz)::date)::integer
       from responses r
       cross join params
       where r.child_id = p_child_id and r.skill_id = p_skill_id and r.level = p_level)
$fn$;

create or replace function public.is_level_mastered(p_child_id uuid, p_skill_id text, p_level integer)
returns boolean
language sql
stable
security invoker
set search_path = public
as $fn$
  select coalesce(
    sk.mastery_type in ('mastery', 'qaida') and ev.qualifying_days >= sk.mastery_days,
    false)
  from skills sk
  cross join lateral public.mastery_evidence(p_child_id, sk.id, p_level) ev
  where sk.id = p_skill_id
$fn$;

-- ---------------------------------------------------------------------
-- 6. Unlocking, evaluated at the working level
-- ---------------------------------------------------------------------
-- Mastering the working level while it sits below the achievement is a
-- recovery: the working level climbs and the achievement is untouched.

create or replace function public.evaluate_skill_mastery(p_child_id uuid, p_skill_id text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_type      text;
  v_max       integer;
  v_current   integer;
  v_unlocked  integer;
  v_state     text;
  v_did_unlock boolean := false;
begin
  if auth.uid() is null or public.parent_of_child(p_child_id) is distinct from auth.uid() then
    raise exception 'Unauthorized: caller does not own child %', p_child_id;
  end if;

  select mastery_type, max_level into v_type, v_max from skills where id = p_skill_id;

  if v_type is null or v_type not in ('mastery', 'qaida') or v_max is null then
    return jsonb_build_object('skill_id', p_skill_id, 'unlocked_level', null, 'current_level', null,
                              'level_unlocked', false, 'mastery_state', null);
  end if;

  insert into child_skill_progress (child_id, skill_id)
  values (p_child_id, p_skill_id)
  on conflict (child_id, skill_id) do nothing;

  select greatest(current_level, 1), unlocked_level, mastery_state
    into v_current, v_unlocked, v_state
  from child_skill_progress
  where child_id = p_child_id and skill_id = p_skill_id
  for update;

  if public.is_level_mastered(p_child_id, p_skill_id, v_current) then
    if v_current < v_unlocked then
      v_current := v_current + 1;              -- recovering ground already earned
    elsif v_current < v_max then
      v_current := v_current + 1;
      v_unlocked := v_current;
      v_did_unlock := true;
      v_state := 'learning';
    else
      v_state := 'mastered';
    end if;
  end if;

  update child_skill_progress
  set current_level = least(v_current, v_unlocked),
      unlocked_level = v_unlocked,
      mastery_state = v_state,
      last_mastery_check_at = now()
  where child_id = p_child_id and skill_id = p_skill_id;

  return jsonb_build_object('skill_id', p_skill_id, 'unlocked_level', v_unlocked,
                            'current_level', least(v_current, v_unlocked),
                            'level_unlocked', v_did_unlock, 'mastery_state', v_state);
end
$fn$;

-- ---------------------------------------------------------------------
-- 7. Weekend retention — the only thing that lowers a working level
-- ---------------------------------------------------------------------
-- One bad weekend never moves a child. A tired 4-year-old has bad days.

create or replace function public.evaluate_weekend_retention(p_child_id uuid, p_skill_id text, p_session_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_need_q   integer;
  v_need_acc numeric;
  v_max      integer;
  v_type     text;
  v_q        integer;
  v_c        integer;
  v_current  integer;
  v_unlocked integer;
  v_streak   integer;
  v_outcome  text := 'no_signal';
begin
  if auth.uid() is null or public.parent_of_child(p_child_id) is distinct from auth.uid() then
    raise exception 'Unauthorized: caller does not own child %', p_child_id;
  end if;

  select mastery_type, max_level, mastery_questions, mastery_accuracy
    into v_type, v_max, v_need_q, v_need_acc
  from skills where id = p_skill_id;

  if v_type is null or v_type not in ('mastery', 'qaida') or v_max is null then
    return jsonb_build_object('skill_id', p_skill_id, 'outcome', 'not_leveled');
  end if;

  select count(*), count(*) filter (where is_correct)
    into v_q, v_c
  from responses
  where session_id = p_session_id
    and child_id = p_child_id
    and skill_id = p_skill_id
    and attempt_count = 1
    and not is_passive;

  if coalesce(v_q, 0) < v_need_q then
    return jsonb_build_object('skill_id', p_skill_id, 'outcome', v_outcome, 'questions', coalesce(v_q, 0));
  end if;

  select greatest(current_level, 1), unlocked_level, weak_weekend_streak
    into v_current, v_unlocked, v_streak
  from child_skill_progress
  where child_id = p_child_id and skill_id = p_skill_id
  for update;

  if v_current is null then
    return jsonb_build_object('skill_id', p_skill_id, 'outcome', 'no_progress_row');
  end if;

  if v_c::numeric / v_q >= v_need_acc then
    v_streak := 0;
    if v_current < v_unlocked then
      v_current := v_current + 1;
      v_outcome := 'recovered';
    else
      v_outcome := 'strong';
    end if;
  else
    v_streak := v_streak + 1;
    if v_streak >= 2 then
      v_current := greatest(1, v_current - 1);
      v_streak := 0;
      v_outcome := 'stepped_back';
    else
      v_outcome := 'weak';
    end if;
  end if;

  update child_skill_progress
  set current_level = least(v_current, v_unlocked),
      weak_weekend_streak = v_streak,
      last_mastery_check_at = now()
  where child_id = p_child_id and skill_id = p_skill_id;

  return jsonb_build_object('skill_id', p_skill_id, 'outcome', v_outcome,
                            'questions', v_q, 'correct', v_c,
                            'current_level', least(v_current, v_unlocked),
                            'unlocked_level', v_unlocked, 'weak_weekend_streak', v_streak);
end
$fn$;

-- ---------------------------------------------------------------------
-- 8. finalize_session: unlock on any session, retention on weekends
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
  v_session_type    text;
  v_skill_id        text;
  v_eval            jsonb;
  v_levels_unlocked jsonb := '{}'::jsonb;
  v_retention       jsonb := '[]'::jsonb;
  v_slice           record;
  v_slices          jsonb := '[]'::jsonb;
begin
  select s.child_id, s.status, s.session_type
    into v_child_id, v_session_status, v_session_type
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
      'levels_unlocked',   '{}'::jsonb,
      'retention',         '[]'::jsonb
    );
  end if;

  update sessions set status = 'completed', ended_at = now() where id = p_session_id;

  -- Unlocking, from the daily mini-test taken in this session
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

    if v_session_type = 'weekend_assessment' then
      v_retention := v_retention
        || public.evaluate_weekend_retention(v_child_id, v_skill_id, p_session_id);
    end if;
  end loop;

  -- Per (skill, level) summary: first attempts, excluding practice-only
  -- activity and review, so difficulty tuning never sees easy questions
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
    'levels_unlocked', v_levels_unlocked,
    'retention',       v_retention
  );
end;
$function$;

-- ---------------------------------------------------------------------
-- 9. What the client reads
-- ---------------------------------------------------------------------

create or replace function public.get_skill_progress(p_child_id uuid)
returns table (
  skill_id              text,
  mastery_type          text,
  max_level             integer,
  unlocked_level        integer,
  current_level         integer,
  mastery_state         text,
  questions_needed      integer,
  days_needed           integer,
  accuracy_needed       numeric,
  qualifying_days       integer,
  last_test_questions   integer,
  last_test_correct     integer,
  practice_days         integer,
  weak_weekend_streak   integer,
  levels_needing_review integer[],
  review_questions      integer,
  review_correct        integer
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
    case when sk.mastery_type in ('mastery', 'qaida')
         then least(coalesce(csp.current_level, 1), coalesce(csp.unlocked_level, 1)) end,
    case when sk.mastery_type in ('mastery', 'qaida') then coalesce(csp.mastery_state, 'learning') end,
    sk.mastery_questions,
    sk.mastery_days,
    sk.mastery_accuracy,
    ev.qualifying_days,
    ev.last_test_questions,
    ev.last_test_correct,
    ev.practice_days,
    coalesce(csp.weak_weekend_streak, 0),
    case when sk.mastery_type in ('mastery', 'qaida')
         then public.levels_needing_review(p_child_id, sk.id,
                least(coalesce(csp.current_level, 1), coalesce(csp.unlocked_level, 1))) end,
    rv.questions,
    rv.correct
  from skills sk
  left join child_skill_progress csp
    on csp.child_id = p_child_id and csp.skill_id = sk.id
  left join lateral public.mastery_evidence(p_child_id, sk.id,
      least(coalesce(csp.current_level, 1), coalesce(csp.unlocked_level, 1))) ev
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

-- A parent override raises the achievement and the working level together.
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

  insert into child_skill_progress (child_id, skill_id, unlocked_level, current_level)
  values (p_child_id, p_skill_id, greatest(1, least(p_level, v_max)), greatest(1, least(p_level, v_max)))
  on conflict (child_id, skill_id) do update
    set unlocked_level = greatest(child_skill_progress.unlocked_level, excluded.unlocked_level),
        current_level  = greatest(child_skill_progress.current_level, excluded.current_level)
  returning unlocked_level into v_level;

  return v_level;
end
$fn$;

-- ---------------------------------------------------------------------
-- 10. Privileges (new and recreated functions default to PUBLIC)
-- ---------------------------------------------------------------------

revoke execute on function public.mastery_evidence(uuid, text, integer) from public, anon;
revoke execute on function public.is_level_mastered(uuid, text, integer) from public, anon;
revoke execute on function public.get_skill_progress(uuid) from public, anon;
revoke execute on function public.evaluate_skill_mastery(uuid, text) from public, anon;
revoke execute on function public.evaluate_weekend_retention(uuid, text, uuid) from public, anon;
revoke execute on function public.raise_skill_level(uuid, text, integer) from public, anon;

grant execute on function public.mastery_evidence(uuid, text, integer) to authenticated;
grant execute on function public.is_level_mastered(uuid, text, integer) to authenticated;
grant execute on function public.get_skill_progress(uuid) to authenticated;
grant execute on function public.evaluate_skill_mastery(uuid, text) to authenticated;
grant execute on function public.evaluate_weekend_retention(uuid, text, uuid) to authenticated;
grant execute on function public.raise_skill_level(uuid, text, integer) to authenticated;

-- ---------------------------------------------------------------------
-- 11. Checks. These raise if anything is wrong; every statement above is
--     idempotent, so fix and re-run the whole file.
-- ---------------------------------------------------------------------

do $verify$
declare
  v_count integer;
  v_fn    text;
begin
  if exists (select 1 from public.skills where mastery_type in ('mastery','qaida')
             and (mastery_questions <> 5 or mastery_days <> 3)) then
    raise exception 'Verification failed: a leveled skill still has v1 test thresholds';
  end if;

  select count(*) into v_count from public.child_skill_progress csp
  join public.skills sk on sk.id = csp.skill_id
  where sk.mastery_type in ('mastery','qaida')
    and (csp.current_level < 1 or csp.current_level > csp.unlocked_level);
  if v_count > 0 then
    raise exception 'Verification failed: % rows have a working level outside 1..unlocked_level', v_count;
  end if;

  -- One-time initialisation check: no child may be left practising below what
  -- they earned. (This assertion is only valid before any weekend step-back.)
  select count(*) into v_count from public.child_skill_progress csp
  join public.skills sk on sk.id = csp.skill_id
  where sk.mastery_type in ('mastery','qaida')
    and csp.current_level <> csp.unlocked_level;
  if v_count > 0 then
    raise exception 'Verification failed: % rows kept a working level below the achievement', v_count;
  end if;

  if not exists (select 1 from public.skills where id = 'baby_university') then
    raise exception 'Verification failed: books still have no skills row';
  end if;

  select count(*) into v_count
  from public.children c cross join public.skills sk
  left join public.child_skill_settings css on css.child_id = c.id and css.skill_id = sk.id
  where css.id is null or css.practice_question_count < 3;
  if v_count > 0 then
    raise exception 'Verification failed: % child/skill pairs still missing settings or below 3 questions', v_count;
  end if;

  foreach v_fn in array array[
    'public.mastery_evidence(uuid, text, integer)',
    'public.is_level_mastered(uuid, text, integer)',
    'public.get_skill_progress(uuid)',
    'public.evaluate_skill_mastery(uuid, text)',
    'public.evaluate_weekend_retention(uuid, text, uuid)',
    'public.raise_skill_level(uuid, text, integer)'
  ] loop
    if has_function_privilege('anon', v_fn::regprocedure, 'execute') then
      raise exception 'Verification failed: anon can execute %', v_fn;
    end if;
    if not has_function_privilege('authenticated', v_fn::regprocedure, 'execute') then
      raise exception 'Verification failed: signed-in users cannot execute %', v_fn;
    end if;
  end loop;

  perform count(*) from public.get_skill_progress((select id from public.children order by id limit 1));

  raise notice 'Migration 03 applied and verified.';
end
$verify$;
