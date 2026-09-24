-- 20260923_04_merge_color_patterns.sql
--
-- Merges Color Patterns L2 into Color Patterns as one levelled skill.
--
-- Why: the two skills taught the same thing at two fixed difficulties, and neither
-- had levels (max_level was null on both), so a child practised the identical
-- undifferentiated mix forever. Production bears that out — both children have
-- practised across ~50 distinct days, 100+ first attempts each, and are still on
-- level 1 of both, at 63-80% first-try accuracy. The generator serves ABBC and
-- seven-element patterns from the first session alongside simple AB ones, so a
-- 4-year-old meets the hardest content on day one and the accuracy never settles.
-- One skill with six levels lets the easy end actually be easy and the hard end
-- be somewhere to climb to. This is goal (f): pacing per skill, not per app.
--
-- No level is carried forward from color_patterns_l2. Nobody has earned one —
-- every child sits at unlocked_level 1 on both rows, and no first-try accuracy is
-- above the 0.80 bar. Starting the merged skill at level 1 therefore takes nothing
-- away from anyone; there is no level to preserve.
--
-- color_patterns_l2 is deactivated, not deleted: responses, sessions and
-- skill_stats reference it by foreign key, and that history is the evidence of
-- what the children have already done.
--
-- Safe to run twice. Apply in the Supabase SQL editor; the final block raises
-- (rolling the statement back) if the result is not exactly as intended.

update public.skills
set max_level         = 6,
    mastery_type      = 'mastery',
    mastery_questions = 5,
    mastery_days      = 3,
    mastery_accuracy  = 0.80,
    display_name      = 'Color Patterns'
where id = 'color_patterns';

update public.skills
set is_active = false
where id = 'color_patterns_l2';

-- Every child needs a progress row on the merged skill, and it must sit inside
-- the new 1..6 range. greatest(...,1) never lowers a level a child has reached.
insert into public.child_skill_progress (child_id, skill_id, unlocked_level, current_level)
select c.id, 'color_patterns', 1, 1
from public.children c
where not exists (
    select 1 from public.child_skill_progress p
    where p.child_id = c.id and p.skill_id = 'color_patterns'
);

update public.child_skill_progress
set unlocked_level = least(greatest(coalesce(unlocked_level, 1), 1), 6),
    current_level  = least(greatest(coalesce(current_level, 1), 1), 6)
where skill_id = 'color_patterns'
  and (coalesce(unlocked_level, 0) not between 1 and 6
    or coalesce(current_level, 0)  not between 1 and 6);

-- The working level may never exceed what the child has unlocked.
update public.child_skill_progress
set current_level = unlocked_level
where skill_id = 'color_patterns'
  and current_level > unlocked_level;

update public.child_skill_settings
set difficulty_level = least(greatest(coalesce(difficulty_level, 1), 1), 6)
where skill_id = 'color_patterns'
  and coalesce(difficulty_level, 0) not between 1 and 6;

do $$
declare
    v_max      integer;
    v_type     text;
    v_l2active boolean;
    v_bad      integer;
    v_missing  integer;
begin
    select max_level, mastery_type into v_max, v_type
    from public.skills where id = 'color_patterns';

    select is_active into v_l2active
    from public.skills where id = 'color_patterns_l2';

    if v_max is distinct from 6 then
        raise exception 'color_patterns.max_level is %, expected 6', v_max;
    end if;

    if v_type is distinct from 'mastery' then
        raise exception 'color_patterns.mastery_type is %, expected mastery', v_type;
    end if;

    if v_l2active is distinct from false then
        raise exception 'color_patterns_l2.is_active is %, expected false', v_l2active;
    end if;

    select count(*) into v_bad
    from public.child_skill_progress
    where skill_id = 'color_patterns'
      and (unlocked_level not between 1 and 6
        or current_level  not between 1 and 6
        or current_level  > unlocked_level);

    if v_bad > 0 then
        raise exception '% color_patterns progress rows are outside 1..6 or above their unlocked level', v_bad;
    end if;

    select count(*) into v_missing
    from public.children c
    where not exists (
        select 1 from public.child_skill_progress p
        where p.child_id = c.id and p.skill_id = 'color_patterns'
    );

    if v_missing > 0 then
        raise exception '% children have no color_patterns progress row', v_missing;
    end if;

    raise notice 'color_patterns merged: 6 levels, mastery type, L2 retired, % children on the ladder',
        (select count(*) from public.child_skill_progress where skill_id = 'color_patterns');
end $$;
