-- 20261008_10_urdu_tricky_words.sql
--
-- Adds urdu_tricky_words: Urdu words that cannot be sounded out letter by letter
-- (silent waw as in خود and خواب; نہیں, میں, یہ, وہ; the ھ sounds; فوراً, بالکل).
-- The owner asked for the list after the sight-words research found Urdu has no
-- sight-word tradition but does have a small set of must-memorise spellings.
--
-- mastery_type 'practice', no levels: without an Urdu voice on the device the only
-- honest checks are the parent-judged "read to me" and a few picture words, so the
-- skill has no multiple-choice test and nothing for the engine to unlock.
--
-- The row must exist before the client ships: responses.skill_id and
-- worksheet_completions.skill_id are foreign keys.
--
-- Safe to run twice. The final block raises if the result is not as intended.

insert into public.skills
    (id, display_name, domain, category, max_level, is_active, sort_order, base_weight, mastery_type)
values
    ('urdu_tricky_words', 'اردو Urdu Tricky Words', 'urdu', 'challenge', null, true, 225, 3, 'practice')
on conflict (id) do update set
    display_name = excluded.display_name,
    domain       = excluded.domain,
    category     = excluded.category,
    is_active    = excluded.is_active,
    base_weight  = excluded.base_weight,
    mastery_type = excluded.mastery_type;

insert into public.child_skill_settings
    (child_id, skill_id, difficulty_level, practice_question_count, challenge_question_count, content_level)
select c.id, 'urdu_tricky_words', 1, 4, 5, 1
from public.children c
where not exists (
    select 1 from public.child_skill_settings x
    where x.child_id = c.id and x.skill_id = 'urdu_tricky_words'
);

do $$
declare
    v_skill integer;
begin
    select count(*) into v_skill
    from public.skills
    where id = 'urdu_tricky_words' and is_active and mastery_type = 'practice' and domain = 'urdu';

    if v_skill <> 1 then
        raise exception 'urdu_tricky_words skill row is missing or not as intended';
    end if;

    raise notice 'urdu_tricky_words added';
end $$;
