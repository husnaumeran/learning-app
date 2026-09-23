-- Tiny Thinkers — production database schema (public)
-- Generated 2026-09-14 by sql/dump_schema.sql. Do not hand-edit:
-- change the database through sql/migrations/, then regenerate this file.

-- =====================================================================
-- EXTENSIONS
-- =====================================================================

create extension if not exists pg_stat_statements with schema extensions;

create extension if not exists pgcrypto with schema extensions;

create extension if not exists supabase_vault with schema vault;

create extension if not exists "uuid-ossp" with schema extensions;

-- =====================================================================
-- TABLES
-- =====================================================================

create table public.child_skill_progress (
  id uuid default gen_random_uuid() not null,
  child_id uuid not null,
  skill_id text not null,
  current_level integer default 1 not null,
  unlocked_level integer default 1 not null,
  sessions_at_80_plus integer default 0 not null,
  mastery_state text default 'learning'::text not null,
  last_mastery_check_at timestamp with time zone,
  updated_at timestamp with time zone default now() not null
);

create table public.child_skill_settings (
  id uuid default gen_random_uuid() not null,
  child_id uuid not null,
  skill_id text not null,
  focus_number integer,
  streak_up integer default 0 not null,
  streak_down integer default 0 not null,
  updated_at timestamp with time zone default now() not null,
  difficulty_level integer default 1 not null,
  practice_question_count integer default 1 not null,
  challenge_question_count integer default 5 not null,
  content_level integer default 1
);

