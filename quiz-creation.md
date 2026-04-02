# Skill: Quiz & Test Creation

## Purpose
Guide the AI agent generating quiz and exam questions. Assessment is not just measurement — it IS learning. Well-designed questions force retrieval, surface misconceptions, deepen understanding, and build confidence. Poorly designed questions create confusion, reward test-gaming, and undermine trust in the platform. Every question must be defensible.

---

## Core Principles

### Retrieval Practice is the Point
The act of attempting to recall information — even incorrectly — strengthens memory more than re-reading or reviewing. Questions should require the learner to actively reconstruct knowledge from memory, not recognize it from context clues. Design questions that cannot be answered by scanning the lesson again.

### Every Question Must Have a Purpose
Before writing a question, state which learning objective it tests. If you cannot link a question to a specific learning objective, cut it. Filler questions (testing trivial facts, testing things that were never taught) erode trust and waste the learner's time.

### Questions Should Diagnose, Not Just Score
Each question should tell you something specific about what the learner understands or misunderstands. A well-designed question separates learners who understand the concept from learners who have memorized vocabulary without understanding.

### Explanations Are Mandatory
Every question — even multiple choice — must have an explanation that appears after the learner submits. The explanation:
- Confirms why the correct answer is right
- Explains why each wrong answer is wrong
- Adds a brief teaching moment for learners who missed it

This transforms a quiz into a teaching tool.

---

## Quiz Types and Purpose

### Lesson Check (3–5 Questions)
**Trigger**: After every individual lesson  
**Purpose**: Immediate recall reinforcement. Tests whether the learner grasped the lesson's primary concept.  
**Characteristics**:
- Only covers content from that specific lesson
- Bloom's levels: Remember and Understand primarily
- Quick — should take 3–5 minutes
- Friendly, low-stakes tone
- No trick questions — this is reinforcement, not a gotcha

### Module Exam (10–15 Questions)
**Trigger**: After all lessons in a module are complete  
**Purpose**: Integrated understanding of the module's theme. Tests whether concepts connect, not just whether they were remembered individually.  
**Characteristics**:
- 80% covers the completed module
- 20% reviews prior modules (interleaving)
- Bloom's levels: Understand + Apply + beginning Analyze
- Includes at least 2 short-answer questions
- 15–20 minutes expected

### Final Exam (25–40 Questions)
**Trigger**: After the final module is completed  
**Purpose**: Synthesis and transfer. Tests whether the learner can use knowledge across the full course, not just recall it.  
**Characteristics**:
- Distributed coverage across all modules (weighted toward later, harder modules)
- Bloom's levels: Apply + Analyze + Evaluate (+ Create for 400/graduate)
- Includes scenario-based questions (apply concepts to new situations)
- Includes at least 4 short-answer questions
- 45–60 minutes expected

---

## Question Type Guidelines

### Multiple Choice (60% of questions)
The most efficient question type, but also the most abused. Rules:

**Stem (the question):**
- Poses a complete question or problem — never an incomplete sentence to fill in
- All essential information is in the stem
- One clear, unambiguous correct answer
- No trick phrasing, no double negatives
- Bloom's verb implied: "Which of the following **best explains**...", "What would happen if...", "Which approach is **most appropriate**..."

**Answer Options (4 options standard — A, B, C, D):**
- All options plausible. A learner who didn't study should not be able to eliminate 2 options immediately.
- All options grammatically parallel
- No "all of the above" or "none of the above" — these are lazy and teach test-taking, not the subject
- Options roughly equal in length — a noticeably longer correct answer is a tell

**Distractors (wrong answers):**
This is the craft of multiple choice. Good distractors represent **real misconceptions**, not random wrong answers.

How to write good distractors:
- What do learners typically confuse this concept with?
- What happens if you apply the concept in the wrong context?
- What is a partially correct answer (right idea, wrong application)?
- What is the answer if you confuse this with a related but different concept?

Example (bad distractors — obviously wrong):
> Question: What is Newton's First Law?  
> A) Objects in motion stay in motion unless acted upon by an external force ✅  
> B) Force equals mass times acceleration  
> C) For every action there is an equal and opposite reaction  
> D) Gravity attracts all objects with mass  

These are not distractors — they're other Newton laws. A learner who knew nothing could still get this right by recognizing that B, C, D are "other Newton laws."

Example (good distractors — plausible misconceptions):
> Question: What does Newton's First Law predict about a ball rolling on a perfectly frictionless surface?  
> A) The ball will eventually slow to a stop ← (common real-world intuition)  
> B) The ball will speed up indefinitely ← (confuses with acceleration)  
> C) The ball will continue moving at constant speed ✅  
> D) The ball will stop immediately if no force is applied ← (misapplies the law)

### Short Answer (25% of questions)
Require the learner to produce an answer in their own words. Cannot be guessed.

**Guidelines:**
- 1–3 sentence expected response
- Clear prompt: "In 1–2 sentences, explain..." or "Describe in your own words..."
- For technical topics: "Write the code/formula that..." or "Calculate..."
- Scoring rubric embedded in the correct answer: specify the 2–3 key elements the answer must include
- Grade with partial credit logic in the explanation

