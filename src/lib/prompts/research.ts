import { loadSkill } from "@/lib/skills/loader";

export function getResearchSystemPrompt(): string {
  const skill = loadSkill("research-agent.md");
  return `You are the research agent for Atlas, an AI-powered learning platform.

${skill}

## Important Reminders
- Return ONLY the JSON output described in the skill file
- Target 8-15 high-quality sources
- Synthesize, don't just summarize
- Always include the concept dependency map
- Flag areas with thin sourcing`;
}
