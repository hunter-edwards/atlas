# Skill: Curriculum Design

## Purpose
Guide the AI agent responsible for transforming research output and learner assessment data into a structured, pedagogically sound curriculum. A curriculum is not a table of contents — it is a carefully sequenced learning journey with clear objectives, intentional pacing, and a coherent narrative arc from novice to competent.

---

## Foundational Principles

### 1. Backwards Design (Start With the End)
Begin by defining what the learner will be able to DO at the end of the course. Then design backward from that outcome. Every module, lesson, and quiz should have a traceable line back to the terminal learning objective.

Process:
1. Define terminal outcomes ("By the end of this course, the learner will be able to...")
2. Define module-level outcomes (what must be true at the end of each module for the terminal outcome to be reachable)
3. Design lessons that build toward module outcomes
4. Design assessments that verify module and lesson outcomes were achieved

### 2. Bloom's Taxonomy Alignment
Every learning objective must be written with a Bloom's verb that matches the intended cognitive level for the learner's stage and difficulty setting.

| Level | Verbs | When to Use |
|---|---|---|
| Remember | define, list, recall, identify | Early lessons in a new module |
| Understand | explain, describe, summarize, classify | Mid-module concept lessons |
| Apply | use, implement, demonstrate, calculate | Practical application lessons |
| Analyze | compare, contrast, break down, examine | Advanced lessons, module wrap-ups |
| Evaluate | judge, critique, assess, justify | Senior lessons, final module |
| Create | design, build, compose, formulate | Capstone lessons, final project |

**Difficulty level to Bloom's ceiling:**
- 100-level: Remember + Understand + basic Apply
- 200-level: Apply + Analyze
- 300-level: Analyze + Evaluate
- 400-level: Evaluate + Create
- Graduate: Create (with emphasis on original synthesis)

### 3. Scaffolding and Prerequisite Sequencing
Concepts must be taught in dependency order. A learner cannot understand gradient descent without first understanding derivatives and cost functions. Use the concept dependency map from the Research Agent to enforce this ordering.

Rules:
- Never introduce a concept before all its dependencies have been taught
- The first lesson of any module should be accessible to someone who has completed all prior modules — no surprise prerequisites
- When a concept requires prerequisite knowledge the learner may not have, include a "bridge" lesson or a brief recap at the start of the module

### 4. Interleaving and Spacing
Do not group all coverage of one concept in one place and never return to it. Research on learning shows that interleaving (mixing related concepts) and spacing (returning to concepts over time) dramatically improves retention.

Apply this by:
- Including brief review questions from prior modules in each new module's quiz
- Designing "callback" lessons that apply earlier concepts in new contexts
- Spacing assessments so learners return to material after a gap

### 5. Cognitive Load Management
Each lesson should introduce **one primary concept** with a maximum of 2–3 supporting sub-concepts. Avoid "information dump" lessons that introduce 8 new ideas without time for consolidation.

Signs of cognitive overload in curriculum design:
- Lessons with more than 12 slides
- Modules with more than 6 consecutive lessons before a checkpoint
- Quiz questions that require holding more than 3 new concepts simultaneously

---

## Curriculum Structure

### Course Architecture
```
Course
├── Module 1 (Foundational)
│   ├── Lesson 1.1
│   ├── Lesson 1.2
│   ├── Lesson 1.3
│   ├── Lesson Check Quiz (after every lesson, or every 2 for advanced)
│   └── Module 1 Exam
├── Module 2 (Core Concept A)
│   └── ...
├── Module N (Advanced / Synthesis)
│   └── ...
└── Final Exam
```

### Module Design Rules
- **Modules per course**: 4–8 depending on scope and difficulty
- **Lessons per module**: 3–6 lessons
- **Module theme**: Each module should have ONE clear theme or concept cluster. If you cannot write the module theme in one sentence, it needs to be split.
- **Module arc**: Modules follow a consistent internal arc:
  1. Hook lesson (why this matters, real-world application)
  2. Foundation lesson(s) (core concept instruction)
  3. Application lesson (hands-on or worked examples)
  4. Synthesis lesson (connecting to prior and future modules)
  5. Module exam

### Lesson Design Rules
- **Duration**: 45–75 minutes estimated reading/engagement time per lesson
- **Slides per lesson**: 8–14 slides
- **One primary concept per lesson**: State it explicitly in the lesson title
- **Lesson arc** (see Slide Creation skill for detailed slide-level guidance):
  1. Hook / relevance opener
  2. Concept introduction
  3. Explanation and elaboration
  4. Example or case study
  5. Common mistakes or misconceptions
  6. Application exercise prompt
  7. Summary and preview of next lesson

