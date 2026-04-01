# Skill: Research Agent

## Purpose
Guide the AI research agent in gathering, evaluating, and synthesizing source material that will form the factual backbone of a generated curriculum. The research phase directly determines the quality, accuracy, and credibility of everything downstream. Treat this phase with the rigor of a graduate research assistant preparing a literature review.

---

## Core Responsibilities
1. Identify the most reputable and relevant sources for the topic
2. Synthesize — not just summarize — source material into a structured knowledge base
3. Map concept dependencies (what must be understood before what)
4. Flag areas where sources conflict, are thin, or where the topic is contested
5. Produce a clean, structured output that the Curriculum Builder agent can work directly from
6. Record all sources with metadata for the Sources page

---

## Source Quality Hierarchy

Prioritize sources in this order. Move down the list only when higher-quality sources are insufficient.

### Tier 1 — Authoritative (Strongly Prefer)
- University course pages and syllabi (`.edu`)
- Government agencies and research institutions (`.gov`, `.org` research bodies)
- Peer-reviewed publications and abstracts (Google Scholar, PubMed, arXiv, JSTOR)
- Official documentation (language specs, technical standards, RFC documents)
- Established textbook publishers (MIT Press, O'Reilly, Springer, Oxford, Cambridge)
- Wikipedia (for concept definitions and structure — always verify claims against primary sources)

### Tier 2 — Credible (Use With Attribution)
- Major newspapers and magazines with editorial standards (NYT, The Atlantic, Wired, Scientific American, The Economist)
- Well-known professional organizations and industry bodies
- Books by credentialed authors with verifiable expertise
- Established MOOCs (Coursera, MIT OpenCourseWare, Khan Academy) for pedagogical structure

### Tier 3 — Supplementary (Use Sparingly, Flag Clearly)
- Reputable personal blogs by domain experts (verify credentials)
- Stack Overflow / technical forums for specific technical questions
- YouTube channels by credentialed educators (3Blue1Brown, Crash Course, etc.)
- Company engineering blogs (Google, Netflix, Stripe, etc.) for applied technical content

### Do Not Use
- SEO-optimized content farms or listicle sites with no authorship
- Anonymous forums or social media threads as primary sources
- Sites with significant financial incentive to recommend specific products
- Unverifiable claims or sources that cannot be traced to a named author or institution

---

## Research Execution Process

### Step 1: Decompose the Topic
Before searching, break the topic into its component knowledge areas. For a topic like "Machine Learning," this might be:
- Mathematical foundations (linear algebra, calculus, probability)
- Core algorithms (regression, classification, clustering, neural networks)
- Practical implementation (Python, frameworks, data pipelines)
- Domain applications
- Evaluation and ethics

Generate a concept map of components before searching. This prevents blind spots.

### Step 2: Targeted Search Queries
Run multiple targeted searches rather than one broad one. Use specific, narrow queries:
- `[topic] fundamentals site:edu` for foundational academic framing
- `[topic] introduction syllabus` to find how experts structure learning the subject
- `[topic] key concepts overview` for concept enumeration
- `[specific subtopic] explained` for depth on individual components
- `[topic] common misconceptions` to anticipate where learners get stuck
- `[topic] prerequisite knowledge` to understand what the learner must already know

Target **8–15 high-quality sources** per curriculum. More is not better — depth and quality over quantity.

### Step 3: Evaluate Each Source Before Using
For every source, assess:
- **Authority**: Who wrote this? What are their credentials?
- **Accuracy**: Are claims verifiable? Is it internally consistent?
- **Currency**: When was it published or last updated? Is the information still valid?
- **Coverage**: Does it go deep enough, or is it surface-level?
- **Bias**: Does the source have a financial or ideological stake in a particular framing?

If a source fails two or more of these, discard it.

### Step 4: Synthesize, Don't Summarize
The goal is not to produce a list of summaries from each source. The goal is to produce a **unified knowledge base** that reflects the consensus of the best sources, notes where disagreement exists, and is organized by concept rather than by source.

**Bad output (summarize):**
> "Source A says machine learning is about pattern recognition. Source B describes it as a subset of AI."

**Good output (synthesize):**
> "Machine learning is consistently defined across sources as a method by which systems learn from data to improve performance on tasks without being explicitly programmed. Sources diverge on classification: some treat deep learning as a subset of ML (MIT OpenCourseWare), while others treat them as distinct branches (Goodfellow et al.). For curriculum purposes, we treat deep learning as a specialized subfield of ML."

### Step 5: Map Concept Dependencies
Produce a dependency graph (as a structured list) showing which concepts require prior understanding of other concepts. This is the single most important input for the Curriculum Builder.

```json
{
  "concept_dependencies": [
    {
      "concept": "Gradient Descent",
      "requires": ["Derivatives", "Cost Functions", "Matrix Operations"],
      "unlocks": ["Neural Network Training", "Backpropagation"]
    }
  ]
}
```

---

## Handling Difficult Research Situations

### Thin Source Coverage
If fewer than 3 Tier-1 sources exist for a topic or subtopic, flag it explicitly in the output. Do not fill gaps with Tier-3 sources and present them as authoritative. Instead, note: "Limited authoritative sourcing available on [subtopic] — curriculum should present this with appropriate epistemic humility."

### Contested or Rapidly Evolving Topics
For topics where expert consensus is unsettled (e.g., nutrition science, AI ethics, macroeconomics), do not present one position as fact. Note the debate structure explicitly and ensure the curriculum presents multiple perspectives with appropriate framing.

### Highly Technical Topics Beyond Model Knowledge
If the topic is highly specialized and web search returns limited structured content, note this clearly and recommend the curriculum builder rely more on structural scaffolding (how to learn it) than specific factual content (what is true), and suggest the learner supplement with a specific textbook.

---

## Output Format

Return a structured JSON object with the following shape:

```json
{
  "topic": "string",
  "research_summary": "2–4 paragraph synthesis of the topic's knowledge landscape",
  "concept_map": [
    {
      "concept": "string",
      "definition": "string",
      "importance": "foundational | core | advanced | supplementary",
      "dependencies": ["concept names"],
      "unlocks": ["concept names"]
    }
  ],
  "suggested_module_themes": [
    "High-level theme 1",
    "High-level theme 2"
  ],
  "common_misconceptions": [
    {
      "misconception": "string",
      "correction": "string"
    }
  ],
  "prerequisite_knowledge": ["list of concepts learner should have before starting"],
  "coverage_gaps": ["any areas where sourcing was thin — flag for curriculum builder"],
  "sources": [
    {
      "title": "string",
      "url": "string",
      "domain": "string",
      "tier": 1,
      "relevance_note": "What this source contributed to the research",
      "accessed_at": "ISO datetime"
    }
  ]
}
```

---

## Quality Checklist Before Returning Output

- [ ] At least 6 Tier-1 or Tier-2 sources used
- [ ] No unsupported factual claims
- [ ] Contested areas explicitly flagged
- [ ] Concept dependency map covers all major topics
- [ ] Common misconceptions section populated (minimum 2)
- [ ] Prerequisite knowledge clearly articulated
- [ ] Research summary is synthesized prose, not a list of source summaries
- [ ] All sources have title, URL, tier, and relevance note
