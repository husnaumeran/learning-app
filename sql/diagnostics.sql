-- ============ CONCEPT UNDERSTANDING DIAGNOSTICS ============
-- Run these in Supabase SQL Editor
-- Data becomes meaningful with 20+ responses per skill

-- ============ ADDITION DIAGNOSTICS ============
WITH addition_responses AS (
  SELECT 
    r.is_correct,
    r.is_first_try,
    r.final_answer,
    r.correct_answer,
    (r.question_data->>'a')::int AS a,
    (r.question_data->>'b')::int AS b,
    (r.question_data->>'sum')::int AS sum_val,
    r.response_time_ms
  FROM responses r
  JOIN sessions s ON s.id = r.session_id
  WHERE r.skill_id = 'addition'
    AND s.child_id = (SELECT id FROM children LIMIT 1)
)
SELECT
  count(*) AS total_questions,
  round(avg(is_correct::int) * 100) AS accuracy_pct,
  round(avg(CASE WHEN sum_val <= 5 THEN is_correct::int END) * 100) AS acc_sum_1_to_5,
  round(avg(CASE WHEN sum_val > 5 THEN is_correct::int END) * 100) AS acc_sum_above_5,
  round(avg(CASE WHEN a = 0 OR b = 0 THEN is_correct::int END) * 100) AS acc_with_zero,
  round(avg(CASE WHEN a > 0 AND b > 0 THEN is_correct::int END) * 100) AS acc_no_zero,
  round(avg(CASE WHEN a = b THEN is_correct::int END) * 100) AS acc_doubles,
  count(*) FILTER (WHERE NOT is_correct AND abs(final_answer::int - sum_val) = 1) AS off_by_one_errors,
  round(avg(CASE WHEN is_correct THEN response_time_ms END)) AS avg_ms_correct,
  round(avg(CASE WHEN NOT is_correct THEN response_time_ms END)) AS avg_ms_wrong
FROM addition_responses;


-- ============ SUBTRACTION DIAGNOSTICS ============
WITH sub_responses AS (
  SELECT 
    r.is_correct,
    r.final_answer,
    (r.question_data->>'a')::int AS a,
    (r.question_data->>'b')::int AS b,
    (r.question_data->>'answer')::int AS ans,
    r.question_data->>'mode' AS mode,
    r.response_time_ms
  FROM responses r
  JOIN sessions s ON s.id = r.session_id
  WHERE r.skill_id = 'subtraction'
    AND s.child_id = (SELECT id FROM children LIMIT 1)
)
SELECT
  count(*) AS total,
  round(avg(is_correct::int) * 100) AS accuracy_pct,
  round(avg(CASE WHEN mode = 'visual' THEN is_correct::int END) * 100) AS acc_visual,
  round(avg(CASE WHEN mode = 'equation' THEN is_correct::int END) * 100) AS acc_equation,
  round(avg(CASE WHEN b <= 3 THEN is_correct::int END) * 100) AS acc_small_sub,
  round(avg(CASE WHEN b > 3 THEN is_correct::int END) * 100) AS acc_large_sub,
  count(*) FILTER (WHERE NOT is_correct AND abs(final_answer::int - ans) = 1) AS off_by_one,
  round(avg(CASE WHEN is_correct THEN response_time_ms END)) AS avg_ms_correct,
  round(avg(CASE WHEN NOT is_correct THEN response_time_ms END)) AS avg_ms_wrong
FROM sub_responses;