### Quiz Placement Rules
- **Lesson check**: Short (3–5 questions) after every lesson. Tests immediate recall and basic application of that lesson's concept only.
- **Module exam**: Medium (10–15 questions) after each module is complete. Covers the full module, includes interleaved review from prior modules (20% of questions).
- **Final exam**: Long (25–40 questions) at course end. Tests synthesis and application across all modules.

---

## Writing Learning Objectives

Every module and lesson must have an explicit learning objective written in this format:

> "By the end of this [module/lesson], the learner will be able to [Bloom's verb] [specific outcome] [context/constraint if applicable]."

**Examples:**
- "By the end of this lesson, the learner will be able to **explain** the difference between supervised and unsupervised learning using their own examples."
- "By the end of this module, the learner will be able to **implement** a basic linear regression model in Python and interpret the output."
- "By the end of this course, the learner will be able to **evaluate** machine learning model performance and diagnose common failure modes."

Avoid vague objectives like "understand X" or "know about Y." Every objective should be assessable — you should be able to write a quiz question that directly tests it.

---

## Difficulty Calibration by Level

### 100-Level (Survey)
- Assumes no prior knowledge
- Heavy use of analogy and everyday examples
- Vocabulary introduced gradually with definitions
- Minimal math or technical notation
- Focus: breadth over depth
- Tone: conversational and encouraging

### 200-Level (Foundational)
- Assumes completion of 100-level or equivalent self-assessment
- Introduces formal vocabulary and notation
- Light quantitative reasoning where relevant
- Begins to distinguish between concepts (not just define them)
- Focus: building a reliable mental model

### 300-Level (Intermediate)
- Assumes solid foundational knowledge
- Engages with complexity, edge cases, tradeoffs
- Expects learner to apply concepts to novel situations
- Introduces professional-level tools and practices
- Focus: fluency and transfer

### 400-Level (Advanced)
- Assumes intermediate mastery
- Focuses on depth, nuance, and synthesis
- Engages with competing frameworks and critiques
- Learner expected to evaluate approaches, not just apply them
- Focus: judgment and professional competency

### Graduate Level
- Assumes strong domain knowledge
- Primary focus on original synthesis, research, and creation
- Heavy engagement with primary literature
- Learner expected to produce novel analysis or work
- Focus: mastery and contribution

---

## Curriculum JSON Output Format

```json
{
  "course": {
    "title": "string",
    "college_equivalent": "e.g. ECON 201: Intermediate Microeconomics",
    "difficulty_level": "100 | 200 | 300 | 400 | graduate",
    "terminal_objective": "string",
    "estimated_total_hours": 0,
    "module_count": 0,
    "lesson_count": 0,
    "quiz_count": 0
  },
  "modules": [
    {
      "id": "module_1",
      "title": "string",
      "theme": "One sentence describing this module's focus",
      "learning_objective": "string",
      "order_index": 1,
      "prerequisite_module_ids": [],
      "lessons": [
        {
          "id": "lesson_1_1",
          "title": "string",
          "learning_objective": "string",
          "primary_concept": "string",
          "lesson_type": "hook | instruction | application | synthesis",
          "estimated_duration_minutes": 60,
          "slide_count_target": 10,
          "key_concepts": ["string"],
          "order_index": 1
        }
      ],
      "quizzes": [
        {
          "id": "quiz_1_check_1",
          "quiz_type": "lesson_check | module_exam",
          "after_lesson_id": "lesson_1_1",
          "question_count": 5,
          "bloom_levels": ["remember", "understand"]
        }
      ]
    }
  ],
  "final_exam": {
    "id": "final_exam",
    "question_count": 30,
    "coverage": "all modules",
    "bloom_levels": ["understand", "apply", "analyze", "evaluate"]
  }
}
```

---

## Quality Checklist

- [ ] Terminal learning objective is specific and assessable
- [ ] Every module has one clear theme
- [ ] Concepts are sequenced in dependency order (no concept appears before its prerequisites)
- [ ] Each lesson has an explicit learning objective with a Bloom's verb
- [ ] Bloom's levels appropriate to the course difficulty setting
- [ ] No lesson introduces more than one primary concept
- [ ] Quizzes placed after every lesson (check) and every module (exam)
- [ ] Final exam included
- [ ] Interleaving planned (module exams include 20% prior module review)
- [ ] Course arc flows: foundational → core → application → synthesis
- [ ] Estimated hours are realistic (45–75 min per lesson + 20 min per quiz)
