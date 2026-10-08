-- 20261007_08_multiplication.sql
--
-- Adds the multiplication skill. Client: js/worksheets/multiplication.js.
--
-- Why: next in the owner's build queue, and goal (d) — advanced concepts early, in
-- a fun and easy way. The child is still mastering addition, so the ladder teaches
-- meaning before facts and orders the tables easiest first:
--   L1 equal groups (pictures, no × sign)   L2 ×2   L3 ×10   L4 ×5   L5 ×3
--   L6 ×4   L7 ×6   L8 ×7   L9 ×8   L10 ×9
-- It only ever asks "a × b = ?", never a missing factor.
--
-- It is a mastery skill with a daily-test generator in js/assessment.js, so it has
-- a check path and can leave level 1 (see CLAUDE.md, decision of 2026-09-24).
--
-- The row must exist before the client ships: responses.skill_id and
-- worksheet_completions.skill_id are foreign keys.
--
-- Safe to run twice. Apply in the Supabase SQL editor; the final block raises
-- (rolling the statement back) if the result is not exactly as intended.

insert into public.skills
    (id, display_name, domain, category, max_level, is_active, sort_order, base_weight,
     mastery_type, mastery_questions, mastery_days, mastery_accuracy)
values
    ('multiplication', 'Multiplication', 'quantitative', 'challenge', 10, true, 25, 4, 'mastery', 5, 3, 0.80)
on conflict (id) do update set
    display_name      = excluded.display_name,
    domain            = excluded.domain,
    category          = excluded.category,
    max_level         = excluded.max_level,
    is_active         = excluded.is_active,
    base_weight       = excluded.base_weight,
    mastery_type      = excluded.mastery_type,
    mastery_questions = excluded.mastery_questions,
    mastery_days      = excluded.mastery_days,
    mastery_accuracy  = excluded.mastery_accuracy;

insert into public.child_skill_settings
    (child_id, skill_id, difficulty_level, practice_question_count, challenge_question_count, content_level)
select c.id, 'multiplication', 1, 4, 5, 1
from public.children c
where not exists (
    select 1 from public.child_skill_settings x
    where x.child_id = c.id and x.skill_id = 'multiplication'
);

insert into public.child_skill_progress (child_id, skill_id, unlocked_level, current_level)
select c.id, 'multiplication', 1, 1
from public.children c
where not exists (
    select 1 from public.child_skill_progress p
    where p.child_id = c.id and p.skill_id = 'multiplication'
);

do $$
declare
    v_skill    integer;
    v_children integer;
    v_settings integer;
    v_progress integer;
begin
    select count(*) into v_skill
    from public.skills
    where id = 'multiplication' and is_active and domain = 'quantitative'
      and max_level = 10 and mastery_type = 'mastery';

    if v_skill <> 1 then
        raise exception 'multiplication skill row is missing or not as intended';
    end if;

    select count(*) into v_children from public.children;
    select count(*) into v_settings from public.child_skill_settings where skill_id = 'multiplication';
    select count(*) into v_progress from public.child_skill_progress where skill_id = 'multiplication';

    if v_settings <> v_children or v_progress <> v_children then
        raise exception 'expected % settings and progress rows, found % and %', v_children, v_settings, v_progress;
    end if;

    raise notice 'multiplication added: 10 levels, % children', v_children;
end $$;
