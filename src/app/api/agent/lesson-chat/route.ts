import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { courseId, lessonId, message, history, currentSlide } =
    await req.json();

  const supabase = createAdminClient();

  // Fetch full context: course, module, lesson, all slides
  const [courseRes, lessonRes, slidesRes] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).single(),
    supabase.from("lessons").select("*").eq("id", lessonId).single(),
    supabase
      .from("slides")
      .select("title, body, speaker_notes, order_index")
      .eq("lesson_id", lessonId)
      .order("order_index"),
  ]);

  const course = courseRes.data;
  const lesson = lessonRes.data;
  const slides = slidesRes.data || [];

  if (!course || !lesson) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch module context
  const { data: mod } = await supabase
    .from("modules")
    .select("*")
    .eq("id", lesson.module_id)
    .single();

  // Build context from all slides as lesson content
  const slideContent = slides
    .map(
      (s, i) =>
        `### Slide ${i + 1}: ${s.title || "Untitled"}\n${s.body}\n${s.speaker_notes ? `\nSpeaker notes: ${s.speaker_notes}` : ""}`
    )
    .join("\n\n");

  const systemPrompt = `You are a helpful AI tutor assisting a student during a lesson in the Atlas learning platform.

## Context
Course: ${course.title}
Topic: ${course.topic_description}
Difficulty: ${course.difficulty_level || "200-level"}
Module: ${mod?.title || "Unknown"}
Module description: ${mod?.description || "N/A"}
Lesson: ${lesson.title}

## Current Slide Content
The student is currently viewing:
${currentSlide ? `**Slide: ${currentSlide.title || "Untitled"}**\n${currentSlide.body}` : "N/A"}

## Full Lesson Content (all slides)
${slideContent}

## Your Role
- Answer questions about the current lesson content clearly and concisely
- Relate answers back to the specific slide content when relevant
- Use examples appropriate to the course difficulty level
- If a question is outside the scope of the lesson, briefly note that and still try to help
- Keep responses focused and educational — typically 2-4 paragraphs
- Use markdown formatting for clarity (bold for key terms, lists for steps, code blocks for code)
- Never invent facts — if you're unsure, say so`;

  const client = new Anthropic();

  const messages: Anthropic.MessageParam[] = [
    ...(history || []).map(
      (m: { role: "user" | "assistant"; content: string }) => ({
        role: m.role,
        content: m.content,
      })
    ),
    { role: "user", content: message },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const responseText =
    response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n") || "";

  return Response.json({ response: responseText });
}
