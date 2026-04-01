import Anthropic from "@anthropic-ai/sdk";
import { assessorSystemPrompt } from "@/lib/prompts/assessor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { topic, motivation, conversationHistory } = await req.json();

  const client = new Anthropic();

  const messages = [
    ...(conversationHistory || []).map(
      (msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })
    ),
  ];

  // If no history, add the initial user context
  if (messages.length === 0) {
    messages.push({
      role: "user" as const,
      content: `I want to learn about: ${topic}${motivation ? `\n\nMy motivation: ${motivation}` : ""}\n\nPlease begin the assessment.`,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: assessorSystemPrompt,
          messages,
          stream: true,
        });

        let fullText = "";

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullText += text;

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", data: text })}\n\n`
              )
            );
          }
        }

        // Check if the response contains a summary
        const summaryMatch = fullText.match(
          /ASSESSMENT_COMPLETE:\s*```json\s*([\s\S]*?)```/
        );
        if (summaryMatch) {
          try {
            const summaryData = JSON.parse(summaryMatch[1]);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "summary", data: summaryData.data || summaryData })}\n\n`
              )
            );
          } catch {
            // Summary parsing failed, continue
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", data: String(error) })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
