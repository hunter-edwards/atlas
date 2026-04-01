import Anthropic from "@anthropic-ai/sdk";
import { assessorSystemPrompt } from "@/lib/prompts/assessor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { topic, motivation } = await req.json();

  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: assessorSystemPrompt,
    messages: [
      {
        role: "user",
        content: `Generate a 5-question multiple-choice knowledge assessment for this topic: "${topic}"${motivation ? `\n\nThe learner's motivation: ${motivation}` : ""}`,
      },
    ],
  });

  const responseText =
    response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n") || "";

  // Parse the JSON from the response
  let questions;
  try {
    // Try direct parse first
    questions = JSON.parse(responseText);
  } catch {
    // Try extracting JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      questions = JSON.parse(jsonMatch[0]);
    } else {
      return Response.json(
        { error: "Failed to generate assessment questions" },
        { status: 500 }
      );
    }
  }

  return Response.json(questions);
}
