import { loadSkill } from "@/lib/skills/loader";

export function getContentSummarizationSystemPrompt(): string {
  const skill = loadSkill("content-summarization.md");
  return `You are the content summarization agent for Atlas, an AI-powered learning platform.

${skill}

## Critical Output Rules
- Return ONLY valid JSON matching the output format in the skill file
- No markdown fences, no extra text — just the JSON object
- Match the appropriate summary type (lesson, module, or study guide) to the request
- Key terms must have clear, concise definitions
- Review questions should be answerable from the content covered
- The output must be valid, parseable JSON`;
}
