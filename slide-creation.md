# Skill: Slide Creation

## Purpose
Guide the AI agent generating lesson slide content. Slides in this platform are the primary learning medium and must function as standalone educational content — not presenter support material. Every slide must teach effectively without a human presenter. The goal is to make each lesson feel as engaging and well-paced as a great lecture, but in a format the learner controls.

---

## Slide Philosophy

### One Idea Per Slide
The most common mistake in educational slide design is packing too much onto one slide. Each slide should introduce, develop, or reinforce **exactly one idea**. If you find yourself writing "and also..." on a slide, that's a new slide.

### Slides as a Narrative
A lesson is not a list of facts — it is a story. The learner arrives with a question or curiosity, moves through tension (complexity, new information, challenged assumptions), and resolves at understanding. Treat each lesson as a short narrative arc and let the slides carry that arc.

### Respect Cognitive Load
Working memory can hold approximately 4 items simultaneously. Slides that introduce 7 new terms with 3 diagrams and a 200-word explanation overload the learner. Design for the learner's working memory, not for completeness.

### Write for the Reader, Not the Expert
Avoid jargon without definition. Avoid assuming the reader holds the same mental model you do. Write as if you are explaining to a smart friend who is new to this — clear, direct, and without condescension.

---

## Lesson Arc (8–14 Slides)

Every lesson follows this arc. Adapt proportionally based on the target slide count.

### Slide 1: Hook (1 slide)
**Purpose**: Create curiosity or relevance before any content is introduced.

Approaches:
- A surprising fact or counterintuitive result ("Most people assume X, but actually...")
- A real-world scenario where this concept matters ("Imagine you're a doctor and...")
- A provocative question that the lesson will answer ("Why do bridges oscillate in wind?")
- A brief story or case study that sets up the lesson's concept
- A concrete before/after contrast ("Before understanding this: struggle. After: clarity.")

Do NOT start with definitions. Do NOT start with "In this lesson we will cover..."

### Slide 2: Lesson Overview (1 slide)
**Purpose**: Orient the learner. Brief and functional.

Content:
- Lesson title (concise, concept-forward)
- Learning objective stated plainly ("By the end of this lesson, you'll be able to...")
- A 3–5 bullet roadmap of what's coming (the narrative beats of the lesson)

### Slides 3–5: Core Concept Introduction (2–4 slides)
**Purpose**: Introduce and explain the primary concept clearly.

Guidelines:
- Define the concept plainly on the first slide. No assumptions, no jargon without definition.
- Follow with a second slide that elaborates — adds depth, nuance, or sub-components.
- Avoid walls of text. Maximum 5–6 bullet points OR a short paragraph (4–5 sentences), never both.
- Use `[VISUAL: description]` tags to indicate where a diagram, chart, or illustration would appear. These are placeholders for the visual layer. Describe specifically what the visual should show.

**`[VISUAL]` tag guidelines:**
- Be specific: `[VISUAL: Flow diagram showing request → server → database → response cycle]` not `[VISUAL: diagram]`
- Match the visual to the concept type:
  - Processes → flowcharts
  - Relationships → diagrams or graphs
  - Quantities → charts or tables
  - Timelines → sequence diagrams
  - Comparisons → side-by-side tables
  - Spatial concepts → illustrations

### Slides 6–7: Worked Example or Case Study (1–2 slides)
**Purpose**: Demonstrate the concept in action. Abstract becomes concrete.

Guidelines:
- Use a specific, realistic example — not a toy example unless the concept is purely abstract
- Walk through the example step by step if it's a process
- Call out which part of the concept the example is demonstrating
- For technical topics: include actual code, formulas, or worked calculations
- For conceptual topics: use a narrative or analogy that maps cleanly onto the concept
- If two examples would help (contrasting cases), use two slides

### Slide 8: Common Misconceptions (1 slide)
**Purpose**: Proactively address where learners most often go wrong.

Format: 2–3 misconceptions, each presented as:
- ❌ **The misconception** (stated as a belief someone might hold)
- ✅ **The correction** (concise, direct)

This is one of the highest-value slides in the lesson. Anticipating confusion is better than correcting it on the quiz.

### Slide 9: Application or Practice Prompt (1 slide)
**Purpose**: Give the learner something to DO with what they just learned.

Guidelines:
- This is a prompt, not a quiz question. It invites reflection or lightweight application.
- Framed as: "Try this:" or "Reflect:" or "Before moving on:"
- Examples:
  - "Try explaining [concept] out loud in one sentence as if talking to a friend."
  - "Identify one place in your own life or work where [concept] applies."
  - "Without looking back, write down the three key steps in [process]."
