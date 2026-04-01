import Anthropic from "@anthropic-ai/sdk";
import { researchSystemPrompt } from "@/lib/prompts/research";
import { curriculumBuilderSystemPrompt } from "@/lib/prompts/curriculum-builder";
import { schedulerSystemPrompt } from "@/lib/prompts/scheduler";
import { createClient } from "@/lib/supabase/server";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const {
    topic,
    motivation,
    assessmentSummary,
    difficulty,
    weeklyHours,
    sessionsPerWeek,
    startDate,
  } = await req.json();

  const client = new Anthropic();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Research
    const researchResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: researchSystemPrompt,
      tools: [
        {
          type: "web_search_20250305" as unknown as "computer_20250124",
          name: "web_search",
        } as unknown as Anthropic.Tool,
      ],
      messages: [
        {
          role: "user",
          content: `Research this topic for curriculum design: "${topic}"${motivation ? `\nLearner motivation: ${motivation}` : ""}\nTarget difficulty: ${difficulty}\nAssessment summary: ${JSON.stringify(assessmentSummary)}`,
        },
      ],
    });

    const researchText =
      researchResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n") || "";

    // Parse research JSON from response
    let researchData;
    try {
      const jsonMatch = researchText.match(/\{[\s\S]*\}/);
      researchData = jsonMatch ? JSON.parse(jsonMatch[0]) : { researchSummary: researchText, sources: [] };
    } catch {
      researchData = { researchSummary: researchText, sources: [] };
    }

    // Load curriculum skill file
    let skillContent = "";
    try {
      skillContent = readFileSync(
        join(process.cwd(), "src/lib/skills/curriculum-skill.md"),
        "utf-8"
      );
    } catch {
      // skill file not found, continue without it
    }

    // Step 2: Build curriculum
    const curriculumResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: curriculumBuilderSystemPrompt,
      messages: [
        {
          role: "user",
          content: `## Curriculum Skill Reference\n${skillContent}\n\n## Research\n${researchData.researchSummary}\n\n## Assessment\n${JSON.stringify(assessmentSummary)}\n\n## Configuration\nDifficulty: ${difficulty}\nHours/week: ${weeklyHours}\nSessions/week: ${sessionsPerWeek}\nTopic: ${topic}${motivation ? `\nMotivation: ${motivation}` : ""}\n\nGenerate the curriculum JSON.`,
        },
      ],
    });

    const curriculumText =
      curriculumResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n") || "";

    let curriculum;
    try {
      const jsonMatch = curriculumText.match(/\{[\s\S]*\}/);
      curriculum = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      curriculum = null;
    }

    if (!curriculum) {
      return Response.json(
        { error: "Failed to generate curriculum" },
        { status: 500 }
      );
    }

    // Step 3: Schedule
    const scheduleResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: schedulerSystemPrompt,
      messages: [
        {
          role: "user",
          content: `Schedule this curriculum:\n${JSON.stringify(curriculum)}\n\nStart date: ${startDate}\nSessions per week: ${sessionsPerWeek}\nHours per week: ${weeklyHours}`,
        },
      ],
    });

    const scheduleText =
      scheduleResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n") || "";

    let schedule;
    try {
      const jsonMatch = scheduleText.match(/\{[\s\S]*\}/);
      schedule = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      schedule = null;
    }

    // Step 4: Save to database
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .insert({
        user_id: user.id,
        title: curriculum.title || topic,
        topic_description: topic,
        difficulty_level: difficulty,
        college_equivalent: curriculum.collegeEquivalent || null,
        estimated_total_hours: curriculum.estimatedTotalHours || null,
        weekly_hours_available: weeklyHours,
        sessions_per_week: sessionsPerWeek,
        start_date: startDate,
        end_date: schedule?.endDate || null,
        status: "active",
      })
      .select()
      .single();

    if (courseError || !course) {
      return Response.json(
        { error: "Failed to create course" },
        { status: 500 }
      );
    }

    // Save sources
    if (researchData.sources && researchData.sources.length > 0) {
      await supabase.from("sources").insert(
        researchData.sources.map(
          (s: { url?: string; title?: string; domain?: string; relevanceNote?: string }) => ({
            course_id: course.id,
            url: s.url || null,
            title: s.title || null,
            domain: s.domain || null,
            relevance_note: s.relevanceNote || null,
          })
        )
      );
    }

    // Save modules, lessons, quizzes
    for (let mi = 0; mi < (curriculum.modules || []).length; mi++) {
      const mod = curriculum.modules[mi];
      const { data: moduleData } = await supabase
        .from("modules")
        .insert({
          course_id: course.id,
          title: mod.title,
          description: mod.description || null,
          order_index: mi,
        })
        .select()
        .single();

      if (!moduleData) continue;

      // Save lessons
      for (let li = 0; li < (mod.lessons || []).length; li++) {
        const lesson = mod.lessons[li];
        const scheduledDate =
          schedule?.schedule?.find(
            (s: { type: string; moduleIndex: number; lessonIndex: number }) =>
              s.type === "lesson" && s.moduleIndex === mi && s.lessonIndex === li
          )?.date || null;

        await supabase.from("lessons").insert({
          module_id: moduleData.id,
          course_id: course.id,
          title: lesson.title,
          estimated_duration_minutes: lesson.estimatedDurationMinutes || 45,
          scheduled_date: scheduledDate,
          order_index: li,
          status: "pending",
        });
      }

      // Save module quiz
      if (mod.quiz) {
        const quizDate =
          schedule?.schedule?.find(
            (s: { type: string; quizType?: string; moduleIndex: number }) =>
              s.type === "quiz" &&
              s.quizType === "module_exam" &&
              s.moduleIndex === mi
          )?.date || null;

        await supabase.from("quizzes").insert({
          course_id: course.id,
          module_id: moduleData.id,
          title: mod.quiz.title || `Module ${mi + 1} Exam`,
          quiz_type: "module_exam",
          scheduled_date: quizDate,
        });
      }
    }

    // Save final exam if specified
    if (curriculum.finalExam) {
      const finalDate =
        schedule?.schedule?.find(
          (s: { type: string; quizType?: string }) => s.type === "quiz" && s.quizType === "final_exam"
        )?.date || null;

      await supabase.from("quizzes").insert({
        course_id: course.id,
        title: "Final Exam",
        quiz_type: "final_exam",
        scheduled_date: finalDate,
      });
    }

    return Response.json({ courseId: course.id });
  } catch (error) {
    console.error("Research/curriculum generation error:", error);
    return Response.json(
      { error: "Failed to generate curriculum" },
      { status: 500 }
    );
  }
}
