-- 20261008_11_which_sign_and_measurement.sql
--
-- Adds two practice-only skills so their worksheets can record answers:
--
--   which_sign   Sign sorting. The child hears a little story and chooses + or −,
--                with no calculating. It is the step before subtraction returns,
--                after introducing subtraction left her unable to tell the signs
--                apart (owner, 2026-10-08).
--   measurement  Measurement basics: length, measuring with blocks, weight,
--                capacity, time of day. Opened by hand from the worksheet grid.
--
-- Neither is scheduled yet. The client keeps both in PAUSED_SKILLS (js/menu.js):
-- the owner wants addition solid before anything new enters the daily flow.
-- mastery_type 'practice', no levels, so the mastery engine ignores them.
--
-- The rows must exist before the client ships: responses.skill_id and
-- worksheet_completions.skill_id are foreign keys.
--
-- Safe to run twice. The final block raises if the result is not as intended.

insert into public.skills
    (id, display_name, domain, category, max_level, is_active, sort_order, base_weight, mastery_type)
values
    ('which_sign',  'Which Sign?',  'quantitative', 'challenge', null, true, 22, 3, 'practice'),
    ('measurement', 'Measurement',  'quantitative', 'challenge', null, true, 70, 3, 'practice')
on conflict (id) do update set
    display_name = excluded.display_name,
    domain       = excluded.domain,
    category     = excluded.category,
    is_active    = excluded.is_active,
    base_weight  = excluded.base_weight,
    mastery_type = excluded.mastery_type;

insert into public.child_skill_settings
    (child_id, skill_id, difficulty_level, practice_question_count, challenge_question_count, content_level)
select c.id, s.id, 1, 6, 5, 1
from public.children c
cross join (values ('which_sign'), ('measurement')) as s(id)
where not exists (
    select 1 from public.child_skill_settings x
    where x.child_id = c.id and x.skill_id = s.id
);

do $$
declare
    v_skills integer;
begin
    select count(*) into v_skills
    from public.skills
    where id in ('which_sign', 'measurement') and is_active
      and mastery_type = 'practice' and domain = 'quantitative';

    if v_skills <> 2 then
        raise exception 'expected which_sign and measurement skill rows, found %', v_skills;
    end if;

    raise notice 'which_sign and measurement added';
end $$;
