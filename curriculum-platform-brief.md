# Curriculum Platform — Technical Brief
**AI-Native Self-Directed Learning MVP**
*For execution via Claude Code*

---

## 1. Project Overview

Build a single-user web application where a user describes a topic they want to learn, an AI agent researches it, assesses the user's existing knowledge and goals, generates a personalized curriculum, and schedules all lessons and assessments on an interactive calendar. Lessons are delivered as slide decks. The architecture must be designed for future lesson format extensibility (podcast, article, interactive diagram).

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR, file-based routing, API routes built-in |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, accessible components |
| Database | Supabase (PostgreSQL) | Auth, DB, and realtime in one service; free tier sufficient for MVP |
| Auth | Supabase Auth | Simple email/magic link for solo use |
| AI | Anthropic API (`claude-sonnet-4-20250514`) | Streaming, tool use, extended context |
| Web Search | Anthropic Web Search Tool (`web_search_20250305`) | Native to Claude API; research agent uses this |
| Deployment | Vercel | Zero-config Next.js deployment |
| State | Zustand | Lightweight client state for lesson/slide navigation |

---

## 3. Application Architecture

```
app/
├── (auth)/
│   └── login/                  # Magic link login
├── (app)/
│   ├── dashboard/              # Course list + active course calendar
│   ├── onboarding/             # New course intake flow
│   │   ├── describe/           # Step 1: Topic description
│   │   ├── assess/             # Step 2: AI knowledge assessment Q&A
│   │   └── configure/          # Step 3: Time commitment + difficulty
│   ├── course/[courseId]/
│   │   ├── overview/           # Curriculum outline + sources
│   │   ├── calendar/           # Full calendar view of scheduled lessons
│   │   ├── lesson/[lessonId]/  # Slide-based lesson viewer
│   │   └── quiz/[quizId]/      # Quiz runner
│   └── api/
│       ├── agent/assess/       # Assessment question generation
│       ├── agent/research/     # Curriculum research + generation
│       ├── agent/schedule/     # Calendar planning
│       └── agent/lesson/       # Slide content generation
lib/
├── prompts/                    # All system prompts as .ts files
│   ├── assessor.ts
│   ├── curriculum-builder.ts
│   ├── scheduler.ts
│   └── slide-generator.ts
├── skills/
│   └── curriculum-skill.md     # Agent-readable skill file (see Section 6)
└── types/                      # Shared TypeScript types
```

---

## 4. Data Models (Supabase Schema)

