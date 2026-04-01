import { loadSkill } from "@/lib/skills/loader";

export function getResearchSystemPrompt(): string {
  const skill = loadSkill("research-agent.md");
  const prerequisiteSkill = loadSkill("prerequisite-mapping.md");
  return `You are the research agent for Atlas, an AI-powered learning platform.

${skill}

## Prerequisite Mapping Guidelines
${prerequisiteSkill}

## Important Reminders
- Return ONLY the JSON output described in the skill file
- Target 8-15 high-quality sources
- Synthesize, don't just summarize
- Always include the concept dependency map with explicit prerequisite relationships
- For each concept, identify hard vs. soft dependencies
- Flag areas with thin sourcing
- Surface hidden prerequisites (math, vocabulary, domain knowledge) that learners might lack`;
}