create table public.children (
  id uuid default gen_random_uuid() not null,
  parent_id uuid not null,
  name text not null,
  avatar text,
  date_of_birth date,
  preferred_language text default 'en'::text not null,
  focus_number integer default 1 not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.learning_item_strength (
  id uuid default gen_random_uuid() not null,
  child_id uuid not null,
  skill_key text not null,
  item_key text not null,
  item_type text not null,
  strength_score integer default 0 not null,
  last_practiced_at timestamp with time zone,
  last_decay_at timestamp with time zone,
  attempts_count integer default 0 not null,
  correct_count integer default 0 not null,
  skip_count integer default 0 not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.parents (
  id uuid not null,
  display_name text,
  daily_limit integer default 10 not null,
  sound_on boolean default true not null,
  timezone text default 'America/Chicago'::text not null,
  preferred_language text default 'en'::text not null,
  onboarding_complete boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.question_bank (
  id text not null,
  skill_id text not null,
  level integer,
  prompt_data jsonb not null,
  correct_answer text not null,
  distractor_pool jsonb,
  tags text[],
  is_active boolean default true not null,
  version integer default 1 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.responses (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  child_id uuid not null,
  skill_id text not null,
  level integer,
  question_id text,
  question_version integer,
  question_data jsonb not null,
  choice_data jsonb,
  first_answer text,
  final_answer text,
  correct_answer text not null,
  attempt_count integer default 1 not null,
  is_correct boolean not null,
  is_first_try boolean not null,
  is_skipped boolean default false not null,
  response_time_ms integer,
  client_event_id text,
  client_created_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table public.review_queue (
  id uuid default gen_random_uuid() not null,
  child_id uuid not null,
  skill_id text not null,
  question_id text,
  question_version integer,
  question_data jsonb not null,
  source_response_id uuid,
  wrong_count integer default 1 not null,
  interval_days integer default 1 not null,
  next_review_at timestamp with time zone not null,
  last_reviewed_at timestamp with time zone,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.sessions (
  id uuid default gen_random_uuid() not null,
  child_id uuid not null,
  started_at timestamp with time zone default now() not null,
  ended_at timestamp with time zone,
  status text default 'in_progress'::text not null,
  device_id text,
  client_session_id text,
  client_created_at timestamp with time zone,
  app_version text,
  content_version text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  session_type text default 'daily_practice'::text not null,
  session_meta jsonb,
  queue_json jsonb,
  queue_index integer default 0,
  current_skill_id text,
  last_activity_at timestamp with time zone default now(),
  progress_json jsonb
);

create table public.skill_stats (
  id uuid default gen_random_uuid() not null,
  child_id uuid not null,
  skill_id text not null,
  level integer,
  total_attempts integer default 0 not null,
  correct_count integer default 0 not null,
  first_try_correct_count integer default 0 not null,
  skip_count integer default 0 not null,
  streak integer default 0 not null,
  avg_response_time_ms integer,
  mastery_score numeric,
  last_attempted_at timestamp with time zone,
  updated_at timestamp with time zone default now() not null
);

create table public.skills (
  id text not null,
  display_name text not null,
  domain text not null,
  category text default 'challenge'::text not null,
  max_level integer,
  is_active boolean default true not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  base_weight integer default 2
);

create table public.worksheet_completions (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  child_id uuid not null,
  skill_id text not null,
  score integer,
  total integer,
  created_at timestamp with time zone default now() not null
);

-- =====================================================================
-- CONSTRAINTS
-- =====================================================================

alter table public.child_skill_progress add constraint child_skill_progress_pkey PRIMARY KEY (id);

alter table public.child_skill_settings add constraint child_skill_settings_pkey PRIMARY KEY (id);

alter table public.children add constraint children_pkey PRIMARY KEY (id);

alter table public.learning_item_strength add constraint learning_item_strength_pkey PRIMARY KEY (id);

alter table public.parents add constraint parents_pkey PRIMARY KEY (id);

alter table public.question_bank add constraint question_bank_pkey PRIMARY KEY (id);

alter table public.responses add constraint responses_pkey PRIMARY KEY (id);

alter table public.review_queue add constraint review_queue_pkey PRIMARY KEY (id);

alter table public.sessions add constraint sessions_pkey PRIMARY KEY (id);

alter table public.skill_stats add constraint skill_stats_pkey PRIMARY KEY (id);

alter table public.skills add constraint skills_pkey PRIMARY KEY (id);

alter table public.worksheet_completions add constraint worksheet_completions_pkey PRIMARY KEY (id);

alter table public.child_skill_settings add constraint child_skill_settings_child_id_skill_id_key UNIQUE (child_id, skill_id);

alter table public.learning_item_strength add constraint learning_item_strength_child_id_skill_key_item_key_key UNIQUE (child_id, skill_key, item_key);

alter table public.child_skill_progress add constraint child_skill_progress_check CHECK ((current_level <= unlocked_level));

alter table public.child_skill_progress add constraint child_skill_progress_current_level_check CHECK ((current_level >= 1));

alter table public.child_skill_progress add constraint child_skill_progress_mastery_state_check CHECK ((mastery_state = ANY (ARRAY['locked'::text, 'learning'::text, 'mastered'::text])));

alter table public.child_skill_progress add constraint child_skill_progress_sessions_at_80_plus_check CHECK ((sessions_at_80_plus >= 0));

alter table public.child_skill_progress add constraint child_skill_progress_unlocked_level_check CHECK ((unlocked_level >= 1));

alter table public.child_skill_settings add constraint child_skill_settings_streak_down_check CHECK ((streak_down >= 0));

alter table public.child_skill_settings add constraint child_skill_settings_streak_up_check CHECK ((streak_up >= 0));

alter table public.child_skill_settings add constraint css_challenge_count_check CHECK (((challenge_question_count >= 1) AND (challenge_question_count <= 20)));

alter table public.child_skill_settings add constraint css_difficulty_level_check CHECK (((difficulty_level >= 1) AND (difficulty_level <= 50)));

alter table public.child_skill_settings add constraint css_practice_count_check CHECK (((practice_question_count >= 1) AND (practice_question_count <= 20)));

alter table public.children add constraint children_focus_number_check CHECK (((focus_number >= 1) AND (focus_number <= 50)));

alter table public.children add constraint children_preferred_language_check CHECK ((preferred_language = ANY (ARRAY['en'::text, 'ur'::text, 'ar'::text])));

alter table public.parents add constraint parents_daily_limit_check CHECK (((daily_limit >= 1) AND (daily_limit <= 100)));

alter table public.question_bank add constraint question_bank_version_check CHECK ((version >= 1));

alter table public.responses add constraint responses_attempt_count_check CHECK ((attempt_count >= 1));

alter table public.responses add constraint responses_check CHECK ((NOT ((is_skipped = true) AND (is_correct = true))));

alter table public.responses add constraint responses_question_version_check CHECK (((question_version IS NULL) OR (question_version >= 1)));

alter table public.responses add constraint responses_response_time_ms_check CHECK (((response_time_ms IS NULL) OR (response_time_ms >= 0)));

alter table public.review_queue add constraint review_queue_interval_days_check CHECK ((interval_days > 0));

alter table public.review_queue add constraint review_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'done'::text, 'expired'::text])));

alter table public.review_queue add constraint review_queue_wrong_count_check CHECK ((wrong_count >= 1));

alter table public.sessions add constraint sessions_check CHECK (((ended_at IS NULL) OR (ended_at >= started_at)));

alter table public.sessions add constraint sessions_session_type_check CHECK ((session_type = ANY (ARRAY['daily_practice'::text, 'weekend_assessment'::text])));

alter table public.sessions add constraint sessions_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text])));