```sql
-- Core course record
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  topic_description TEXT NOT NULL,           -- Raw user input
  difficulty_level TEXT,                     -- e.g. "200-level undergraduate"
  college_equivalent TEXT,                   -- e.g. "Intro to Microeconomics (ECON 101)"
  estimated_total_hours INT,
  weekly_hours_available INT,
  sessions_per_week INT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft',               -- draft | active | completed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assessment Q&A during onboarding
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  user_answer TEXT,
  order_index INT
);

-- High-level curriculum outline
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT,
  prerequisite_module_id UUID REFERENCES modules(id)
);

-- Individual lessons (one per calendar event)
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lesson_type TEXT DEFAULT 'slides',         -- slides | podcast | article | diagram (future)
  scheduled_date DATE,
  estimated_duration_minutes INT,
  status TEXT DEFAULT 'pending',             -- pending | in_progress | completed
  completed_at TIMESTAMPTZ,
  order_index INT
);

-- Slide content (one row per slide)
CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL,                        -- Markdown content
  speaker_notes TEXT,                        -- For future podcast conversion
  visual_hint TEXT,                          -- Hint for future diagram/image gen
  order_index INT
);

-- Quizzes (attached to lessons or modules)
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id),
  lesson_id UUID REFERENCES lessons(id),
  title TEXT,
  quiz_type TEXT DEFAULT 'lesson_check',     -- lesson_check | module_exam | final_exam
  scheduled_date DATE,
  status TEXT DEFAULT 'pending'
);

-- Individual quiz questions
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice', -- multiple_choice | short_answer | true_false
  options JSONB,                             -- Array of option strings for MC
  correct_answer TEXT,
  explanation TEXT,
  order_index INT
);

-- User quiz responses + scoring
CREATE TABLE quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  question_id UUID REFERENCES quiz_questions(id),
  user_answer TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ DEFAULT now()
);

-- Research sources referenced in curriculum generation
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  url TEXT,
  title TEXT,
  domain TEXT,
  relevance_note TEXT,                       -- Why this was used
  accessed_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. User Flow (Step by Step)

### Step 1 — Topic Intake
- User lands on `/onboarding/describe`
- Free-text input: "What do you want to learn?"
- Optional: "Why do you want to learn this? What will you do with it?"
- These become the seed for the assessment agent

### Step 2 — AI Knowledge Assessment (`/onboarding/assess`)
- **Streaming chat interface** — conversational, not a static form
- Assessor agent generates 5–8 targeted questions, one at a time, based on the topic
- Questions probe: prior knowledge, adjacent skills, vocabulary familiarity, past exposure
- User answers in plain text; agent acknowledges and moves to next question
- After all answers, agent produces a structured summary:
  ```json
  {
    "knowledge_level": "beginner | novice | intermediate | advanced",
    "known_concepts": ["..."],
    "gaps_identified": ["..."],
    "recommended_starting_point": "..."
  }
  ```

### Step 3 — Configuration (`/onboarding/configure`)
- **Difficulty selector**: Displayed as college course equivalents
  - `100-level` — Survey / introductory (no prereqs assumed)
  - `200-level` — Foundational (light prereqs)
  - `300-level` — Intermediate (moderate background assumed)
  - `400-level` — Advanced / near-professional
  - `Graduate` — Deep mastery, research-level
- **Time commitment**: Hours per week available (slider: 1–20 hrs)
- **Sessions per week**: How many sitting (e.g., 3x/week)
- **Target start date**: Calendar picker
- System computes estimated end date and total course hours upfront

### Step 4 — Research + Curriculum Generation
- Full-screen loading state with live streamed progress log (not a spinner — show the agent working)
- Agent pipeline (sequential):
  1. **Research Agent**: Uses `web_search` tool to gather information from reputable sources (Wikipedia, .edu/.gov, major publications, peer-reviewed summaries). Targets 8–15 sources. Saves all sources to DB.
  2. **Curriculum Builder Agent**: Reads the `curriculum-skill.md` file + research output + assessment summary → produces structured curriculum JSON (modules, lessons, quiz placement)
  3. **Scheduler Agent**: Takes curriculum structure + user time config → assigns specific dates to every lesson and quiz, respects sessions-per-week constraint
  4. **Slide Generator Agent**: Generates slide content for the first module only on initial load (lazy-generate remaining modules as user progresses)

### Step 5 — Course Dashboard (`/course/[id]/calendar`)
- Full calendar view (week + month toggle) showing all scheduled lessons and quizzes
- Color-coded: lessons (blue), quizzes (amber), completed (green)
- Click any event → opens lesson or quiz
- Sidebar: module progress bar, overall completion %, estimated hours remaining

### Step 6 — Lesson View (`/course/[id]/lesson/[id]`)
- Slide deck viewer (keyboard arrow nav + click nav)
- Progress indicator (slide X of N)
- Each slide: title, body (rendered markdown), optional visual hint placeholder
- "Mark Complete" button → updates DB, triggers next lesson unlock
- **Format toggle button** (disabled in MVP, visible as "Coming Soon"): Podcast / Article / Diagram — establishes the UI affordance for future expansion

### Step 7 — Quiz View (`/course/[id]/quiz/[id]`)
- One question at a time, full-screen
- Multiple choice: radio buttons; Short answer: text input
- On submit: immediate feedback with explanation (from `quiz_questions.explanation`)
- End screen: score summary, weak areas flagged, "Review missed questions" option
- Score saved to `quiz_responses`

### Step 8 — Sources Page (`/course/[id]/overview`)
- Curriculum outline (collapsible module/lesson tree)
- Sources section: card grid of all research sources with title, domain, URL, relevance note
- Estimated course stats: total hours, difficulty, pacing

---

## 6. Agent Design

### 6a. Prompt Architecture
All system prompts live in `lib/prompts/` as TypeScript string exports. No inline prompts in route handlers. This makes iteration easy.

### 6b. Curriculum Skill File (`lib/skills/curriculum-skill.md`)
This is a reference document injected into the Curriculum Builder Agent's context. It defines:
- How to structure a module (learning objective, concept sequence, estimated duration)
- How to write a lesson (hook → concept → example → application → summary)
- Slide count targets (8–12 slides per lesson, 45–60 min lessons)
- Quiz cadence rules (lesson check after every lesson, module exam after each module, final exam at end)
- Question type distribution for quizzes (60% MC, 25% short answer, 15% T/F)
- Bloom's taxonomy alignment per difficulty level
- How to write a good distractor (wrong answer in MC that catches common misconceptions)

### 6c. Research Agent Config
```typescript
{
  model: "claude-sonnet-4-20250514",
  tools: [{ type: "web_search_20250305", name: "web_search" }],
  system: researchSystemPrompt,  // Instructs agent to prefer .edu, gov, major publications
  max_tokens: 4000,
  stream: true
}
```
Agent is instructed to:
- Prefer `.edu`, `.gov`, Wikipedia, major textbooks, peer-reviewed summaries
- Avoid SEO content farms, personal blogs without credentials
- Return structured JSON with sources array + research summary
- Flag any topics where reputable sourcing is thin

### 6d. Streaming Strategy
- All long-running agent calls stream to the frontend via Server-Sent Events (SSE)
- Use Next.js Route Handler with `ReadableStream` + `TransformStream`
- Frontend uses `EventSource` API to consume the stream
- Show a live "thinking" log during curriculum generation (e.g., "Searching for sources on X... Found 3 relevant papers... Building module structure...")

---

## 7. Key Frontend Components

| Component | Description |
|---|---|
| `<AssessmentChat />` | Streaming chat UI for the knowledge assessment phase |
| `<GenerationLog />` | Live streamed log of agent activity during curriculum build |
| `<CourseCalendar />` | Full calendar using `react-big-calendar` or `@fullcalendar/react` |
| `<SlideViewer />` | Keyboard-navigable slide deck with markdown rendering |
| `<QuizRunner />` | One-question-at-a-time quiz with answer reveal |
| `<SourcesGrid />` | Card grid of research sources with domain badges |
| `<ModuleTree />` | Collapsible curriculum outline sidebar |
| `<DifficultyPicker />` | College course equivalent selector with descriptions |
| `<ProgressRing />` | Circular progress indicator per module |

---

## 8. API Route Structure

```
POST /api/agent/assess
  Body: { topic, conversationHistory }
  Returns: SSE stream of next assessment question or final summary JSON

