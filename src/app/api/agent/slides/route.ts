import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getSlideGeneratorSystemPrompt } from "@/lib/prompts/slide-generator";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;

async function uploadImageToStorage(
  b64: string,
  lessonId: string,
  slideIndex: number
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey);
    const buffer = Buffer.from(b64, "base64");
    const filePath = `slides/${lessonId}/${slideIndex}-${Date.now()}.png`;

    const { error } = await supabase.storage
      .from("slide-images")
      .upload(filePath, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.error("Storage upload error:", error);
      // Fall back to data URL
      return `data:image/png;base64,${b64}`;
    }

    const { data: urlData } = supabase.storage
      .from("slide-images")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error("Storage upload failed:", err);
    // Fall back to data URL
    return `data:image/png;base64,${b64}`;
  }
}

async function generateImage(
  prompt: string,
  courseTitle: string,
  moduleTitle: string,
  lessonTitle: string,
  topicDescription: string,
  lessonId: string,
  slideIndex: number
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const openai = new OpenAI({ apiKey });
    const imagePrompt = `Educational illustration for a lesson on "${lessonTitle}" from the module "${moduleTitle}" in a course about ${topicDescription || courseTitle}.

Subject: ${prompt}

Style requirements:
- Horizontal landscape composition (wide format)
- Clean, professional academic illustration style
- Well-lit, clear subject matter with strong visual hierarchy
- Photorealistic or clean technical illustration depending on subject
- NO text, labels, captions, or words anywhere in the image
- All terminology is in the context of ${topicDescription || courseTitle} — interpret domain-specific words accordingly`;

    // Try with output_format first (gpt-image-1 in newer SDK versions)
    let b64: string | undefined;
    try {
      const result = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt,
        size: "1536x1024",
        quality: "medium",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Handle both response formats: b64_json (older) and b64 (newer SDK)
      const item = result.data?.[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      b64 = (item as any)?.b64_json || (item as any)?.b64 || undefined;

      // If neither b64 format, check if there's a URL we can fetch
      if (!b64 && item?.url) {
        const imgRes = await fetch(item.url);
        if (imgRes.ok) {
          const arrBuf = await imgRes.arrayBuffer();
          b64 = Buffer.from(arrBuf).toString("base64");
        }
      }
    } catch (innerErr) {
      console.error("Image generate call failed:", innerErr);
      return null;
    }

    if (b64) {
      return await uploadImageToStorage(b64, lessonId, slideIndex);
    }
    console.error("Image generation returned no image data");
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
      }, idx: number) => {
        const vType = s.visualType || s.visual_type || "none";
        const vHint = s.visualHint || s.visual_hint || "";
        if (hasOpenAI && vType === "illustration" && vHint) {
          console.log(`Generating image for slide ${idx}: "${vHint.slice(0, 80)}..."`);
          const img = await generateImage(vHint, courseTitle, moduleTitle, lessonTitle, topicDescription, lessonId, idx);
          console.log(`Slide ${idx} image result: ${img ? `${img.slice(0, 60)}...` : "null"}`);
          return img;
        }
        if (vType === "illustration" && !hasOpenAI) {
          console.warn("OPENAI_API_KEY not set — skipping image generation");
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