alter table public.skill_stats add constraint skill_stats_avg_response_time_ms_check CHECK (((avg_response_time_ms IS NULL) OR (avg_response_time_ms >= 0)));

alter table public.skill_stats add constraint skill_stats_correct_count_check CHECK ((correct_count >= 0));

alter table public.skill_stats add constraint skill_stats_first_try_correct_count_check CHECK ((first_try_correct_count >= 0));

alter table public.skill_stats add constraint skill_stats_skip_count_check CHECK ((skip_count >= 0));

alter table public.skill_stats add constraint skill_stats_streak_check CHECK ((streak >= 0));

alter table public.skill_stats add constraint skill_stats_total_attempts_check CHECK ((total_attempts >= 0));

alter table public.skills add constraint skills_category_check CHECK ((category = ANY (ARRAY['challenge'::text, 'fun'::text])));

alter table public.skills add constraint skills_domain_check CHECK ((domain = ANY (ARRAY['verbal'::text, 'quantitative'::text, 'nonverbal'::text, 'literacy'::text, 'urdu'::text, 'arabic'::text])));

alter table public.child_skill_progress add constraint child_skill_progress_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

alter table public.child_skill_progress add constraint child_skill_progress_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id);

alter table public.child_skill_settings add constraint child_skill_settings_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

alter table public.child_skill_settings add constraint child_skill_settings_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id);

alter table public.children add constraint children_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;

alter table public.learning_item_strength add constraint learning_item_strength_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id);

alter table public.parents add constraint parents_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.question_bank add constraint question_bank_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id);

alter table public.responses add constraint responses_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

alter table public.responses add constraint responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE SET NULL;

alter table public.responses add constraint responses_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

alter table public.responses add constraint responses_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id);

alter table public.review_queue add constraint review_queue_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

alter table public.review_queue add constraint review_queue_question_id_fkey FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE SET NULL;

alter table public.review_queue add constraint review_queue_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id);

alter table public.review_queue add constraint review_queue_source_response_id_fkey FOREIGN KEY (source_response_id) REFERENCES responses(id) ON DELETE SET NULL;

alter table public.sessions add constraint sessions_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

alter table public.skill_stats add constraint skill_stats_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

alter table public.skill_stats add constraint skill_stats_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id);

alter table public.worksheet_completions add constraint worksheet_completions_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;

alter table public.worksheet_completions add constraint worksheet_completions_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

alter table public.worksheet_completions add constraint worksheet_completions_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id);

-- =====================================================================
-- INDEXES
-- =====================================================================

CREATE INDEX idx_csp_child ON public.child_skill_progress USING btree (child_id);

CREATE UNIQUE INDEX uq_csp_child_skill ON public.child_skill_progress USING btree (child_id, skill_id);

CREATE INDEX idx_css_child ON public.child_skill_settings USING btree (child_id);

CREATE INDEX idx_children_parent ON public.children USING btree (parent_id);

CREATE INDEX idx_qbank_active_skill_level ON public.question_bank USING btree (skill_id, level) WHERE (is_active = true);

CREATE INDEX idx_qbank_skill_level ON public.question_bank USING btree (skill_id, level);

CREATE INDEX idx_responses_child ON public.responses USING btree (child_id);

CREATE INDEX idx_responses_child_skill_level ON public.responses USING btree (child_id, skill_id, level);

CREATE UNIQUE INDEX idx_responses_client_event ON public.responses USING btree (client_event_id) WHERE (client_event_id IS NOT NULL);

CREATE INDEX idx_responses_question ON public.responses USING btree (question_id);

