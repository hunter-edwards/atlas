import Anthropic from "@anthropic-ai/sdk";
import { slideGeneratorSystemPrompt } from "@/lib/prompts/slide-generator";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { lessonId, courseId } = await req.json();

  const supabase = createAdminClient();

  // Fetch lesson and context
  const [lessonRes, courseRes, moduleRes] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", lessonId).single(),
    supabase.from("courses").select("*").eq("id", courseId).single(),
    supabase
      .from("lessons")
      .select("*, modules(*)")
      .eq("id", lessonId)
      .single(),
  ]);

  const lesson = lessonRes.data;
  const course = courseRes.data;

  if (!lesson || !course) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const moduleContext =
    moduleRes.data && typeof moduleRes.data === "object" && "modules" in moduleRes.data
      ? (moduleRes.data as Record<string, unknown>).modules
      : null;

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: slideGeneratorSystemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate slides for this lesson:\n\nCourse: ${course.title}\nDifficulty: ${course.difficulty_level || "200-level"}\nModule: ${moduleContext && typeof moduleContext === "object" && "title" in moduleContext ? (moduleContext as { title: string }).title : "Unknown"}\nLesson: ${lesson.title}\n\nGenerate 8-12 slides following the lesson arc (Hook → Concept → Example → Application → Summary).`,
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
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      slides = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      slides = [];
    }

    // Save slides to database
    if (slides.length > 0) {
      await supabase.from("slides").insert(
        slides.map(
          (s: {
            title?: string;
            body: string;
            speakerNotes?: string;
            visualHint?: string;
            orderIndex: number;
          }) => ({
            lesson_id: lessonId,
            title: s.title || null,
            body: s.body,
            speaker_notes: s.speakerNotes || null,
            visual_hint: s.visualHint || null,
            order_index: s.orderIndex,
          })
        )
      );

      // Mark lesson as in progress
      await supabase
        .from("lessons")
        .update({ status: "in_progress" })
        .eq("id", lessonId);
    }

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
      { error: "Failed to generate slides" },
      { status: 500 }
    );
  }
}
