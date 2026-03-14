# Tiny Thinkers — Project Plan

## North Star (Next 8 Weeks)
> By May/June 2026, Aliza should be practicing daily on a reliable adaptive system with strong CogAT/Naglieri content, clear parent insights, and realistic challenge/test modes.

## Vision
An AI-powered adaptive learning platform that starts with gifted academy prep (ages 3-5) and grows into a comprehensive K-12+ learning system covering academics, languages, faith, life skills, and technology — personalized to each child's potential.

## Target Users
- **Now**: Aliza (CogAT/Naglieri prep, May/June 2026 deadline)
- **Soon**: Other families with young children (free during development)
- **Later**: Paid platform ($5/month) for families worldwide

---

## Phase 1A: Test Readiness Engine (NOW → April 2026)
**Goal**: The adaptive system is trustworthy. No broken flows.

- [ ] Weekend challenge tested end-to-end (upgrade/downgrade confirmed)
- [ ] `difficulty_level` progression feels right per skill
- [ ] `practice_question_count` growing with mastery
- [ ] Spaced repetition for missed questions
- [ ] Weak area detection surfaced to parent dashboard
- [ ] No repeats / no broken flows
- [ ] Progress and report card reliable across devices
- [ ] QA deploy flow + basic regression tests

### Learning Signal Loop
- [ ] Collect session data → run diagnostic queries → identify concept weaknesses
- [ ] Adjust generators based on findings (harder/easier problems)
- [ ] Improve feedback/explanations for common mistakes
- [ ] Repeat weekly — this is what makes Tiny Thinkers adaptive, not just worksheets

## Phase 1B: CogAT Content Completion (April → May 2026)
**Goal**: Enough high-quality content for real prep. Existing worksheets kept + expanded.

### CogAT-Specific
- [ ] Figure Matrices — expand to all 8 levels
- [ ] Verbal Analogies — expand to all 6 levels
- [ ] Paper Folding (nonverbal CogAT)
- [ ] Number Puzzles (quantitative CogAT)
- [ ] Sentence Completion (verbal CogAT)
- [ ] Classification (nonverbal CogAT) — "which one doesn't belong?" with shapes/properties
- [ ] Color Patterns / What Comes Next — more variety
- [ ] Timed practice mode (simulating test conditions)
- [ ] Practice tests with scoring benchmarks
- [ ] Test with 2-3 other families for feedback

### Existing Worksheets (keep + expand)
- [ ] All current Math, English, Thinking, Urdu, Arabic worksheets continue
- [ ] Expand difficulty ranges as `difficulty_level` grows
- [ ] Add more question variety to each generator

### Quran Memorization (slow daily habit)
- [ ] Start with small surahs (Al-Fatiha, Al-Ikhlas, etc.)
- [ ] Audio playback — hear surah, repeat
- [ ] Mastery-based unlock — must demonstrate memorization before next surah
- [ ] Listen → Repeat → Record → Check flow
- [ ] Low-pressure daily inclusion — one surah at a time alongside other worksheets

---

## Phase 2: Core Platform Hardening (Summer 2026)
**Goal**: Multi-child, multi-family, reliable, polished.

### 2A. Multi-Family
- [ ] Onboarding flow for new families
- [ ] Multiple children per account
- [ ] Age-appropriate content selection
- [ ] Privacy / data isolation

### 2B. Adaptive Engine V2
- [ ] Cross-skill insights (e.g. "strong visual, weak verbal")
- [ ] Concept diagnostics surfaced in parent dashboard
- [ ] Smart daily queue uses spaced repetition + weak areas
- [ ] Anti-repeat across days

### 2C. AI Integration (NVIDIA Build)
**Resource:** https://build.nvidia.com/models (free API endpoints available)

- [ ] Better TTS — Replace Google Translate TTS hack for Urdu/Arabic with a proper TTS model
- [ ] AI question generation — LLM-generated novel questions (verbal analogies, doesn't belong, patterns)
- [ ] AI tutor / adaptive feedback — Real-time encouragement, hints, explanations

### 2D. Polish
- [ ] Offline mode (service worker)
- [ ] Push notifications ("Time to practice!")
- [ ] Animations / celebrations
- [ ] Accessibility improvements

---

## Phase 3: Expand Subjects (Fall 2026+)
**Goal**: Beyond test prep — real learning platform.

### 3A. Languages & Faith
- [ ] Arabic Qaida — complete Noorani Qaida (all levels)
- [ ] Urdu — full reading/writing curriculum
- [ ] Quran memorization — surah tracking, audio playback, repetition

### 3B. Advanced Math
- [ ] Multiplication / Division
- [ ] Fractions / Decimals
- [ ] Word problems
- [ ] Pre-algebra concepts

### 3C. Reading & Writing
- [ ] Sight words / Reading comprehension
- [ ] Sentence building / Phonics progression

### 3D. Life Skills
- [ ] Money management (counting coins, making change, budgeting)
- [ ] Time telling / Calendar / Seasons

---

## Phase 4: AI Integration (2027+)
**Goal**: AI-powered personalization — every child gets an optimal learning path.

- [ ] Conversational AI tutor (adapts to child's level)
- [ ] Voice interaction for pre-readers
- [ ] Auto-generates questions based on weak areas
- [ ] Predicts readiness for next concept
- [ ] Identifies learning style (visual vs verbal vs kinesthetic)
- [ ] Dynamic story problems using child's interests

---

## Phase 5: Higher Education & Monetization (2027-2028+)
**Goal**: Platform grows with the child. Sustainable business.

### 5A. Advanced Topics
- [ ] Python coding fundamentals
- [ ] Economics / stocks / business basics
- [ ] AI/ML concepts for kids
- [ ] Science experiments / projects

### 5B. Monetization
- [ ] Free tier (limited worksheets/day)
- [ ] Paid tier ($5/month) — unlimited + AI features + analytics
- [ ] Family plan / School licensing

### 5C. Growth
- [ ] App store (iOS/Android wrapper)
- [ ] Teacher dashboard
- [ ] Community features / Content marketplace

---

## 🚫 Not Now (Parked)
These are valuable but should not take active build time before the test:
- Subscription billing
- Broad multi-family growth
- Advanced AI tutor
- Non-CogAT subject expansion
- Python coding / stocks / economics
- App store packaging

---

## Immediate Top 10 (Execution List)
1. Verify weekend challenge progression works end-to-end
2. Fix any remaining schema/constraint drift in QA and prod
3. Complete Figure Matrices levels
4. Complete Verbal Analogies levels
5. Add Paper Folding
6. Add Number Puzzles
7. Add Sentence Completion
8. Build weak-area parent insights for CogAT skills
9. Add timed practice/test mode
10. Stand up QA deploy flow and basic regression tests

---

## Architecture Principles
- **Supabase** as backend (PostgreSQL, auth, real-time)
- **Pure JS** for now — no framework until complexity demands it
- **Mobile-first** responsive design
- **AI-ready data model** — every interaction logged for future ML
- **Modular worksheets** — easy to add new skills
- **Two environments** — QA (Netlify + QA Supabase) + Prod (GitHub Pages + Prod Supabase)
- **Core pattern** — Practice daily, challenge weekly
