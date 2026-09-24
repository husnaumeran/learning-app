-- 20260924_05_letter_joining.sql
--
-- Adds the joining rung: urdu_joining and arabic_joining.
--
-- Why: goal (c) asks for the same read/write/understand depth in Arabic and Urdu
-- as in English, and the ladder in docs/LETTERS_TO_WORDS.md has four rungs —
-- letters, joining, words, sight words. Rung 2 did not exist in any language.
-- In Arabic script a letter changes shape depending on where it sits in a word,
-- and roughly a third of the letters never connect to what follows them, breaking
-- a word into groups. That is the single most confusing thing about the script and
-- the child had no way to learn it: the Qaida teaches isolated letters with
-- harakat, and the word worksheets jump straight to whole words.
--
-- Four levels, matching js/worksheets/joining.js:
--   L1 the four shapes of one letter      L3 join three letters
--   L2 join two letters                   L4 break a joined word back apart
--
-- Slotted directly after the letters rung in each language (sort_order 205 after
-- urdu_reading's 200, 272 after arabic_qaida's 270) so the queue offers it once
-- letters are underway. base_weight 4 matches the other core language rungs.
--
-- Safe to run twice. Apply in the Supabase SQL editor; the final block raises
-- (rolling the statement back) if the result is not exactly as intended.

insert into public.skills
    (id, display_name, domain, category, max_level, is_active, sort_order, base_weight,
     mastery_type, mastery_questions, mastery_days, mastery_accuracy)
values
    ('urdu_joining',   'اردو Urdu Joining',    'urdu',   'challenge', 4, true, 205, 4, 'mastery', 5, 3, 0.80),
    ('arabic_joining', 'عربی Arabic Joining',  'arabic', 'challenge', 4, true, 272, 4, 'mastery', 5, 3, 0.80)
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

-- Every child starts at level 1 on a brand-new skill. practice_question_count is
-- 4 rather than the column default of 1: a level is a teaching card plus questions,
-- and one question is not a practice session. The worksheet enforces its own floor
-- of 3 regardless, so this only affects how many it offers above that.
insert into public.child_skill_settings
    (child_id, skill_id, difficulty_level, practice_question_count, challenge_question_count, content_level)
select c.id, s.id, 1, 4, 5, 1
from public.children c
cross join (values ('urdu_joining'), ('arabic_joining')) as s(id)
where not exists (
    select 1 from public.child_skill_settings x
    where x.child_id = c.id and x.skill_id = s.id
);

insert into public.child_skill_progress (child_id, skill_id, unlocked_level, current_level)
select c.id, s.id, 1, 1
from public.children c
cross join (values ('urdu_joining'), ('arabic_joining')) as s(id)
where not exists (
    select 1 from public.child_skill_progress p
    where p.child_id = c.id and p.skill_id = s.id
);

do $$
declare
    v_skills   integer;
    v_children integer;
    v_settings integer;
    v_progress integer;
    v_bad      integer;
begin
    select count(*) into v_skills
    from public.skills
    where id in ('urdu_joining', 'arabic_joining')
      and max_level = 4 and mastery_type = 'mastery' and is_active;

    if v_skills <> 2 then
        raise exception 'expected 2 active 4-level joining skills, found %', v_skills;
    end if;

    select count(*) into v_children from public.children;

    select count(*) into v_settings
    from public.child_skill_settings
    where skill_id in ('urdu_joining', 'arabic_joining');

    select count(*) into v_progress
    from public.child_skill_progress
    where skill_id in ('urdu_joining', 'arabic_joining');

    if v_settings <> v_children * 2 then
        raise exception 'expected % joining settings rows, found %', v_children * 2, v_settings;
    end if;

    if v_progress <> v_children * 2 then
        raise exception 'expected % joining progress rows, found %', v_children * 2, v_progress;
    end if;

    select count(*) into v_bad
    from public.child_skill_progress
    where skill_id in ('urdu_joining', 'arabic_joining')
      and (unlocked_level not between 1 and 4
        or current_level  not between 1 and 4
        or current_level  > unlocked_level);

    if v_bad > 0 then
        raise exception '% joining progress rows are outside 1..4 or above their unlocked level', v_bad;
    end if;

    raise notice 'joining rung added: 2 skills, % children, % settings rows, % progress rows',
        v_children, v_settings, v_progress;
end $$;
