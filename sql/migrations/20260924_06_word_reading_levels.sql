-- 20260924_06_word_reading_levels.sql
--
-- Gives the three word-reading skills levels and makes them real mastery skills.
--
-- Why: two_letter_words, three_letter_words and urdu_2letter were flashcards.
-- Every card the child clicked past counted as correct and each run wrote a
-- worksheet_completions row with a perfect score — about 230 since March 2026,
-- every one perfect — so the parent dashboard reported six months of flawless
-- reading on worksheets that never once checked whether a child could read a word.
-- They were mastery_type 'practice' with no levels, so the engine ignored them, and
-- none had a daily-test generator, so they could never take part in mastery at all.
-- The client rebuild (js/worksheets/wordreading.js, docs/LETTERS_TO_WORDS.md rung 3)
-- teaches, then checks honestly; this migration gives it levels to climb:
--
--   three_letter_words  4 levels   short a / short i,o / short u,e / mixed vowels
--   two_letter_words    3 levels   decodable / vowel says its name / memorised
--   urdu_2letter        3 levels   zabar / zer and pesh / no harakat at all
--
-- urdu_2letter also moves from 'fun' to 'challenge' with base_weight 4, matching
-- the English word skills. Goal (c) asks for the same depth in Urdu as in English,
-- and a checked reading skill is not a 'fun' extra.
--
-- No level is carried forward because none was earned: before this migration only
-- three progress rows existed across all three skills, and every one was at level 1.
-- Existing practice_question_count values are left alone — a parent may have tuned
-- them, and the worksheet enforces its own floor of four checks.
--
-- Safe to run twice. Apply in the Supabase SQL editor; the final block raises
-- (rolling the statement back) if the result is not exactly as intended.

update public.skills
set max_level = 4, mastery_type = 'mastery',
    mastery_questions = 5, mastery_days = 3, mastery_accuracy = 0.80
where id = 'three_letter_words';

update public.skills
set max_level = 3, mastery_type = 'mastery',
    mastery_questions = 5, mastery_days = 3, mastery_accuracy = 0.80
where id = 'two_letter_words';

update public.skills
set max_level = 3, mastery_type = 'mastery',
    mastery_questions = 5, mastery_days = 3, mastery_accuracy = 0.80,
    category = 'challenge', base_weight = 4
where id = 'urdu_2letter';

insert into public.child_skill_progress (child_id, skill_id, unlocked_level, current_level)
select c.id, s.id, 1, 1
from public.children c
cross join (values ('two_letter_words'), ('three_letter_words'), ('urdu_2letter')) as s(id)
where not exists (
    select 1 from public.child_skill_progress p
    where p.child_id = c.id and p.skill_id = s.id
);

insert into public.child_skill_settings
    (child_id, skill_id, difficulty_level, practice_question_count, challenge_question_count, content_level)
select c.id, s.id, 1, 4, 5, 1
from public.children c
cross join (values ('two_letter_words'), ('three_letter_words'), ('urdu_2letter')) as s(id)
where not exists (
    select 1 from public.child_skill_settings x
    where x.child_id = c.id and x.skill_id = s.id
);

-- Clamp into each skill's new range. greatest(..., 1) never lowers a reached level;
-- least(..., max_level) only matters if a row somehow sits above the new ceiling.
update public.child_skill_progress p
set unlocked_level = least(greatest(p.unlocked_level, 1), s.max_level),
    current_level  = least(greatest(p.current_level, 1), least(greatest(p.unlocked_level, 1), s.max_level))
from public.skills s
where s.id = p.skill_id
  and p.skill_id in ('two_letter_words', 'three_letter_words', 'urdu_2letter')
  and (p.unlocked_level not between 1 and s.max_level
    or p.current_level  not between 1 and s.max_level
    or p.current_level  > p.unlocked_level);

do $$
declare
    v_skills   integer;
    v_children integer;
    v_progress integer;
    v_settings integer;
    v_bad      integer;
begin
    select count(*) into v_skills
    from public.skills
    where mastery_type = 'mastery' and is_active and category = 'challenge'
      and ((id = 'three_letter_words' and max_level = 4)
        or (id = 'two_letter_words'   and max_level = 3)
        or (id = 'urdu_2letter'       and max_level = 3 and base_weight = 4));

    if v_skills <> 3 then
        raise exception 'expected 3 levelled word-reading skills, found %', v_skills;
    end if;

    select count(*) into v_children from public.children;

    select count(*) into v_progress
    from public.child_skill_progress
    where skill_id in ('two_letter_words', 'three_letter_words', 'urdu_2letter');

    select count(*) into v_settings
    from public.child_skill_settings
    where skill_id in ('two_letter_words', 'three_letter_words', 'urdu_2letter');

    if v_progress <> v_children * 3 then
        raise exception 'expected % word-reading progress rows, found %', v_children * 3, v_progress;
    end if;

    if v_settings <> v_children * 3 then
        raise exception 'expected % word-reading settings rows, found %', v_children * 3, v_settings;
    end if;

    select count(*) into v_bad
    from public.child_skill_progress p
    join public.skills s on s.id = p.skill_id
    where p.skill_id in ('two_letter_words', 'three_letter_words', 'urdu_2letter')
      and (p.unlocked_level not between 1 and s.max_level
        or p.current_level  not between 1 and s.max_level
        or p.current_level  > p.unlocked_level);

    if v_bad > 0 then
        raise exception '% word-reading progress rows are out of range', v_bad;
    end if;

    raise notice 'word reading levelled: 3 skills, % children, % progress rows, % settings rows',
        v_children, v_progress, v_settings;
end $$;
