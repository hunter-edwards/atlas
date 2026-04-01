import Anthropic from "@anthropic-ai/sdk";
import { getSlideGeneratorSystemPrompt } from "@/lib/prompts/slide-generator";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { lessonId, courseId } = await req.json();

  const supabase = createAdminClient();

  // Fetch lesson, course, and module separately (avoids join issues)
  const { data: lesson, error: lessonErr } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();

  if (lessonErr || !lesson) {
    console.error("Lesson fetch error:", lessonErr);
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  const { data: module } = await supabase
    .from("modules")
    .select("*")
    .eq("id", lesson.module_id)
    .single();

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: getSlideGeneratorSystemPrompt(),
      messages: [
        {
          role: "user",
          content: `Generate slides for this lesson:

Course: ${course?.title || "Unknown Course"}
Difficulty: ${course?.difficulty_level || "200-level"}
Module: ${module?.title || "Unknown Module"}
Module description: ${module?.description || "N/A"}
Lesson: ${lesson.title}

Generate exactly 8 slides following the lesson arc (Hook → Concept → Example → Application → Summary).

IMPORTANT:
- Return ONLY a valid JSON array, no markdown fences, no extra text
- Keep each slide body to 3-5 bullet points (not full paragraphs)
- Keep speakerNotes to 2-3 sentences max
- Keep visualHint to 1 sentence
- This must be valid, complete JSON that can be parsed`,
        },
      ],
    });

    const responseText =
      response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n") || "";

    let slides;
    try {
      // Try to find a complete JSON array in the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      slides = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      // JSON might be truncated — try to salvage what we can
      console.error("Slide JSON truncated, attempting repair...");
      try {
        // Find the start of the array
        const arrStart = responseText.indexOf("[");
        if (arrStart !== -1) {
          let text = responseText.slice(arrStart);
          // Find the last complete object (ends with })
          const lastCompleteObj = text.lastIndexOf("}");
          if (lastCompleteObj !== -1) {
            text = text.slice(0, lastCompleteObj + 1) + "]";
            slides = JSON.parse(text);
            console.log(`Repaired truncated JSON: recovered ${slides.length} slides`);
          }
        }
      } catch (repairErr) {
        console.error("JSON repair also failed:", repairErr);
        slides = [];
      }
      if (!slides) slides = [];
    }

    if (slides.length === 0) {
      console.error("No slides generated. Response:", responseText.slice(0, 500));
      return Response.json(
        { error: "Failed to generate slides", slides: [] },
        { status: 500 }
      );
    }

    // Save slides to database
    const { error: insertErr } = await supabase.from("slides").insert(
      slides.map(
        (
          s: {
            title?: string;
            body: string;
            speakerNotes?: string;
            speaker_notes?: string;
            visualHint?: string;
            visual_hint?: string;
            orderIndex?: number;
            order_index?: number;
          },
          i: number
        ) => ({
          lesson_id: lessonId,
          title: s.title || null,
          body: s.body,
          speaker_notes: s.speakerNotes || s.speaker_notes || null,
          visual_hint: s.visualHint || s.visual_hint || null,
          order_index: s.orderIndex ?? s.order_index ?? i,
        })
      )
    );

    if (insertErr) {
      console.error("Slide insert error:", insertErr);
      return Response.json(
        { error: "Failed to save slides" },
        { status: 500 }
      );
    }

    // Mark lesson as in progress
    await supabase
      .from("lessons")
      .update({ status: "in_progress" })
      .eq("id", lessonId);

    // Fetch saved slides to return with proper IDs
    const { data: savedSlides } = await supabase
      .from("slides")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index");

    return Response.json({ slides: savedSlides || [] });
  } catch (error) {
    console.error("Slide generation error:", error);
    return Response.json(
      { error: `Failed to generate slides: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
