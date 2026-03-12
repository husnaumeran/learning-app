# 🎨 Aliza's Learning App

An interactive learning app for preschool/kindergarten children (ages 3-5), built as separate JS files hosted on GitHub Pages.

**⚠️ This is NOT a "give the kid and forget" app. This is a "do it WITH your kid" app! ⚠️**

🔗 **Live:** https://husnaumeran.github.io/learning-app/

## Features

### 🔢 Math
- **Addition** — Ways to make focusNumber (e.g., 3+4=7)
- **Subtraction** — Visual (emojis with crossouts) + equation mode
- **Counting** — Count emoji objects
- **Match Numbers** — Match numbers to emoji groups (shuffled, random numbers)
- **More/Less** — Compare quantities
- **Bigger/Smaller** — Compare numbers
- **What Comes Next** — Number/letter sequences
- **Numbers English** — Hear & tap numbers 1-100, with levels (closest, more/less)

### 📖 English
- **2-Letter Words** — Read words (IN, AT, ON, etc.)
- **3-Letter Words** — Read words (CAT, DOG, SUN, etc.)
- **Trace ABC** — Uppercase letter tracing
- **Trace abc** — Lowercase letter tracing
- **Trace Numbers** — Number tracing

### 🧠 Thinking
- **Color Patterns** — Multi-type patterns (colors, emojis, numbers, letters) with 12 templates
- **Color Patterns L2** — ABB, AABB, ABBC patterns — tap "?" → palette pops up → tap color → wrong greys out → correct auto-advances
- **Doesn't Belong** — Find the odd one out
- **Find Pairs** — Memory matching game
- **Connect Dots** — Connect numbered dots
- **Figure Matrices** — CogAT prep: 8 progressive levels (color → size → shape → direction → combos)
- **Verbal Analogies** — CogAT prep: 6 levels (opposites → function → associations → relational → categories → parts)

### اردو Urdu
- **Urdu Reading** — 38 letters with harakat (fatha/kasra/damma), tap to hear
- **Urdu Trace** — Isolated letter tracing with harakat toggle
- **Urdu 2-Letter Words** — 20 common words with harakat, sound + meaning
- **Urdu What Comes Next** — Letter sequence quiz
- **Urdu Videos** — Embedded YouTube phonics playlist (no leaving the app)
- **Urdu Qaida** — 5-level progression (Letters → Harakat → Trace → 2-Letter → What Next)
- **Urdu Numbers** — Hear & tap Urdu numerals (۱-۱۰۰), 4 levels

### 📖 Arabic Qaida
- **5-level Noorani Qaida** — Letters → Harakat → Connections → 2-Letter → 3-Letter Words
- Green theme to differentiate from Urdu (gold)
- Levels unlock after 5 days of practice (parent can override with 3s hold)
- **Arabic Numbers** — Hear & tap Arabic-Indic numerals (١-١٠٠), 4 levels

## How It Works

- **"Let's Start 🚀"** — Builds an adaptive queue: 1 per section first (guarantees coverage), then fills to limit weighted by weak areas
- **"Continue ▶️"** — Resumes an in-progress session (queue persisted to Supabase for cross-device support)
- **Stale sessions** — Unfinished sessions from a previous day show "Resume / Start Fresh" choice
- **Three-Variable Adaptive Model** — `difficulty_level` (progression), `practice_question_count` (daily stamina), `challenge_question_count` (weekend evaluation)
- **Worksheet Limit** — Set max worksheets per day to avoid screen fatigue
- **Locked worksheets 🔒** — Kids can't open individual worksheets; parents hold 3s to unlock
- **Leveled worksheets** — Figure Matrices (8 levels), Verbal Analogies (6 levels), Numbers (4 levels each) — auto-unlock via mastery (80% × 3 sessions)
- **Kid-proof unlock** — min 5 questions answered, ≤25% skip rate, 80% × 3 qualifying sessions
- **Qaida progression** — 5 completions (different days) to unlock next level; parent 3s hold to override
- **Wrong-answer feedback** — incorrect answers show feedback, allow retry; retries don't inflate progress counts
- **Completion screen** — Shows score + "Continue →" or "← Menu"
- **Progress tracking** — Saved per day (localStorage cache + Supabase source of truth)
- **Responsive design** — Works on phones, tablets, laptops, and TVs

## Technical Details

- **Separate JS files** — modular, easy to maintain
- **Supabase backend** — PostgreSQL for sessions, responses, skill stats, spaced repetition queue, worksheet completions
- **Adaptive engine** — auto-adjusts difficulty based on accuracy; spaced repetition for wrong answers
- **Session persistence** — `queue_json` + `queue_index` on sessions table; resume across devices
- **CONFIG object** — per-skill `difficulty_level`, `practice_question_count`, `challenge_question_count`
- **Google Translate TTS** — Arabic + Urdu pronunciation with Web Speech API fallback
- **No framework dependencies** — pure HTML/CSS/JS, hosted on GitHub Pages
- **Responsive CSS** — `clamp()` font sizes, media queries for phone → TV
- **SVG shapes** — Figure Matrices uses programmatic SVG (no image files)

## File Structure
```
learning-app/
├── index.html
├── css/styles.css
├── js/
│   ├── config.js          (CONFIG, categories, URDU_LETTERS, ARABIC_LETTERS, words)
│   ├── helpers.js         (generators, setupCanvas, speak, speakUrdu, speakArabic, recordResponse, completeWorksheet)
│   ├── menu.js            (showMenu, startDaily, nextWorksheet, resumeSession, buildAdaptiveQueue, progress view)
│   ├── auth.js            (Supabase auth, child profile selector)
│   ├── parent.js          (parent dashboard, analytics)
│   ├── assessment.js      (weekend challenge mode)
│   └── worksheets/
│       ├── addition.js, subtraction.js, biggersmaller.js
│       ├── colors.js, colorsl2.js, connectdots.js
│       ├── counting.js, doesntbelong.js, jora.js
│       ├── matching.js, moreless.js, whatnext.js
│       ├── threeletterwords.js, twoletterwords.js
│       ├── traceabc.js, tracelower.js, tracenumbers.js
│       ├── urdutrace.js, urdureading.js, urdu2letter.js
│       ├── urduwhatnext.js, urduvideos.js, urduqaida.js
│       ├── arabicqaida.js
│       ├── figurematrices.js, verbalanalogies.js
│       ├── numbersenglish.js, numbersurdu.js, numbersarabic.js
```

## For Parents

- **Sit with your child** — guide them, talk about what they see
- **Repetition is key** — same worksheets appear in different order each day
- **Keep sessions short** — 10-15 minutes is plenty for ages 3-5
- **Celebrate effort** — stars are for trying, not just correct answers

Made with ❤️ for Aliza
