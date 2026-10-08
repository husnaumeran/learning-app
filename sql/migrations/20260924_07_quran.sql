-- 20260924_07_quran.sql
--
-- Adds the Quran memorisation skill, quran_memorize. Design: docs/QURAN.md.
--
-- Why: the owner asked for a Quran section built from their own earlier app,
-- husnaumeran/quran-memorize, whose method is "new verse alone ×N, then everything
-- so far together ×N". That app had no persistence and no idea of "memorised", so
-- here each surah is a level, in the conventional children's order (Al-Fatiha, then
-- Juz Amma from An-Nas backwards: fifteen surahs), and a surah unlocks the next
-- after a parent-judged "recite it to me" check.
--
-- No engine change is needed. mastery_evidence is runner-agnostic: it counts
-- first-attempt, non-passive answers marked purpose 'check' at a level, grouped by
-- day. The Quran worksheet records one such answer per verse, so:
--   mastery_questions = 3    the shortest surahs (An-Nasr, Al-Kawthar, Al-Asr) have 3 verses
--   mastery_accuracy  = 0.80 the app-wide bar; for a 3-verse surah that means all three
--   mastery_days      = 3    three separate days of reciting it well
-- The daily multiple-choice test never picks this skill: it has no generator, so
-- canBuildDailyTest() refuses it. Its check lives inside the worksheet by design.
--
-- The row must exist before the client ships: responses.skill_id is a foreign key,
-- so every recorded answer would fail without it.
--
-- Safe to run twice. Apply in the Supabase SQL editor; the final block raises
-- (rolling the statement back) if the result is not exactly as intended.

insert into public.skills
    (id, display_name, domain, category, max_level, is_active, sort_order, base_weight,
     mastery_type, mastery_questions, mastery_days, mastery_accuracy)
values
    ('quran_memorize', 'قرآن Quran', 'arabic', 'challenge', 15, true, 285, 4, 'mastery', 3, 3, 0.80)
on conflict (id) do update set
    display_name      = excluded.display_name,
    domain            = excluded.domain,
    category          = excluded.category,
    max_level         = excluded.max_level,
    is_active         = excluded.is_active,
    sort_order        = excluded.sort_order,
    base_weight       = excluded.base_weight,
    mastery_type      = excluded.mastery_type,
    mastery_questions = excluded.mastery_questions,
    mastery_days      = excluded.mastery_days,
    mastery_accuracy  = excluded.mastery_accuracy;

insert into public.child_skill_settings
    (child_id, skill_id, difficulty_level, practice_question_count, challenge_question_count, content_level)
select c.id, 'quran_memorize', 1, 3, 5, 1
from public.children c
where not exists (
    select 1 from public.child_skill_settings x
    where x.child_id = c.id and x.skill_id = 'quran_memorize'
);

insert into public.child_skill_progress (child_id, skill_id, unlocked_level, current_level)
select c.id, 'quran_memorize', 1, 1
from public.children c
where not exists (
    select 1 from public.child_skill_progress p
    where p.child_id = c.id and p.skill_id = 'quran_memorize'
);

do $$
declare
    v_skill    integer;
    v_children integer;
    v_settings integer;
    v_progress integer;
    v_bad      integer;
begin
    select count(*) into v_skill
    from public.skills
    where id = 'quran_memorize' and is_active and domain = 'arabic'
      and max_level = 15 and mastery_type = 'mastery'
      and mastery_questions = 3 and mastery_days = 3 and mastery_accuracy = 0.80;

    if v_skill <> 1 then
        raise exception 'quran_memorize skill row is missing or not as intended';
    end if;

    select count(*) into v_children from public.children;
    select count(*) into v_settings from public.child_skill_settings where skill_id = 'quran_memorize';
    select count(*) into v_progress from public.child_skill_progress where skill_id = 'quran_memorize';

    if v_settings <> v_children or v_progress <> v_children then
        raise exception 'expected % settings and progress rows, found % and %', v_children, v_settings, v_progress;
    end if;

    select count(*) into v_bad
    from public.child_skill_progress
    where skill_id = 'quran_memorize'
      and (unlocked_level not between 1 and 15
        or current_level  not between 1 and 15
        or current_level  > unlocked_level);

    if v_bad > 0 then
        raise exception '% quran progress rows are out of range', v_bad;
    end if;

    raise notice 'quran_memorize added: 15 levels, % children', v_children;
end $$;
