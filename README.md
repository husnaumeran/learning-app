# 🎨 Aliza's Learning App

An interactive learning app for preschool/kindergarten children (ages 3-5), built as separate JS files hosted on GitHub Pages.

**⚠️ This is NOT a "give the kid and forget" app. This is a "do it WITH your kid" app! ⚠️**

🔗 **Live:** https://husnaumeran.github.io/learning-app/

## Features

### 🔢 Math
- **Addition** — Ways to make focusNumber (e.g., 3+4=7)
- **Subtraction** — Visual (emojis with crossouts) + equation mode
- **Counting** — Count emoji objects
- **Match Numbers** — Match numbers to emoji groups (shuffled, no adjacent matches)
- **More/Less** — Compare quantities
- **Bigger/Smaller** — Compare numbers
- **What Comes Next** — Number/letter sequences
- **Connect Dots** — Tap numbered dots to reveal shapes

### 📖 English
- **2-Letter Words** — Read words (IN, AT, ON, etc.)
- **3-Letter Words** — Read words (CAT, DOG, SUN, etc.)
- **Trace ABC** — Uppercase letter tracing
- **Trace abc** — Lowercase letter tracing
- **Trace Numbers** — Number tracing

### 🧠 Thinking
- **Color Patterns** — Tap-and-tap color sequences
- **Color Patterns L2** — ABB, AABB, ABBC patterns (next color + fill-the-blank)
- **Doesn't Belong** — Find the odd one out
- **Find Jora** — Memory matching game
- **Connect Dots** — Connect numbered dots

### اردو Urdu
- **Urdu Reading** — 38 letters with harakat (fatha/kasra/damma), tap to hear
- **Urdu Trace** — Isolated letter tracing with harakat toggle
- **Urdu 2-Letter Words** — 20 common words with harakat, sound + meaning
- **Urdu What Comes Next** — Letter sequence quiz
- **Urdu Videos** — Embedded YouTube phonics playlist (no leaving the app)
- **Urdu Qaida** — 5-level progression (Letters → Harakat → Trace → 2-Letter → What Next)

### 📖 Arabic Qaida
- **5-level Noorani Qaida** — Letters → Harakat → Connections → 2-Letter → 3-Letter Words
- Green theme to differentiate from Urdu (gold)
- Levels unlock after 5 days of practice (parent can override with 3s hold)

## How It Works

- **"Let's Start 🚀"** — Picks 2 random worksheets per section, skips completed ones
- **Focus Number** — Controls difficulty across ALL worksheets (start low 3-5, increase over time)
- **Worksheet Limit** — Set max worksheets per day to avoid screen fatigue
- **Locked worksheets 🔒** — Kids can't open individual worksheets; parents hold 3s to unlock
- **Qaida progression** — 5 completions (different days) to unlock next level; parent 3s hold to override
- **Completion screen** — Shows score + "Continue →" or "← Menu"
- **Progress tracking** — Saved per day in localStorage

## Technical Details

- **Separate JS files** — modular, easy to maintain
- **CONFIG object** — `focusNumber` controls difficulty everywhere
- **Google Translate TTS** — Arabic + Urdu pronunciation with Web Speech API fallback
- **No dependencies** — pure HTML/CSS/JS, hosted on GitHub Pages
- **Mobile-first** — designed for tablet/phone touch interaction

## File Structure
```
learning-app/
├── index.html
├── css/styles.css
├── js/
│   ├── config.js          (CONFIG, categories, URDU_LETTERS, ARABIC_LETTERS, words)
│   ├── helpers.js         (generators, setupCanvas, speak, speakUrdu, speakArabic)
│   ├── menu.js            (showMenu, startDaily, nextWorksheet, howToUse, limits)
│   └── worksheets/
│       ├── addition.js, subtraction.js, biggersmaller.js
│       ├── colors.js, colorsl2.js, connectdots.js
│       ├── counting.js, doesntbelong.js, jora.js
│       ├── matching.js, moreless.js, whatnext.js
│       ├── threeletterwords.js, twoletterwords.js
│       ├── traceabc.js, tracelower.js, tracenumbers.js
│       ├── urdutrace.js, urdureading.js, urdu2letter.js
│       ├── urduwhatnext.js, urduvideos.js, urduqaida.js
│       └── arabicqaida.js
```

## For Parents

- **Sit with your child** — guide them, talk about what they see
- **Repetition is key** — same worksheets appear in different order each day
- **Keep sessions short** — 10-15 minutes is plenty for ages 3-5
- **Celebrate effort** — stars are for trying, not just correct answers

Made with ❤️ for Aliza
