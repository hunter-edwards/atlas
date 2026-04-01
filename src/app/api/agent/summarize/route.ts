import Anthropic from "@anthropic-ai/sdk";
import { getContentSummarizationSystemPrompt } from "@/lib/prompts/content-summarization";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { type, courseId, moduleId, lessonId } = await req.json();

  const supabase = createAdminClient();

  // Fetch course context
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  let contentToSummarize = "";
  let summaryType = type || "lesson_summary";

  if (summaryType === "study_guide") {
    // Full course study guide — fetch everything
    const [modulesRes, lessonsRes] = await Promise.all([
      supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index"),
      supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index"),
    ]);

    const modules = modulesRes.data || [];
    const lessons = lessonsRes.data || [];

    // For each module, gather its slides content
    const moduleData = [];
    for (const mod of modules) {
      const modLessons = lessons.filter((l) => l.module_id === mod.id);
      const lessonData = [];

      for (const lesson of modLessons) {
        const { data: slides } = await supabase
          .from("slides")
          .select("title, body")
          .eq("lesson_id", lesson.id)
          .order("order_index");

        lessonData.push({
          title: lesson.title,
          slides: slides?.map((s) => `${s.title ? `### ${s.title}\n` : ""}${s.body}`).join("\n\n") || "No slides generated yet",
        });
      }

      moduleData.push({
        title: mod.title,
        description: mod.description,
        lessons: lessonData,
      });
    }

    contentToSummarize = `Course: ${course.title}
Difficulty: ${course.difficulty_level || "200-level"}
Topic: ${course.topic_description}

${moduleData
  .map(
    (m, i) =>
      `## Module ${i + 1}: ${m.title}
${m.description || ""}

${m.lessons
  .map(
    (l) =>
      `### ${l.title}
${l.slides}`
  )
  .join("\n\n")}`
  )
  .join("\n\n")}`;
  } else if (summaryType === "module_summary" && moduleId) {
    // Module summary
    const { data: mod } = await supabase
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .single();

    if (!mod) {
      return Response.json({ error: "Module not found" }, { status: 404 });
    }

    const { data: lessons } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("order_index");

    const lessonData = [];
    for (const lesson of lessons || []) {
      const { data: slides } = await supabase
        .from("slides")
        .select("title, body")
        .eq("lesson_id", lesson.id)
        .order("order_index");

      lessonData.push({
        title: lesson.title,
        content: slides?.map((s) => `${s.title ? `### ${s.title}\n` : ""}${s.body}`).join("\n\n") || "No slides yet",
      });
    }

    contentToSummarize = `Course: ${course.title}
Difficulty: ${course.difficulty_level || "200-level"}
Module: ${mod.title}
Description: ${mod.description || "N/A"}

${lessonData
  .map(
    (l) =>
      `### ${l.title}
${l.content}`
  )
  .join("\n\n")}`;
  } else if (summaryType === "lesson_summary" && lessonId) {
    // Lesson summary
    const { data: lesson } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single();

    if (!lesson) {
      return Response.json({ error: "Lesson not found" }, { status: 404 });
    }

    const { data: slides } = await supabase
      .from("slides")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("order_index");

    contentToSummarize = `Course: ${course.title}
Difficulty: ${course.difficulty_level || "200-level"}
Lesson: ${lesson.title}

Slide content:
${
  slides
    ?.map(
      (s) =>
        `${s.title ? `### ${s.title}\n` : ""}${s.body}${s.speaker_notes ? `\n(Notes: ${s.speaker_notes})` : ""}`
    )
    .join("\n\n") || "No slides available"
}`;
  } else {
    return Response.json(
      { error: "Invalid request. Provide type and appropriate IDs." },
      { status: 400 }
    );
  }

  const client = new Anthropic();

  const aiResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: getContentSummarizationSystemPrompt(),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Generate a ${summaryType.replace("_", " ")} for the following content.

${contentToSummarize}

Return the JSON matching the "${summaryType}" format from your skill file.`,
      },
    ],
  });

  const responseText =
    aiResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n") || "";

  let summary;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    summary = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    summary = null;
  }

  if (!summary) {
    return Response.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }

  return Response.json({ summary });
}
