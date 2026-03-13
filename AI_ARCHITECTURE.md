# Tiny Thinkers — AI Architecture Doc

## 1. Purpose

Build an adaptive learning system that understands how each child learns, not just whether answers were right or wrong.

The AI layer should help Tiny Thinkers:
- Detect concept gaps
- Choose better next practice
- Explain mistakes simply
- Generate targeted content later
- Give parents useful insights

This should be built in stages, with structured analytics first and LLM features second.

---

## 2. Core Principle

The center of the system is the **Child Learning Model**.

Not a chatbot. Not a generic AI assistant.

The main AI object is a living profile of:
- What the child knows
- What the child struggles with
- How stable that mastery is
- What format works best
- What should come next

---

## 3. System Layers

### Layer 1 — Interaction Logging

Capture every learning event. Each response should store:

| Field | Description |
|-------|-------------|
| `child_id` | Which child |
| `session_id` | Which session |
| `session_type` | practice, challenge, review |
| `skill_id` | Which skill |
| `question_data` | Full question context |
| `question_subtype` | Sub-concept tag |
| `correct_answer` | Expected answer |
| `final_answer` | What the child picked |
| `is_correct` | Right or wrong |
| `is_first_try` | Got it on first attempt |
| `attempt_count` | How many tries |
| `response_time_ms` | How long it took |
| `difficulty_snapshot` | Difficulty at time of question |
| `explanation_shown` | Was a hint/explanation shown |
| `hint_used` | Did child use a hint |
| `created_at` | Timestamp |

This is the raw signal layer.

### Layer 2 — Diagnostic Engine

Convert raw responses into structured learning signals.

This layer answers questions like:
- Is the child weak on all subtraction, or only subtraction above 5?
- Can the child do AB patterns but not ABB?
- Is the child strong visually but weak verbally?
- Are mistakes random or systematic?

This should start with:
- SQL rules
- JS classification logic
- Tagged subtypes per generator

**No LLM required at first.**

### Layer 3 — Recommendation Engine

Decide what the child should do next.

**Inputs:**
- Challenge performance
- Weak concepts
- Recent mistakes
- Spacing/review urgency
- Mastered concepts
- Fatigue/session length patterns

**Outputs:**
- Daily queue
- Review queue
- Weekend challenge composition
- Suggested explanations/interventions

### Layer 4 — Generative AI

Use AI only after the structured layers are stable.

**Use cases:**
- Parent summaries
- Child-friendly explanations
- New targeted questions
- Personalized examples/stories
- Future conversational tutor

**LLMs should consume structured outputs, not raw event history.**

---

## 4. Child Learning Model

### Per-Skill State

Each skill should have a profile like:

```json
{
  "skill_id": "addition",
  "difficulty_level": 3,
  "practice_question_count": 2,
  "challenge_question_count": 5,
  "rolling_accuracy": 0.78,
  "rolling_first_try_accuracy": 0.64,
  "avg_response_time_ms": 3400,
  "confidence_score": 0.71,
  "weak_patterns": ["sum_over_10", "off_by_one"],
  "strong_patterns": ["adding_zero", "same_addends"],
  "last_practiced_at": "2026-03-12T10:15:00Z",
  "review_urgency": 0.42,
  "status": "developing"
}
```

### Child-Wide Profile

Also track whole-child signals:

```json
{
  "visual_strength": 0.86,
  "verbal_strength": 0.62,
  "quantitative_strength": 0.71,
  "attention_span_minutes": 12,
  "best_session_length_minutes": 10,
  "frustration_risk": 0.28,
  "consistency_score": 0.74,
  "preferred_modality": "visual"
}
```

---

## 5. Diagnostic Framework

The diagnostic engine should classify answers into sub-concepts and error patterns.

### A. Skill Subtype Examples

**Addition:** `includes_zero`, `same_addends`, `sum_1_5`, `sum_6_10`, `sum_over_10`, `equation_mode`, `visual_mode`

**Subtraction:** `difference_1_3`, `difference_4_7`, `equation_mode`, `visual_mode`, `subtract_zero`, `small_minuend`, `large_minuend`

**Patterns:** `AB`, `ABB`, `AAB`, `ABC`, `color_pattern`, `shape_pattern`, `number_pattern`

**Figure Matrices:** `color_change`, `shape_change`, `rotation`, `count_change`, `row_rule`, `column_rule`

**Counting:** `count_1_5`, `count_6_10`, `count_above_10`, `visual_counting`, `grouped_objects`

### B. Error Tag Examples

`off_by_one`, `random_guess`, `reversal_confusion`, `counting_above_7`, `pattern_ABB_confusion`, `visual_rotation_miss`, `answer_too_high`, `answer_too_low`, `mode_specific_struggle`