POST /api/agent/research
  Body: { topic, assessmentSummary, difficulty }
  Returns: SSE stream of research progress + final { sources[], researchSummary }

POST /api/agent/curriculum
  Body: { researchSummary, assessmentSummary, difficulty, courseConfig }
  Returns: SSE stream + final curriculum JSON { modules[], lessons[], quizzes[] }

POST /api/agent/schedule
  Body: { curriculum, startDate, sessionsPerWeek, hoursPerSession }
  Returns: Scheduled curriculum with ISO dates assigned to each lesson/quiz

POST /api/agent/slides
  Body: { lessonId, lessonTitle, moduleContext, researchSummary }
  Returns: SSE stream of slides as they generate + final slides[]

POST /api/agent/quiz-generate
  Body: { quizId, moduleContext, lessonIds, quizType }
  Returns: Generated questions array

POST /api/quiz/submit
  Body: { quizId, responses[] }
  Returns: { score, feedback, weakAreas[] }
```

---

## 9. Things You Haven't Specified (Recommendations)

### 9a. Lazy Slide Generation
Don't generate slides for all lessons upfront — the token cost and latency will be brutal. Generate slides for:
- Module 1 in full during onboarding
- Each subsequent module's slides when the user completes the prior module's final quiz

### 9b. Curriculum Versioning / Regeneration
Add a "Regenerate" button on the course overview that lets you tweak difficulty or scope and re-run the curriculum agent without losing progress. Store curriculum as a versioned JSON blob in a `curriculum_versions` table.

### 9c. Cost Guardrails
Research + curriculum generation for one course will use significant tokens. Add:
- A generation cost estimate shown before confirming (approximate)
- Hard `max_tokens` caps per agent stage
- A "lite mode" that skips deep research and uses the model's internal knowledge only

### 9d. Lesson Completion Gating
Decide upfront: can users skip ahead on the calendar, or must they complete lessons sequentially? Recommendation for MVP: **sequential within modules, free-jump between modules**. This keeps momentum without feeling like a lock-in.

### 9e. Speaker Notes on Every Slide
Even in slide mode, instruct the slide generator to write `speaker_notes` for every slide. These become the script for the podcast format later. Zero extra work now, unlocks the next format for free.

### 9f. Visual Hints on Slides
Include a `visual_hint` field per slide (e.g., "diagram showing supply/demand curve intersection"). This seeds future image generation or interactive diagram mode without requiring a redesign.

### 9g. Environment Variables Needed
```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 10. MVP Scope Boundary (What to Build Now vs. Later)

