# Skill: Scheduling & Pacing

## Purpose
Guide the AI agent responsible for transforming a generated curriculum into a concrete, time-based learning schedule. Scheduling is not just date math — it applies evidence-based principles of learning science to maximize retention and minimize burnout. A well-scheduled curriculum feels achievable and purposeful. A poorly scheduled one feels overwhelming on week one and abandoned by week three.

---

## Core Learning Science Principles Applied to Scheduling

### 1. Spaced Repetition
Information reviewed at increasing intervals is retained far longer than information reviewed repeatedly in a short window. The scheduling agent must build in deliberate spacing — returning to earlier concepts via quiz questions, callback lessons, and review sessions.

**Application rules:**
- Do not schedule all content from a module in consecutive days with no gap before the module exam
- Place module exams at least 1–2 days after the final lesson in that module (not immediately after)
- Final exam should be scheduled at least 3–5 days after the last module exam
- Build in an explicit "review day" before each module exam if the user's pace allows

### 2. Interleaving
Mixing different types of problems and concepts during practice (rather than blocking all of one type together) improves learning, even though it feels harder. This is known as the "interleaving effect."

**Application rules:**
- Quizzes should not cluster all questions on one concept — they should alternate between concepts from the module
- If a learner is doing multiple sessions per week, avoid scheduling two consecutive lessons from the same sub-topic when possible
- The quiz generation skill handles interleaving at the question level — the scheduling skill handles it at the session level

### 3. Desirable Difficulty
Learning is more durable when it requires effort. Easy, frictionless review produces less retention than effortful retrieval. This means:
- Scheduling a lesson check quiz immediately after a lesson (not days later) is appropriate — that tests short-term recall
- Scheduling a module exam several days after the lessons ends forces retrieval from longer-term memory — this is the goal
- Do not over-schedule easy review content — it feels productive but doesn't build durable memory

### 4. Cognitive Load and Session Length
Cognitive load degrades sharply after 60–90 minutes of focused learning. Scheduling multiple hours of new content in a single session is ineffective and discouraging.

**Session length rules:**
- **Hard cap**: No session should contain more than 90 minutes of active learning content
- **Ideal range**: 45–60 minutes per learning session for new material
- **Quiz-only sessions**: Can be shorter (15–25 minutes) and can follow a lesson on the same day if both fit within the 90-minute cap
- If a user requests 4+ hour/week commitments, distribute across sessions — don't compress into one long session

### 5. Rest and Consolidation
Memory consolidation happens during rest, particularly sleep. Back-to-back daily sessions for 7 days are less effective than sessions with rest days interspersed.

**Rest day rules:**
- For ≤5 hrs/week: 2–3 sessions/week with rest days between
- For 6–10 hrs/week: 3–4 sessions/week, never more than 2 consecutive learning days
- For 10+ hrs/week: Up to 5 sessions/week, with mandatory weekend rest day at minimum

### 6. Momentum and Early Wins
The first week of a course determines whether the learner continues. The schedule should be designed so that the first week feels achievable and rewarding — the learner completes real content and passes a quiz.