CREATE INDEX idx_responses_session ON public.responses USING btree (session_id);

CREATE INDEX idx_responses_skill ON public.responses USING btree (skill_id);

CREATE INDEX idx_review_child_next ON public.review_queue USING btree (child_id, next_review_at) WHERE (status = 'pending'::text);

CREATE UNIQUE INDEX uq_review_pending_child_question ON public.review_queue USING btree (child_id, skill_id, question_id, status) WHERE ((status = 'pending'::text) AND (question_id IS NOT NULL));

CREATE INDEX idx_sessions_child ON public.sessions USING btree (child_id);

CREATE UNIQUE INDEX idx_sessions_client_session_id ON public.sessions USING btree (client_session_id) WHERE (client_session_id IS NOT NULL);

CREATE INDEX idx_skill_stats_child ON public.skill_stats USING btree (child_id);

CREATE UNIQUE INDEX uq_skill_stats_child_skill_level ON public.skill_stats USING btree (child_id, skill_id, COALESCE(level, 0));

CREATE INDEX idx_wc_child ON public.worksheet_completions USING btree (child_id);

CREATE INDEX idx_wc_child_created ON public.worksheet_completions USING btree (child_id, created_at);

CREATE INDEX idx_wc_session ON public.worksheet_completions USING btree (session_id);

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.finalize_session(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
  v_child_id        uuid;
  v_parent_id       uuid;
  v_session_status  text;
  v_slice           record;
  v_attempted       int;
  v_correct         int;
  v_accuracy        numeric;
  v_qualifies       boolean;
  v_csp_id          uuid;
  v_old_sessions_80 int;
  v_old_unlocked    int;
  v_max_level       int;
  v_new_unlocked    int;
  v_unlocked        boolean;
  v_category        text;
  v_result          jsonb := '[]'::jsonb;
  v_slice_result    jsonb;
begin
  -- 1. Validate session exists and caller owns it
  select s.child_id, s.status into v_child_id, v_session_status
    from sessions s where s.id = p_session_id
    for update;

  if v_child_id is null then
    raise exception 'Session % not found', p_session_id;
  end if;

  select parent_id into v_parent_id from children where id = v_child_id;
  if v_parent_id <> auth.uid() then
    raise exception 'Unauthorized: caller does not own child for session %', p_session_id;
  end if;

  if v_session_status <> 'in_progress' then
    return jsonb_build_object(
      'session_id', p_session_id,
      'status',     v_session_status,
      'already_finalized', true,
      'slices',     '[]'::jsonb
    );
  end if;

  -- 2. Mark session completed
  update sessions set
    status   = 'completed',
    ended_at = now()
  where id = p_session_id;

  -- 3. Evaluate each (skill_id, level) slice — ALL skills now
  for v_slice in
    select
      r.skill_id,
      r.level,
      sk.category,
      count(*)                              as attempted,
      count(*) filter (where r.is_correct)  as correct
    from responses r
    join skills sk on sk.id = r.skill_id
    where r.session_id = p_session_id
    group by r.skill_id, r.level, sk.category
  loop
    v_attempted := v_slice.attempted;
    v_correct   := v_slice.correct;
    v_accuracy  := v_correct::numeric / v_attempted;
    v_category  := v_slice.category;

    v_qualifies := (v_attempted >= 5 and v_accuracy >= 0.80);
    v_unlocked  := false;

    -- Only do progression logic for challenge skills
    if v_category = 'challenge' then
      select max_level into v_max_level
        from skills where id = v_slice.skill_id;

      select id, sessions_at_80_plus, unlocked_level
        into v_csp_id, v_old_sessions_80, v_old_unlocked
        from child_skill_progress
        where child_id = v_child_id
          and skill_id = v_slice.skill_id
        for update;

      if v_csp_id is not null then
        if v_qualifies then
          v_old_sessions_80 := v_old_sessions_80 + 1;
        else
          v_old_sessions_80 := 0;
        end if;

        v_new_unlocked := v_old_unlocked;

        if v_max_level is not null and v_old_sessions_80 >= 3 then
          if v_old_unlocked < v_max_level then
            v_new_unlocked := least(v_old_unlocked + 1, v_max_level);
            v_unlocked := true;
          end if;
          v_old_sessions_80 := 0;
        end if;

        update child_skill_progress set
          sessions_at_80_plus   = v_old_sessions_80,
          unlocked_level        = v_new_unlocked,
          mastery_state         = case
                                    when v_max_level is not null and v_new_unlocked >= v_max_level
                                      then 'mastered'
                                    else 'learning'
                                  end,
          last_mastery_check_at = now()
        where id = v_csp_id;
      else
        insert into child_skill_progress (
          child_id, skill_id, current_level, unlocked_level,
          sessions_at_80_plus, mastery_state, last_mastery_check_at
        ) values (
          v_child_id, v_slice.skill_id,
          coalesce(v_slice.level, 1),
          coalesce(v_slice.level, 1),
          case when v_qualifies then 1 else 0 end,
          'learning',
          now()
        );

      end if;
    end if;  -- end challenge-only block

    v_slice_result := jsonb_build_object(
      'skill_id',       v_slice.skill_id,
      'level',          v_slice.level,
      'category',       v_category,
      'attempted',      v_attempted,
      'correct',        v_correct,
      'accuracy',       round(v_accuracy, 2),
      'qualifies',      v_qualifies,
      'level_unlocked', v_unlocked
    );

    v_result := v_result || v_slice_result;
  end loop;

  return jsonb_build_object(
    'session_id', p_session_id,
    'status',     'completed',
    'slices',     v_result
  );
end;$function$;

CREATE OR REPLACE FUNCTION public.get_daily_status(p_child_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_parent_id uuid;
  v_tz text;
  v_today date;
  v_completed int;
  v_active_session_id uuid;
begin
  -- Validate ownership
  select parent_id into v_parent_id from children where id = p_child_id;
  if v_parent_id <> auth.uid() then
    raise exception 'Unauthorized';
  end if;

  -- Get parent timezone
  select timezone into v_tz from parents where id = v_parent_id;
  v_today := (now() at time zone coalesce(v_tz, 'America/Chicago'))::date;

  -- Count today's completed worksheets
  select count(*) into v_completed
  from worksheet_completions
  where child_id = p_child_id
    and (created_at at time zone coalesce(v_tz, 'America/Chicago'))::date = v_today;

  -- Find active session
  select id into v_active_session_id
  from sessions
  where child_id = p_child_id and status = 'in_progress'
  order by started_at desc limit 1;

  return jsonb_build_object(
    'completed_today', v_completed,
    'active_session_id', v_active_session_id
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.parent_of_child(child_uuid uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select parent_id from children where id = child_uuid;
$function$;

CREATE OR REPLACE FUNCTION public.record_response(p_session_id uuid, p_child_id uuid, p_skill_id text, p_question_data jsonb, p_correct_answer text, p_level integer DEFAULT NULL::integer, p_question_id text DEFAULT NULL::text, p_question_version integer DEFAULT NULL::integer, p_choice_data jsonb DEFAULT NULL::jsonb, p_first_answer text DEFAULT NULL::text, p_final_answer text DEFAULT NULL::text, p_attempt_count integer DEFAULT 1, p_is_correct boolean DEFAULT false, p_is_first_try boolean DEFAULT false, p_is_skipped boolean DEFAULT false, p_response_time_ms integer DEFAULT NULL::integer, p_client_event_id text DEFAULT NULL::text, p_client_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_response_id     uuid;
  v_session_child   uuid;
  v_parent_id       uuid;
  v_stat_id         uuid;
  v_old_total       int;
  v_old_avg_ms      int;
  v_rows_updated    int;
  v_include_time    boolean;
begin
  -- 0. Idempotency
  if p_client_event_id is not null then
    select id into v_response_id
      from responses where client_event_id = p_client_event_id;
    if found then return v_response_id; end if;
  end if;

  -- 1. Validate ownership
  select child_id into v_session_child from sessions where id = p_session_id;
  if v_session_child is null then raise exception 'Session % not found', p_session_id; end if;
  if v_session_child <> p_child_id then raise exception 'Session % does not belong to child %', p_session_id, p_child_id; end if;
  select parent_id into v_parent_id from children where id = p_child_id;
  if v_parent_id <> auth.uid() then raise exception 'Unauthorized: caller does not own child %', p_child_id; end if;

  -- 2. Insert response
  insert into responses (
    session_id, child_id, skill_id, level,
    question_id, question_version, question_data, choice_data,
    first_answer, final_answer, correct_answer,
    attempt_count, is_correct, is_first_try, is_skipped,
    response_time_ms, client_event_id, client_created_at
  ) values (
    p_session_id, p_child_id, p_skill_id, p_level,
    p_question_id, p_question_version, p_question_data, p_choice_data,
    p_first_answer, p_final_answer, p_correct_answer,
    p_attempt_count, p_is_correct, p_is_first_try, p_is_skipped,
    p_response_time_ms, p_client_event_id, p_client_created_at
  ) returning id into v_response_id;

  -- 3. Upsert skill_stats (FOR UPDATE + concurrency-safe fallback)
  v_include_time := (p_response_time_ms is not null and not p_is_skipped);

  select id, total_attempts, avg_response_time_ms
    into v_stat_id, v_old_total, v_old_avg_ms
    from skill_stats
    where child_id = p_child_id and skill_id = p_skill_id
      and coalesce(level, 0) = coalesce(p_level, 0)
    for update;

  if v_stat_id is not null then
    update skill_stats set
      total_attempts          = total_attempts + 1,
      correct_count           = correct_count + case when p_is_correct then 1 else 0 end,
      first_try_correct_count = first_try_correct_count + case when p_is_first_try and p_is_correct then 1 else 0 end,
      skip_count              = skip_count + case when p_is_skipped then 1 else 0 end,
      streak                  = case when p_is_correct then streak + 1 else 0 end,
      avg_response_time_ms    = case
                                  when v_include_time and v_old_avg_ms is not null
                                    then ((v_old_avg_ms * v_old_total) + p_response_time_ms) / (v_old_total + 1)
                                  when v_include_time then p_response_time_ms
                                  else avg_response_time_ms end,
      last_attempted_at       = now()
    where id = v_stat_id;
  else
    begin
      insert into skill_stats (
        child_id, skill_id, level, total_attempts, correct_count,
        first_try_correct_count, skip_count, streak, avg_response_time_ms, last_attempted_at
      ) values (
        p_child_id, p_skill_id, p_level, 1,
        case when p_is_correct then 1 else 0 end,
        case when p_is_first_try and p_is_correct then 1 else 0 end,
        case when p_is_skipped then 1 else 0 end,
        case when p_is_correct then 1 else 0 end,
        case when v_include_time then p_response_time_ms else null end, now()
      );
    exception when unique_violation then
      select id, total_attempts, avg_response_time_ms
        into v_stat_id, v_old_total, v_old_avg_ms
        from skill_stats
        where child_id = p_child_id and skill_id = p_skill_id
          and coalesce(level, 0) = coalesce(p_level, 0) for update;
      update skill_stats set
        total_attempts          = total_attempts + 1,
        correct_count           = correct_count + case when p_is_correct then 1 else 0 end,
        first_try_correct_count = first_try_correct_count + case when p_is_first_try and p_is_correct then 1 else 0 end,
        skip_count              = skip_count + case when p_is_skipped then 1 else 0 end,
        streak                  = case when p_is_correct then streak + 1 else 0 end,
        avg_response_time_ms    = case
                                    when v_include_time and v_old_avg_ms is not null
                                      then ((v_old_avg_ms * v_old_total) + p_response_time_ms) / (v_old_total + 1)
                                    when v_include_time then p_response_time_ms
                                    else avg_response_time_ms end,
        last_attempted_at       = now()
      where id = v_stat_id;
    end;
  end if;

  -- 4. Review queue: upsert if wrong (not skipped), concurrency-safe
  if not p_is_correct and not p_is_skipped then
    v_rows_updated := 0;
    if p_question_id is not null then
      update review_queue set
        wrong_count = wrong_count + 1, interval_days = 1,
        next_review_at = now() + interval '1 day'
      where child_id = p_child_id and skill_id = p_skill_id
        and question_id = p_question_id and status = 'pending';
      get diagnostics v_rows_updated = row_count;
    end if;
    if v_rows_updated = 0 then
      begin
        insert into review_queue (
          child_id, skill_id, question_id, question_version,
          question_data, source_response_id, wrong_count, interval_days, next_review_at
        ) values (
          p_child_id, p_skill_id, p_question_id, p_question_version,
          p_question_data, v_response_id, 1, 1, now() + interval '1 day'
        );
      exception when unique_violation then
        update review_queue set
          wrong_count = wrong_count + 1, interval_days = 1,
          next_review_at = now() + interval '1 day'
        where child_id = p_child_id and skill_id = p_skill_id
          and question_id = p_question_id and status = 'pending';
      end;
    end if;
  end if;

  return v_response_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_response_session_child()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  session_child_id uuid;
begin
  select child_id into session_child_id
    from sessions where id = new.session_id;

  if session_child_id is null then
    raise exception 'Invalid session_id: %', new.session_id;
  end if;

  if new.child_id <> session_child_id then
    raise exception 'child_id % does not match session child_id % for session %',
      new.child_id, session_child_id, new.session_id;
  end if;

  return new;
end;
$function$;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

CREATE TRIGGER trg_csp_updated BEFORE UPDATE ON public.child_skill_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_css_updated BEFORE UPDATE ON public.child_skill_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_children_updated BEFORE UPDATE ON public.children FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_parents_updated BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_qbank_updated BEFORE UPDATE ON public.question_bank FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_validate_response_session_child BEFORE INSERT OR UPDATE ON public.responses FOR EACH ROW EXECUTE FUNCTION validate_response_session_child();

CREATE TRIGGER trg_review_updated BEFORE UPDATE ON public.review_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_skill_stats_updated BEFORE UPDATE ON public.skill_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table public.child_skill_progress enable row level security;

alter table public.child_skill_settings enable row level security;

alter table public.children enable row level security;

alter table public.learning_item_strength enable row level security;

alter table public.parents enable row level security;

alter table public.question_bank enable row level security;

alter table public.responses enable row level security;

alter table public.review_queue enable row level security;

alter table public.sessions enable row level security;

alter table public.skill_stats enable row level security;

alter table public.skills enable row level security;

alter table public.worksheet_completions enable row level security;

-- =====================================================================
-- POLICIES
-- =====================================================================

create policy csp_own on public.child_skill_progress for all to public
  using ((parent_of_child(child_id) = auth.uid()))
  with check ((parent_of_child(child_id) = auth.uid()));

create policy css_own on public.child_skill_settings for all to public
  using ((parent_of_child(child_id) = auth.uid()))
  with check ((parent_of_child(child_id) = auth.uid()));

create policy children_own on public.children for all to public
  using ((parent_id = auth.uid()))
  with check ((parent_id = auth.uid()));

create policy "Parents can manage their children's item strength" on public.learning_item_strength for all to public
  using ((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))))
  with check ((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));

create policy parents_own on public.parents for all to public
  using ((id = auth.uid()))
  with check ((id = auth.uid()));

create policy qbank_read on public.question_bank for select to public
  using ((auth.uid() IS NOT NULL));

create policy responses_own on public.responses for all to public
  using ((parent_of_child(child_id) = auth.uid()))
  with check ((parent_of_child(child_id) = auth.uid()));

create policy review_own on public.review_queue for all to public
  using ((parent_of_child(child_id) = auth.uid()))
  with check ((parent_of_child(child_id) = auth.uid()));

create policy sessions_own on public.sessions for all to public
  using ((parent_of_child(child_id) = auth.uid()))
  with check ((parent_of_child(child_id) = auth.uid()));

create policy skill_stats_own on public.skill_stats for all to public
  using ((parent_of_child(child_id) = auth.uid()))
  with check ((parent_of_child(child_id) = auth.uid()));

create policy skills_read on public.skills for select to public
  using ((auth.uid() IS NOT NULL));

create policy wc_own on public.worksheet_completions for all to public
  using ((parent_of_child(child_id) = auth.uid()))
  with check ((parent_of_child(child_id) = auth.uid()));

-- =====================================================================
-- FUNCTION PRIVILEGES
-- =====================================================================

-- finalize_session(uuid)
--   acl: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

-- get_daily_status(uuid)
--   acl: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

-- parent_of_child(uuid)
--   acl: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

-- record_response(uuid,uuid,text,jsonb,text,integer,text,integer,jsonb,text,text,integer,boolean,boolean,boolean,integer,text,timestamp with time zone)
--   acl: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

-- update_updated_at()
--   acl: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

-- validate_response_session_child()
--   acl: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
