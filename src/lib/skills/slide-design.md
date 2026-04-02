# Skill: Slide Visual Design

## Purpose
Guide the AI agent generating slide layouts, typographic decisions, and visual hierarchy for lesson presentations. Content quality means nothing if the design makes it hard to read, impossible to scan, or visually fatiguing. This skill governs how slides **look and feel** — it works in tandem with the Slide Creation skill, which governs what slides **say**.

Every slide rendered in this platform is a designed artifact. Treat it as such.

---

## Design Philosophy

### Slides Are Not Documents
A document is read linearly, at the reader's pace, with the expectation of density. A slide is scanned first, read second. The design must survive the 2-second scan before the learner reads a single word. If the hierarchy isn't immediately obvious on the scan, the design has failed.

### One Visual Idea Per Slide
Just as the content skill mandates one concept per slide, this skill mandates one visual idea per slide. A slide with a diagram, a callout, a data table, and a quote is not a rich slide — it is four slides fighting for attention. Pick the strongest visual element and let it breathe.

### Restraint Is a Design Decision
White space is not empty space — it is breathing room that makes content feel confident. Crowded slides signal anxiety. Sparse slides signal authority. When in doubt, remove something.

### Hierarchy Must Be Legible at a Glance
A viewer should be able to tell within 2 seconds: what type of slide is this, what is the most important thing on it, and what is supporting context. If they have to work to find the headline, the hierarchy is broken.

---

## Typography System

The platform uses a fixed typographic scale. All slide-generating agents must reference this system. Never deviate from these roles — consistency across slides creates a cohesive course experience.

### Type Roles

| Role | Element | Usage |
|---|---|---|
| **Display** | Slide titles, section headers | The largest, most expressive text on the slide. Sets the tone. |
| **Headline** | Key concept callouts, pull quotes, stat figures | Large, high-contrast. Used sparingly to create emphasis anchors. |
| **Body** | Main content, bullet points, paragraphs | The workhorse. Must be highly readable at medium size. |
| **Caption** | Labels, diagram annotations, source attribution | Smallest type. Supporting, not primary. Never competes with body. |
| **Code** | Code blocks, technical strings, formulas | Monospace. Always distinct from prose. |

### Font Pairing Philosophy

Choose pairings that create clear contrast between display and body roles. Contrast comes from classification (serif vs sans-serif), weight (heavy vs light), or width (condensed vs regular). Never pair two fonts of the same classification and weight — they will compete.

**Pairing archetypes to use:**

| Display | Body | Character |
|---|---|---|
| Fraunces (Optical, variable) | DM Sans | Warm editorial, academic gravitas |
| Cabinet Grotesk (Bold) | Lora | Modern structure, readable warmth |
| Playfair Display | IBM Plex Sans | Classical intelligence, technical clarity |
| Syne (Bold) | Source Serif 4 | Geometric confidence, scholarly depth |
| Chivo Mono (Bold) | Chivo | Technical authority, unified family |
| Libre Baskerville | Libre Franklin | Pure editorial, newspaper-influenced |

**Absolute prohibitions:**
- Never use Inter, Roboto, Arial, Helvetica, or any system fallback as a primary font
- Never pair two sans-serif fonts unless they are from the same type family with clear weight contrast
- Never use more than 2 typefaces in a single slide deck
- Never use decorative display fonts for body copy — legibility above all

### Type Scale (Relative Units)

Use a modular scale with a ratio of 1.25 (Major Third) or 1.333 (Perfect Fourth). All sizes relative to a 16px base.

| Role | Size (Perfect Fourth scale) | Weight | Line Height |
|---|---|---|---|
| Display | 3.157rem (≈50px) | 700–800 | 1.1 |
| Headline | 2.369rem (≈38px) | 600–700 | 1.15 |
| Body Large | 1.333rem (≈21px) | 400 | 1.6 |
| Body | 1rem (16px) | 400 | 1.65 |
| Caption | 0.75rem (12px) | 400–500 | 1.5 |
| Code | 0.875rem (14px) | 400 | 1.7 |