**Question formats:**
- "Explain why [X] happens in [Y] situation"
- "Describe the difference between [A] and [B] in your own words"
- "Given [scenario], what would you expect to happen and why?"
- "What is the most important thing to consider when [doing X]?"

### True / False (15% of questions)
The weakest question type (50% guessing floor) but useful for quickly testing definitional precision. Only use for statements that are unambiguously true or false.

**Rules:**
- Never use True/False for nuanced or contested statements
- The false statements must be false for a specific, teachable reason
- Explain not just what is false, but specifically what would make it true
- Do not use hedging language ("usually," "generally," "often") — this makes the question ambiguous

---

## Bloom's Taxonomy by Question Template

### Remember
- "Define [term]"
- "What is [concept]?"
- "Which of the following is an example of [concept]?"
- "List the steps in [process]"

### Understand
- "In your own words, explain [concept]"
- "What is the difference between [A] and [B]?"
- "Why does [X] happen?"
- "Which of the following best describes [concept]?"

### Apply
- "Given [scenario], what would [concept] predict?"
- "Which approach would you use to [solve problem]?"
- "If [condition changes], what happens to [outcome]?"
- "Apply [concept] to [new situation]"

### Analyze
- "Why does [A] work in [context 1] but not [context 2]?"
- "What are the underlying assumptions in [argument/model]?"
- "Compare [A] and [B] — what are the key tradeoffs?"
- "Identify the flaw in [reasoning]"

### Evaluate
- "Which approach is most appropriate for [situation], and why?"
- "Critique [argument/approach] — where does it succeed and where does it fall short?"
- "Given the tradeoffs, which would you recommend?"

### Create
- "Design a [solution/system/approach] that addresses [problem]"
- "Propose a way to [achieve goal] using [concepts from course]"
- (These are typically short-answer or project prompts, not standard quiz questions)

---

## Difficulty Calibration by Level

### 100-Level Quizzes
- 70% Remember/Understand, 30% Apply
- No trick questions, no edge cases
- Answer explanations generous and encouraging
- Short answer prompts invite reflection, not technical precision

### 200-Level Quizzes
- 40% Remember/Understand, 40% Apply, 20% Analyze
- Distractors represent genuine misconceptions
- Short answer requires some precision

### 300-Level Quizzes
- 20% Understand, 50% Apply, 30% Analyze/Evaluate
- Scenario-based multiple choice (apply to novel situations)
- Short answer requires accurate use of terminology

### 400-Level / Graduate Quizzes
- 10% Understand, 30% Apply, 40% Analyze, 20% Evaluate/Create
- Questions have no single "obviously correct" answer — require judgment
- Short answer requires nuanced argument
- Some questions have multiple defensible answers (noted in explanation)

---

## Question JSON Output Format

```json
{
  "quiz_id": "string",
  "quiz_type": "lesson_check | module_exam | final_exam",
  "title": "string",
  "estimated_minutes": 0,
  "questions": [
    {
      "id": "q1",
      "order_index": 1,
      "question_type": "multiple_choice | short_answer | true_false",
      "bloom_level": "remember | understand | apply | analyze | evaluate | create",
      "learning_objective_tested": "string — which lesson/module objective this tests",
      "question": "string",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A | B | C | D | true | false | rubric string for short answer",
      "short_answer_key_elements": ["element 1 required in answer", "element 2"],
      "explanation": "string — explains correct answer AND why distractors are wrong",
      "difficulty": "easy | medium | hard"
    }
  ]
}
```

---

## Module Exam Coverage Matrix

When generating a module exam, fill this matrix to ensure balanced coverage:

| Lesson | Remember | Understand | Apply | Total |
|---|---|---|---|---|
| Lesson 1 | 1 | 1 | 1 | 3 |
| Lesson 2 | 0 | 1 | 2 | 3 |
| Lesson 3 | 0 | 1 | 1 | 2 |
| Prior Module Review | — | 1 | 2 | 3 |
| **Total** | **1** | **4** | **6** | **11** |

Adapt column distribution based on course difficulty level.

---

## Quality Checklist

- [ ] Every question linked to a specific learning objective
- [ ] No questions on content not covered in the lessons
- [ ] All multiple choice distractors represent real misconceptions (not random wrong answers)
- [ ] No "all of the above" or "none of the above" options
- [ ] Every question has a complete explanation (correct answer + why wrong answers are wrong)
- [ ] Short answer questions specify key elements required in the answer
- [ ] True/False questions are unambiguously true or false (no hedging language)
- [ ] Bloom's level distribution matches the quiz type and course difficulty
- [ ] Module exams include 20% interleaved review from prior modules
- [ ] Estimated time is realistic (1–2 min per MC, 3–5 min per short answer)
- [ ] Tone matches difficulty level (encouraging at 100-level, peer-level at 400)
- [ ] No trick questions — every question a prepared learner should be able to answer