| Feature | MVP | Later |
|---|---|---|
| Topic intake + assessment chat | ✅ | |
| Difficulty + time configuration | ✅ | |
| Research agent with web search | ✅ | |
| Curriculum generation (modules + lessons + quizzes) | ✅ | |
| Calendar scheduling view | ✅ | |
| Slide-based lessons | ✅ | |
| Quiz runner (MC + short answer) | ✅ | |
| Sources page | ✅ | |
| Lesson completion tracking | ✅ | |
| Podcast lesson format | | ✅ |
| Article lesson format | | ✅ |
| Interactive diagram format | | ✅ |
| Progress analytics dashboard | | ✅ |
| Multi-user / social features | | ✅ |
| Mobile app | | ✅ |
| Curriculum regeneration / versioning | | ✅ |
| Spaced repetition system | | ✅ |

---

## 11. Suggested Build Order

1. **Supabase schema + Next.js scaffold** — auth, DB, routing
2. **Onboarding flow** — topic intake → assessment chat (streaming) → configuration
3. **Research + curriculum agent** — with live generation log UI
4. **DB persistence layer** — save full curriculum to Supabase on generation
5. **Calendar view** — render scheduled lessons/quizzes from DB
6. **Slide viewer** — lazy generate + render slides for current lesson
7. **Quiz runner** — generate, display, score, save responses
8. **Sources page + course overview**
9. **Polish** — loading states, error handling, empty states, progress indicators

---

## 12. Design Direction

Target aesthetic: **editorial/utilitarian** — think a high-end notebook or university press. Clean typography, generous whitespace, muted base with strong accent for interactive elements. The slide viewer should feel like a premium presentation tool, not a quiz app. Avoid purple gradients and generic SaaS aesthetics.

Font suggestion: A serif or slab-serif for headings (Playfair Display, Libre Baskerville, or Bitter) paired with a clean mono or geometric sans for body (DM Mono, IBM Plex Sans). This reinforces the "serious learning" tone.

---

*End of Brief*