These should be attached after response analysis.

---

## 6. Data Flow

1. **Child answers a question** — worksheet records question data, final answer, correctness, timing, attempt count
2. **Diagnostic pass runs** — system computes subtype, error tags, skill-level aggregates, weak-pattern updates
3. **Skill state updates** — rolling accuracy, confidence, review urgency, recent weak concepts
4. **Queue builder uses those signals** — daily queue mixes current-level practice, weak-area reinforcement, spaced review, stretch items
5. **Parent insight layer summarizes** — turn structured diagnostics into human-readable insights

---

## 7. Queue Strategy

The future queue should not be "random but adaptive." It should be intentionally mixed.

**Recommended daily mix:**
- 50% current-level practice
- 25% weak-area reinforcement
- 15% review of older mastered skills
- 10% stretch/challenge

This can start as rules and later become AI-optimized.

---

## 8. Weekend Challenge Rules

Weekend challenge is the checkpoint.

**Recommended behavior:**
- Daily practice never changes difficulty
- Weekend challenge decides upgrade/downgrade

**Initial rule set:**
- `challenge_question_count` = 5
- Upgrade if accuracy >= 90% for 2 consecutive weekend challenges
- Downgrade if accuracy < 60% for 2 consecutive weekend challenges
- Otherwise stay at current level

**On upgrade:**
- `difficulty_level` += 1
- `practice_question_count` += 1 slowly, capped

**On downgrade:**
- `difficulty_level` -= 1
- Keep `practice_question_count` stable unless child is clearly overwhelmed

---

## 9. Parent Insight Outputs

The system should eventually generate short, useful summaries like:
- "Aliza is doing very well with visual patterns and simple matrices."
- "She struggles most with subtraction in equation form."
- "Counting is strong up to 7, but accuracy drops above 8."
- "Recommended next step: more visual subtraction with numbers 1–5."

These should come from structured diagnostics first, with optional AI wording later.

---

## 10. AI Features by Phase

| Phase | Focus | When |
|-------|-------|------|
| **A** | Structured analytics — subtype tagging, error tagging, rolling mastery, weak-area detection, challenge upgrades/downgrades | Build now |
| **B** | AI summaries — weekly parent summary, skill insights, suggested practice focus | Add next |
| **C** | AI explanations — child-friendly error explanations, alternate styles, supportive feedback | After structured data is reliable |
| **D** | AI-generated content — targeted questions for weak concepts, puzzle variations, personalized examples | Later |
| **E** | Conversational tutor — voice mode, Q&A, spoken hints, tutoring dialogue | Much later |

---

## 11. Schema Additions Recommended

### Responses
`session_type`, `attempt_count`, `hint_used`, `explanation_shown`, `question_subtype`, `difficulty_snapshot`, `generated_by`, `error_tag`

### Skill Settings / Skill State
`difficulty_level`, `practice_question_count`, `challenge_question_count`, `confidence_score`, `last_practiced_at`, `review_urgency`

### Derived Analytics (tables or views)
`child_skill_diagnostics`, `child_weekly_insights`, `child_concept_mastery`

---

## 12. First Implementation Targets

Build these first, in order:

1. **Addition diagnostics** — accuracy by sum range, zero handling, repeated addends, off-by-one errors
2. **Subtraction diagnostics** — equation vs visual mode, small vs large numbers, common error types
3. **Parent weekly insight summary** — rule-based first, optionally AI-written later
4. **Weak-area queue logic** — use diagnostic tags to decide what appears in practice
5. **Explanation generator** — convert wrong answers into simple child-friendly feedback
6. **Targeted question generation** — generate extra items for identified weak sub-concepts

---

## 13. Guardrails

To keep the AI system trustworthy:
- Structured logic decides diagnostics first
- LLMs summarize, not invent mastery judgments
- Do not let AI change difficulty directly without rule checks
- Keep all decisions inspectable
- Parent-facing insights must be traceable to actual answer data

---

## 14. What Makes This Special

The moat is not "AI worksheets."

The moat is:
- **Persistent child model** — tracks learning over months/years
- **Concept-level diagnostics** — knows *why* a child struggles, not just *that* they do
- **Targeted next-step recommendations** — every session is intentional
- **Insight-rich parent reporting** — parents see what matters
- **Long-term adaptive progression** — grows with the child

That is much stronger than a generic tutor bot.

---

## 15. Immediate Next AI Task

**Build concept diagnostics for Addition first.**

Why:
- Easiest structured signal
- Rich enough to prove the framework
- Useful for Aliza right now
- Creates the template for subtraction, patterns, and CogAT skills