**Rules for Week 1:**
- Do not front-load the hardest or most abstract material (even if it's prerequisite)
- The first lesson should be a "hook" lesson — high motivation, low cognitive demand
- The learner should complete and pass at least one lesson check quiz in the first session
- Week 1 should end with a sense of progress — visible completion markers

---

## Schedule Generation Process

### Input Required
```json
{
  "curriculum": "Full curriculum JSON from the Curriculum Design agent",
  "start_date": "ISO date",
  "sessions_per_week": 3,
  "hours_per_week": 6,
  "session_length_minutes": 60,
  "preferred_days": ["Monday", "Wednesday", "Friday"],
  "hard_deadline": "ISO date or null"
}
```

### Step 1: Compute Total Course Duration
```
total_learning_minutes = (lesson_count × avg_lesson_minutes) + (quiz_count × avg_quiz_minutes)
total_weeks = ceil(total_learning_minutes / (hours_per_week × 60))
projected_end_date = start_date + total_weeks weeks
```

If `projected_end_date` exceeds `hard_deadline`, flag a conflict and offer two options:
1. Reduce scope (fewer modules or lessons per module)
2. Increase hours per week commitment

### Step 2: Assign Sessions to Calendar Days
Based on `preferred_days` and `sessions_per_week`, generate the set of available session dates from `start_date`.

Rules:
- Respect user-preferred days exactly if provided
- If no preference, distribute evenly across the week with rest days between
- Never schedule two consecutive sessions unless the user has specified daily availability

### Step 3: Assign Content to Sessions

**Content unit types and time estimates:**
| Unit | Estimated Time |
|---|---|
| Hook/Intro lesson | 30–45 min |
| Standard instruction lesson | 45–60 min |
| Application/synthesis lesson | 60–75 min |
| Lesson check quiz | 5–10 min |
| Module exam | 15–25 min |
| Final exam | 45–60 min |
| Review session | 20–30 min |

**Assignment rules:**
1. A session can contain one lesson + its immediate lesson check quiz if total time ≤ 90 minutes
2. A session cannot contain two new lessons (too much new content at once)
3. Module exams go on their own session, or paired with a review of prior content (not with a new lesson)
4. Place at least one rest day between the final lesson of a module and the module exam
5. If a session would be under 30 minutes of content, combine with a short review session or light practice
6. Final exam must be its own dedicated session

**Special scheduling: Review Sessions**
Insert explicit review sessions before module exams and the final exam:
- Before a module exam: a review session covering key concepts from that module's lessons (lightweight, no new content)
- Before the final exam: a cumulative review session spanning the hardest concepts across all modules

### Step 4: Buffer Days
Real learners miss sessions. Build buffer into the schedule:
- Add 1 buffer week per every 4 weeks of content
- Distribute buffer at the end of each major module (not just at the end of the course)
- If the learner finishes early, buffer days become "explore further" sessions (optional deep-dives)

### Step 5: Validate and Flag Issues
Before returning the schedule, check:
- No session exceeds 90 minutes of content
- No two new lessons on the same day
- At least 1 rest day before every module exam
- At least 3 rest days before final exam
- Week 1 is achievable and includes at least one completed quiz
- Total weeks ≤ `hard_deadline` constraint (if set)

---

## Schedule Output Format

```json
{
  "schedule_summary": {
    "start_date": "ISO date",
    "projected_end_date": "ISO date",
    "total_weeks": 0,
    "total_sessions": 0,
    "weekly_hours_actual": 0,
    "buffer_weeks": 0
  },
  "sessions": [
    {
      "session_number": 1,
      "date": "ISO date",
      "day_of_week": "Monday",
      "estimated_duration_minutes": 60,
      "session_type": "lesson | review | exam | buffer",
      "items": [
        {
          "item_id": "lesson_1_1",
          "item_type": "lesson | quiz | review | exam",
          "title": "string",
          "estimated_minutes": 50,
          "order_within_session": 1
        }
      ],
      "session_notes": "Optional: 'First session — keep it light and finish strong.'"
    }
  ]
}
```

---

## Pacing Recommendations by Difficulty Level

### 100-Level
- Gentler ramp: start with 1–2 shorter sessions per week
- More lesson checks, fewer module exams
- Generous buffer time built in
- First module should complete by end of week 2

### 200-Level
- Standard pacing: 2–3 sessions per week
- Regular module exams as milestone markers
- Buffer distributed throughout

### 300-Level
- 3 sessions/week minimum for effective learning
- Denser content per session acceptable (up to 90 min)
- Encourage spaced self-review between module exams

### 400-Level / Graduate
- Assume learner is self-directed and will do supplementary reading
- Scheduled content is the spine, not the whole body
- Sessions can be longer (60–90 min is appropriate)
- Final exam should be preceded by a substantial review period (3–5 days minimum)

---

## Edge Cases and How to Handle Them

### Learner Has a Hard Deadline That's Too Close
Calculate the minimum viable course (core lessons only, skip deep-dive content) and present both options:
1. Compressed core curriculum that fits the deadline
2. Full curriculum with deadline pushed

### Learner Requests More Than 20 Hours/Week
Flag this as unsustainable for learning quality. Recommend a maximum of 12–15 hours/week of active study. Above that, diminishing returns accelerate. Suggest using the extra time for supplementary reading or projects, not more lesson content.

### Very Short Courses (< 4 weeks)
For highly focused, short courses (e.g., "learn Git basics"), compress the structure:
- Combine lesson + quiz in every session (content is short enough)
- Single module exam replaces final exam
- No review sessions needed — the course is the review

### Very Long Courses (> 16 weeks)
Break into phases of 4–6 weeks each with a milestone checkpoint at the end of each phase. This preserves motivation and creates natural re-entry points if the learner pauses.

---

## Quality Checklist

- [ ] No session exceeds 90 minutes of content
- [ ] No two new lessons scheduled in the same session
- [ ] At least 1 day gap between final lesson of a module and its module exam
- [ ] At least 3 days gap before final exam
- [ ] Review sessions placed before all major exams
- [ ] Week 1 is achievable and includes a completed quiz
- [ ] Buffer weeks included (1 per 4 weeks of content)
- [ ] Schedule respects user's preferred days (if specified)
- [ ] Total duration fits within hard deadline (if set), or conflict is flagged
- [ ] Pacing matches difficulty level guidelines