### Typographic Rules

**Measure (line length):** Body text should never exceed 75 characters per line. Long lines destroy readability. Use column constraints to enforce this.

**Tracking (letter spacing):**
- Display and headline: slight negative tracking (−0.02em to −0.04em) — tightens large type
- All-caps labels and captions: positive tracking (+0.08em to +0.12em) — opens up small caps

**Leading (line height):** Larger type needs tighter leading. Smaller type needs looser leading. See table above.

**Widows and orphans:** Never allow a single word to sit alone on the last line of a paragraph. Rewrite or adjust column width.

**Emphasis:** Bold for key terms being defined. Italics for titles, foreign phrases, or gentle emphasis. Never underline (reserved for hyperlinks). Never use ALL CAPS for more than 4 words.

**Alignment:**
- Titles: Left-align always. Centered titles feel amateur.
- Body: Left-align always. Justified text creates rivers of white space.
- Captions: Align to the element they describe (left if diagram is left, etc.)
- Exception: Stat callouts and pull quotes may center if they are isolated design elements

---

## Color System

### The 60/30/10 Rule
Every slide uses color in three proportions:
- **60% Background** — The dominant neutral. Off-white, dark charcoal, warm gray. Never pure #000000 or pure #FFFFFF (too harsh).
- **30% Mid-tone** — Surface colors for cards, panels, containers. Slightly lighter or darker than background.
- **10% Accent** — The active color. Used for highlights, key terms, progress indicators, CTAs. This is where personality lives.

### Course Color Personality
The course should establish a consistent color personality during generation. Choose one archetype:

| Archetype | Background | Mid-tone | Accent | Mood |
|---|---|---|---|---|
| **Scholar** | #F5F0E8 (warm cream) | #EAE4D6 | #1A3A2A (forest) | Academic, trustworthy |
| **Technician** | #0F1117 (near-black) | #1C1F2E | #00E5FF (electric cyan) | Technical, precise |
| **Editorial** | #FAFAF8 (cool white) | #F0EFE9 | #C0392B (editorial red) | Clear, authoritative |
| **Architect** | #F2F0ED (concrete) | #E5E3DF | #2C4A6E (slate blue) | Structured, calm |
| **Naturalist** | #EEF2EE (sage white) | #DDE5DC | #3D5A3E (deep green) | Grounded, approachable |
| **Obsidian** | #141414 (deep black) | #1F1F1F | #E8C547 (gold) | Premium, serious |

### Color Usage Rules

**Text on backgrounds:**
- Minimum contrast ratio: 4.5:1 for body text (WCAG AA)
- Minimum contrast ratio: 3:1 for large display text
- Never use accent color for body text — it is for emphasis only
- Never place dark text on a dark background without a card/panel lift

**Accent usage:**
- Key terms being defined for the first time
- Inline highlights of critical information
- Progress indicators and UI chrome
- The "one thing to remember" callout on a summary slide
- Maximum 3 uses of accent color per slide — if everything is highlighted, nothing is

**Decorative color:**
- Subtle tints (5–10% opacity) of the accent color can be used as background panels for callouts
- Gradient use: radial gradients from accent-tint to transparent are acceptable for hero/hook slides; linear gradients are almost always wrong in educational contexts
- Never use color to decorate — only to communicate (structure, hierarchy, emphasis, or state)

---

## Visual Hierarchy Framework

Every slide has three layers. Design them in order, never simultaneously.

### Layer 1: Focal Point (The First Thing Eyes Land)
Every slide needs one clear focal point — the element the eye goes to first, before any conscious reading. This is usually the display title or a dominant visual (large number, hero diagram, bold callout).

**How to create a focal point:**
- Size: Make it substantially larger than everything else (at least 2 type scale steps above body)
- Weight: Bold or heavy weight creates mass that attracts the eye
- Position: Upper-left or center-top is the natural eye entry point on a Western reading slide
- Isolation: Surround the focal point with more white space than anything else on the slide
- Color: Use accent or high-contrast against the background — only at the focal point