- For technical topics: a small coding or calculation challenge
- Do NOT grade this slide — it is for the learner's own reinforcement

### Slide 10: Summary (1 slide)
**Purpose**: Consolidate the lesson's key takeaways.

Format:
- 3–5 bullet points restating the most important ideas from the lesson
- Written as complete, self-contained statements (not fragments)
- Someone reading only this slide should get the essential lesson

### Slide 11: Connection & Preview (1 slide)
**Purpose**: Situate this lesson in the bigger picture and create forward momentum.

Content:
- How this lesson connects to what came before ("Now that you understand X...")
- How it sets up what comes next ("In the next lesson, we'll use this to...")
- One sentence on why this lesson matters in the broader course arc

### Slide 12–14 (Optional): Deep Dive or Supplementary Content
**Purpose**: For advanced learners or topics that warrant extra depth.

Use these slides for:
- An additional worked example with more complexity
- Historical or contextual background for context-hungry learners
- "Going further" resources or open questions in the field
- Edge cases or exceptions to the core concept

Mark these slides visually as "Optional / Going Deeper" so learners can skip without losing the lesson's coherence.

---

## Slide Writing Standards

### Body Text
- Maximum 6 bullet points per slide OR a paragraph of 4–5 sentences — never both
- Bullet points: Complete thoughts, not fragments. End with punctuation.
- Paragraphs: One idea per paragraph. Short sentences preferred.
- No bullet nesting more than 1 level deep
- Active voice always. Passive voice signals a lazy sentence.

### Titles
- Every slide has a title
- Titles are concept-forward, not topic labels: "Why Indexes Dramatically Speed Up Queries" not "Database Indexes"
- Titles should complete the thought or ask the question the slide answers
- Maximum 10 words

### Tone by Difficulty Level
| Level | Tone |
|---|---|
| 100-level | Conversational, encouraging, analogy-heavy |
| 200-level | Clear, structured, begins using formal vocabulary |
| 300-level | Direct, precise, professional |
| 400-level | Peer-to-peer, assumes competence, challenges assumptions |
| Graduate | Collegial, engages with ambiguity and debate |

### Speaker Notes (Required for Every Slide)
Every slide must include `speaker_notes` — a 2–4 sentence elaboration of the slide's content as if being spoken aloud by a tutor. Speaker notes:
- Expand on the slide content, not repeat it
- Add verbal cues ("Here's the thing to notice...", "What trips people up here is...")
- Will serve as the script for podcast mode in a future version — write for spoken delivery
- Conversational tone, even on formal slides

---

## Slide JSON Output Format

```json
{
  "lesson_id": "string",
  "lesson_title": "string",
  "slides": [
    {
      "id": "slide_1",
      "order_index": 1,
      "slide_type": "hook | overview | instruction | example | misconceptions | practice | summary | preview | deep_dive",
      "title": "string",
      "body": "Markdown string — use **bold**, *italic*, bullet lists, code blocks as needed",
      "visual_hint": "Specific description of the ideal visual for this slide, or null",
      "speaker_notes": "2–4 sentences written for spoken delivery",
      "is_optional": false
    }
  ]
}
```

---

## Markdown Usage in Body

Use Markdown formatting in the `body` field:

```markdown
**Bold** for key terms being defined or emphasized
*Italic* for secondary emphasis or titles of works
`code` for inline code, variable names, technical terms
```code blocks``` for multi-line code
- Bullet lists for enumerated points
1. Numbered lists for sequential steps
> Blockquotes for notable quotes or callouts
```

---

## Quality Checklist

- [ ] Every lesson follows the hook → overview → concept → example → misconceptions → practice → summary → preview arc
- [ ] No slide introduces more than one primary idea
- [ ] Every slide has a concept-forward title (not a topic label)
- [ ] `[VISUAL]` tags placed on every slide where a diagram would genuinely help
- [ ] Visual hints are specific (describe what the visual shows, not just its type)
- [ ] Speaker notes written for every slide, in spoken voice
- [ ] Misconceptions slide includes at least 2 misconceptions with corrections
- [ ] Application slide uses "Try this:" or "Reflect:" framing, not a quiz question
- [ ] Summary slide contains 3–5 complete standalone statements
- [ ] Tone matches course difficulty level
- [ ] No passive voice, no jargon without definition, no condescension
- [ ] Optional deep-dive slides clearly marked
