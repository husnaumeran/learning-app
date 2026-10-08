-- 20261008_09_phonics_video.sql
--
-- Adds phonics_video so the "ABC Phonics Song" the owner chose can be scheduled
-- into the day (owner, 2026-10-08), not only opened from the worksheet grid.
--
-- It is a watch-together video: mastery_type 'practice', category 'fun', no levels.
-- Watching is recorded as passive and never as a correct answer, so the mastery
-- engine ignores it. base_weight 2 keeps it an occasional item, like Urdu Videos.
-- The row must exist before the client ships: responses.skill_id and
-- worksheet_completions.skill_id are foreign keys.
--
-- Safe to run twice. The final block raises if the result is not as intended.

insert into public.skills
    (id, display_name, domain, category, max_level, is_active, sort_order, base_weight, mastery_type)
values
    ('phonics_video', 'ABC Phonics Song', 'literacy', 'fun', null, true, 135, 2, 'practice')
on conflict (id) do update set
    display_name = excluded.display_name,
    domain       = excluded.domain,
    category     = excluded.category,
    is_active    = excluded.is_active,
    base_weight  = excluded.base_weight,
    mastery_type = excluded.mastery_type;

insert into public.child_skill_settings
    (child_id, skill_id, difficulty_level, practice_question_count, challenge_question_count, content_level)
select c.id, 'phonics_video', 1, 1, 5, 1
from public.children c
where not exists (
    select 1 from public.child_skill_settings x
    where x.child_id = c.id and x.skill_id = 'phonics_video'
);

do $$
declare
    v_skill integer;
begin
    select count(*) into v_skill
    from public.skills
    where id = 'phonics_video' and is_active and mastery_type = 'practice' and domain = 'literacy';

    if v_skill <> 1 then
        raise exception 'phonics_video skill row is missing or not as intended';
    end if;

    raise notice 'phonics_video added';
end $$;
