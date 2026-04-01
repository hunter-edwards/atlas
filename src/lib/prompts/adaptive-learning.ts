import { loadSkill } from "@/lib/skills/loader";

export function getAdaptiveLearningSystemPrompt(): string {
  const skill = loadSkill("adaptive-learning.md");
  return `You are the adaptive learning agent for Atlas, an AI-powered learning platform.

${skill}

## Critical Output Rules
- Return ONLY valid JSON matching the output format in the skill file
- No markdown fences, no extra text — just the JSON object
- Base all recommendations on actual quiz data provided
- Be specific in remediation suggestions — reference actual concepts and lessons
- The output must be valid, parseable JSON`;
}
