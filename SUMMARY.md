# Atlas — Development Summary

## Architecture
- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL + Auth + RLS) with admin client for API routes
- **Anthropic Claude** (`claude-sonnet-4-20250514`) with prompt caching
- **OpenAI** (`gpt-image-1`, medium quality, 1536x1024) for slide illustrations
- **Mermaid.js** for client-side diagrams
- **SSE** for research/generation progress streaming

## Key Files
- `src/app/api/agent/` — 7 API routes: research, slides, quiz, adapt, feedback, summarize, assess
- `src/lib/skills/` — 12 `.md` skill files loaded at runtime via `loadSkill()`
- `src/lib/prompts/slide-generator.ts` — Loads slide-creation + slide-design skills, outputs JSON with layout templates + color archetypes
- `src/app/(app)/course/[courseId]/lesson/[lessonId]/page.tsx` — Slide renderer: 7 layout templates (A-G), 6 color archetypes, callout panels, Mermaid diagrams, AI images
- `src/lib/types/database.ts` — Supabase types; slides table has: layout_template, color_archetype, callout_text, callout_type, visual_type, image_url, diagram_code
- `src/app/api/agent/research/route.ts` — Combined curriculum+scheduling in single LLM call, capped web search to 5

## DB Columns (slides table)
`layout_template TEXT`, `color_archetype TEXT`, `callout_text TEXT`, `callout_type TEXT`, `visual_type TEXT DEFAULT 'none'`, `image_url TEXT`, `diagram_code TEXT`

## Token Optimization
- Cross-cutting skills (accessibility, engagement, prerequisite) condensed to inline rules (~200 bytes each)
- `cache_control: { type: "ephemeral" }` on all system prompts
- Research: 3 steps instead of 4, batched DB inserts

## Design System (slide-design.md)
- 7 templates: A (Title/Hook), B (Concept/Split), C (Full-Bleed Visual), D (Stat/Callout), E (Comparison), F (Step/Process), G (Code)
- 6 color archetypes: Scholar, Technician (light), Editorial, Architect, Naturalist, Obsidian
- Renderer auto-promotes diagram slides to Template C, normalizes inline • bullets to proper markdown lists
- Image generation includes full course/module/lesson context for domain accuracy