### Layer 2: Supporting Structure (What Organizes the Rest)
After the focal point, the eye needs a path. Supporting structure guides reading order without demanding it.

**Structural tools:**
- **Typographic hierarchy**: Title → subhead → body → caption. Each level visually distinct.
- **Spatial grouping**: Related elements close together, unrelated elements separated. (Gestalt: proximity)
- **Alignment grid**: Everything aligns to an invisible grid. Misaligned elements create visual noise.
- **Dividers and rules**: Thin horizontal rules (1px, low-opacity) to separate sections without visual weight
- **Cards and panels**: Rounded-corner panels (8–12px radius) to group content. Use sparingly — every card adds visual weight.

### Layer 3: Detail (What Rewards Close Reading)
The fine details a learner discovers on their second pass. Small annotations, source attributions, subtle texture, micro-labels on diagrams. These should never compete with Layer 1 or 2.

---

## Slide Layout Templates

These are the canonical layouts for each slide type. The slide generation agent selects the appropriate template based on `slide_type` and populates it.

### TEMPLATE A: Title / Hook Slide
**Use for:** First slide of a lesson, module openers, major section transitions

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│   [ACCENT BAR — thin, left-aligned]         │
│                                             │
│   [DISPLAY TITLE — large, bold, 2–3 lines   │
│    max, left-aligned]                       │
│                                             │
│   [SUBTITLE or hook statement — body large, │
│    muted color, max 2 lines]                │
│                                             │
│                                             │
│   [MODULE/LESSON LABEL — caption, top-right │
│    or bottom-left, accent color]            │
└─────────────────────────────────────────────┘
```

Design rules:
- 70%+ of the slide is white space or background
- No more than 20 words total on this slide
- The accent bar (4px tall, 48px wide) signals the course's color personality
- Optional: subtle background texture or gradient on this slide type only

---

### TEMPLATE B: Concept Instruction Slide
**Use for:** Core content, definition slides, explanation slides

```
┌─────────────────────────────────────────────┐
│  [SLIDE TITLE — display, left-aligned]      │
│  ─────────────────────────────────────      │
│                                             │
│  [BODY CONTENT]          [VISUAL ZONE]      │
│  • Point one              ┌──────────┐      │
│  • Point two              │          │      │
│  • Point three            │ diagram  │      │
│                           │ or       │      │
│  [OPTIONAL CALLOUT        │ image    │      │
│   PANEL — accented]       └──────────┘      │
│                                             │
│  [CAPTION — bottom, source or annotation]   │
└─────────────────────────────────────────────┘
```

Design rules:
- Left column (55%): text content
- Right column (40%): visual zone or additional text if no visual
- Thin rule beneath title
- Max 6 bullet points OR one paragraph — never both
- Callout panel: accent-tinted background, used for the single most important fact

---

### TEMPLATE C: Full-Bleed Visual Slide
**Use for:** Diagrams, flowcharts, charts, any slide where the visual IS the content

```
┌─────────────────────────────────────────────┐
│  [SLIDE TITLE — display, left-aligned]      │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │                                     │    │
│  │         VISUAL — DOMINANT           │    │
│  │                                     │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [1–2 sentence caption below visual]        │
└─────────────────────────────────────────────┘
```

Design rules:
- Visual takes 65–75% of the slide area
- Title is brief (5 words max) — it frames the visual, doesn't explain it
- Caption does the explaining, in 1–2 sentences max
- No bullet points on this template

---

### TEMPLATE D: Stat / Callout Slide
**Use for:** Key facts, surprising numbers, powerful quotes, memorable moments

```
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
│         [LARGE STAT OR SHORT QUOTE]         │
│         [Headline size, centered,           │
│          accent color or high contrast]     │
│                                             │
│         [2–3 line context statement         │
│          below the stat — body size,        │
│          muted, centered]                   │
│                                             │
│                                             │
│  [Source — caption, bottom right]           │
└─────────────────────────────────────────────┘
```

Design rules:
- Stat or quote is the ONLY focal point — everything else is secondary
- Use for moments that should stop the learner and land before moving on
- Maximum 2 text elements: the stat/quote + the context statement
- Works best as a transition between heavy content slides

---

### TEMPLATE E: Comparison / Two-Column Slide
**Use for:** Before/after, pros/cons, A vs B, misconception vs correction

```
┌─────────────────────────────────────────────┐
│  [SLIDE TITLE — display, left-aligned]      │
│  ─────────────────────────────────────      │
│                                             │
│  [COLUMN A LABEL]      [COLUMN B LABEL]     │
│  ┌──────────────┐      ┌──────────────┐     │
│  │              │      │              │     │
│  │  Content A   │      │  Content B   │     │
│  │              │      │              │     │
│  │  • point     │      │  • point     │     │
│  │  • point     │      │  • point     │     │
│  │              │      │              │     │
│  └──────────────┘      └──────────────┘     │
│                                             │
│  [Optional synthesis statement — italic]    │
└─────────────────────────────────────────────┘
```

Design rules:
- Columns must be equal width and vertically aligned
- Column labels use accent color to differentiate (or one neutral + one accent)
- Content inside columns must be parallel — same number of points, same level of detail
- Use this template for misconceptions slides: ❌ left column, ✅ right column

---

### TEMPLATE F: Step / Process Slide
**Use for:** Sequential processes, workflows, numbered instructions

```
┌─────────────────────────────────────────────┐
│  [SLIDE TITLE — display, left-aligned]      │
│  ─────────────────────────────────────      │
│                                             │
│  ①  [STEP ONE]                              │
│     Brief description of this step          │
│                                             │
│  ②  [STEP TWO]                              │
│     Brief description of this step          │
│                                             │
│  ③  [STEP THREE]                            │
│     Brief description of this step          │
│                                             │
│  ④  [STEP FOUR]                             │
│     Brief description of this step          │
│                                             │
└─────────────────────────────────────────────┘
```

Design rules:
- Step numbers in accent color, large enough to scan (headline weight)
- Step title bold, step description body weight — clear parent/child relationship
- Maximum 5 steps per slide. More than 5: split into two slides.
- Optional: a thin vertical rule connecting the step numbers (visual throughline)

---

### TEMPLATE G: Code Slide
**Use for:** Any slide featuring code, terminal output, or formulas

```
┌─────────────────────────────────────────────┐
│  [SLIDE TITLE — display, left-aligned]      │
│  ─────────────────────────────────────      │
│                                             │
│  [1–2 sentence setup — body]                │
│                                             │
│  ┌─── [language label] ──────────────────┐  │
│  │                                       │  │
│  │  [CODE BLOCK — monospace, syntax      │  │
│  │   highlighted, dark background        │  │
│  │   panel regardless of slide theme]    │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [Key observation callout — accent panel]   │
└─────────────────────────────────────────────┘
```

Design rules:
- Code block always uses a dark background panel (near-black) with light text — even on light-theme slides. This provides strong figure/ground contrast and signals "this is code."
- Syntax highlighting: use a muted palette (no neon). Soft green for strings, soft blue for keywords, gray for comments.
- Language label in the top-left corner of the code panel, in caption size
- Callout panel below code: highlights the 1 line or concept to pay attention to
- Never paste more code than fits readable at the slide's font size — split if needed

---

## Whitespace Rules

Whitespace is the most powerful design tool on a slide. These rules are non-negotiable.

**Margins:** Minimum 48px from slide edge to any content element. Preferably 64px.

**Between elements:**
- Title to first content element: 32–48px
- Between bullet points: 12–16px (tight but not cramped)
- Between sections or content groups: 32–40px
- Between slide title and horizontal rule: 8px
- Between rule and content: 24px

**The isolation rule:** The single most important element on any slide should have more whitespace around it than any other element. Isolation creates emphasis more reliably than color or size alone.

**When to add a slide instead of adding content:** If adding more content requires reducing margins below 48px, removing whitespace between elements, or shrinking body type below 15px — stop. That content belongs on the next slide.

---

## Slide Output: Design Metadata

The slide generation agent should include a `design` block in the JSON output for each slide, enabling the frontend renderer to apply the correct template and styling:

```json
{
  "id": "slide_3",
  "order_index": 3,
  "slide_type": "instruction",
  "layout_template": "B",
  "title": "Why Indexes Dramatically Speed Up Queries",
  "body": "Markdown content...",
  "visual_hint": "Diagram comparing full table scan vs. index lookup — two paths through data, one long, one short",
  "has_visual": true,
  "has_code": false,
  "callout": {
    "text": "An index trades write speed for read speed — always a deliberate tradeoff.",
    "type": "key_insight"
  },
  "speaker_notes": "...",
  "design": {
    "layout_template": "B",
    "color_archetype": "Scholar",
    "focal_element": "title",
    "has_callout_panel": true,
    "callout_type": "key_insight | warning | definition | example | tip"
  }
}
```

### Callout Panel Types

| Type | Visual Treatment | Usage |
|---|---|---|
| `key_insight` | Accent background, bold label "Key Insight" | The single most important takeaway from a slide |
| `definition` | Neutral panel, italic label "Definition" | Formal definition of a key term |
| `warning` | Amber/orange tint, label "Watch Out" | Common mistake or gotcha |
| `example` | Light tint, label "Example" | A quick concrete example inline |
| `tip` | Subtle tint, label "Pro Tip" | Optional best practice or shortcut |

---

## Anti-Patterns (Never Do These)

**Typography violations:**
- ❌ More than 2 typefaces in a slide deck
- ❌ Body text smaller than 15px
- ❌ All-caps for more than 4 words
- ❌ Centered body text (only acceptable for 1–2 word callouts)
- ❌ Text over a busy background image without an overlay for contrast
- ❌ Light gray text on white backgrounds (fails contrast minimums)

**Layout violations:**
- ❌ More than 6 bullet points on any slide
- ❌ Bullet points AND a paragraph on the same slide
- ❌ Two competing focal points (two large/bold elements of equal weight)
- ❌ Content touching the slide margins
- ❌ Three or more columns (too complex, too small)
- ❌ Drop shadows on text (use them on panels/cards only, if at all)

**Color violations:**
- ❌ More than 3 colors on a single slide (background, text, accent)
- ❌ Accent color used more than 3 times per slide
- ❌ Pure black (#000000) or pure white (#FFFFFF) as primary backgrounds
- ❌ Red text that isn't signaling an error or negative result
- ❌ Background colors that shift between slides (the background is constant)
- ❌ Purple gradients. Ever.

**Content violations:**
- ❌ Slide with no clear focal point
- ❌ Slide where the title is longer than 10 words
- ❌ Slide with more than 3 distinct content zones competing for attention
- ❌ Decorative images that don't teach anything (stock photo syndrome)

---

## Quality Checklist

- [ ] Every slide uses one of the defined layout templates
- [ ] Visual hierarchy is legible in 2 seconds (focal point obvious on scan)
- [ ] Title is concept-forward, ≤10 words, left-aligned
- [ ] Body text ≥15px, left-aligned, max 75 chars/line
- [ ] Font pairing uses one of the approved pairings (or an equivalent contrast pair)
- [ ] 60/30/10 color rule respected
- [ ] Accent color used ≤3 times per slide
- [ ] Minimum 48px margins on all sides
- [ ] Whitespace between sections ≥32px
- [ ] No more than one callout panel per slide
- [ ] Code blocks always use dark panel regardless of slide theme
- [ ] `design` metadata block included in JSON output
- [ ] No anti-patterns present
