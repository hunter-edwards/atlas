import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getSlideGeneratorSystemPrompt } from "@/lib/prompts/slide-generator";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

async function generateImage(
  prompt: string,
  courseTitle: string,
  moduleTitle: string,
  lessonTitle: string,
  topicDescription: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const openai = new OpenAI({ apiKey });
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: `Educational illustration for a lesson on "${lessonTitle}" from the module "${moduleTitle}" in a course about ${topicDescription || courseTitle}.

Subject: ${prompt}

Style requirements:
- Horizontal landscape composition (wide format)
- Clean, professional academic illustration style
- Well-lit, clear subject matter with strong visual hierarchy
- Photorealistic or clean technical illustration depending on subject
- NO text, labels, captions, or words anywhere in the image
- All terminology is in the context of ${topicDescription || courseTitle} — interpret domain-specific words accordingly`,
      size: "1536x1024",
      quality: "medium",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (b64) {
      return `data:image/png;base64,${b64}`;
    }
    return null;
  } catch (err) {
    console.error("Image generation failed:", err);
    return null;
  }
}

export async function POST(req: Request) {
  const { lessonId, courseId } = await req.json();

  const supabase = createAdminClient();

  // Fetch lesson, course, and module separately
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

  // Individual context fields passed to image generation to prevent domain ambiguity
  // (e.g. "flute" in corrugated packaging must not render as a musical instrument)
  const courseTitle = course?.title || "Unknown Course";
  const moduleTitle = module?.title || "Unknown Module";
  const lessonTitle = lesson.title;
  const topicDescription = course?.topic_description || "";

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: getSlideGeneratorSystemPrompt(),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Generate slides for this lesson:

Course: ${course?.title || "Unknown Course"}
Topic: ${course?.topic_description || "N/A"}
Difficulty: ${course?.difficulty_level || "200-level"}
Module: ${module?.title || "Unknown Module"}
Module description: ${module?.description || "N/A"}
Lesson: ${lesson.title}

Generate exactly 8 slides following the lesson arc from the skill file.

IMPORTANT:
- Return ONLY a valid JSON array, no markdown fences, no extra text
- For "illustration" slides, the visualHint MUST include the specific subject context so the image generator knows the domain (e.g. "corrugated packaging flute profiles" not just "flute")
- Only use "illustration" when a diagram genuinely cannot capture what needs to be shown (physical objects, real-world scenes, materials, equipment)
- Use "diagram" for processes, relationships, hierarchies, timelines
- Use "none" for hooks, overviews, summaries, misconception slides
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
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      slides = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error("Slide JSON truncated, attempting repair...");
      try {
        const arrStart = responseText.indexOf("[");
        if (arrStart !== -1) {
          let text = responseText.slice(arrStart);
          const lastCompleteObj = text.lastIndexOf("}");
          if (lastCompleteObj !== -1) {
            text = text.slice(0, lastCompleteObj + 1) + "]";
            slides = JSON.parse(text);
            console.log(
              `Repaired truncated JSON: recovered ${slides.length} slides`
            );
          }
        }
      } catch (repairErr) {
        console.error("JSON repair also failed:", repairErr);
        slides = [];
      }
      if (!slides) slides = [];
    }

    if (slides.length === 0) {
      console.error(
        "No slides generated. Response:",
        responseText.slice(0, 500)
      );
      return Response.json(
        { error: "Failed to generate slides", slides: [] },
        { status: 500 }
      );
    }

    // Generate images for illustration slides in parallel
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const imagePromises = slides.map(
      async (s: {
        visualType?: string;
        visual_type?: string;
        visualHint?: string;
        visual_hint?: string;
      }) => {
        const vType = s.visualType || s.visual_type || "none";
        const vHint = s.visualHint || s.visual_hint || "";
        if (hasOpenAI && vType === "illustration" && vHint) {
          return generateImage(vHint, courseTitle, moduleTitle, lessonTitle, topicDescription);
        }
        return null;
      }
    );

    const imageResults = await Promise.all(imagePromises);

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
            visualType?: string;
            visual_type?: string;
            diagramCode?: string;
            diagram_code?: string;
            orderIndex?: number;
            order_index?: number;
            layoutTemplate?: string;
            layout_template?: string;
            colorArchetype?: string;
            color_archetype?: string;
            callout?: { text?: string; type?: string } | null;
          },
          i: number
        ) => ({
          lesson_id: lessonId,
          title: s.title || null,
          body: s.body,
          speaker_notes: s.speakerNotes || s.speaker_notes || null,
          visual_hint: s.visualHint || s.visual_hint || null,
          visual_type: s.visualType || s.visual_type || "none",
          image_url: imageResults[i] || null,
          diagram_code: s.diagramCode || s.diagram_code || null,
          order_index: s.orderIndex ?? s.order_index ?? i,
          layout_template: s.layoutTemplate || s.layout_template || "B",
          color_archetype: s.colorArchetype || s.color_archetype || "Scholar",
          callout_text: s.callout?.text || null,
          callout_type: s.callout?.type || null,
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
      {
        error: `Failed to generate slides: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
