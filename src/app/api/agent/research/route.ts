import Anthropic from "@anthropic-ai/sdk";
import { researchSystemPrompt } from "@/lib/prompts/research";
import { curriculumBuilderSystemPrompt } from "@/lib/prompts/curriculum-builder";
import { schedulerSystemPrompt } from "@/lib/prompts/scheduler";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Use regular client for auth check, admin client for DB writes (bypasses RLS)
  const authClient = await createClient();
  const supabase = createAdminClient();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(type: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
        );
      }

      try {
        // === STEP 1: Research ===
        send("step", {
          step: 1,
          total: 4,
          label: "Researching your topic",
          detail: `Searching for authoritative sources on "${topic}"...`,
        });

        let researchData: {
          researchSummary: string;
          sources: {
            url?: string;
            title?: string;
            domain?: string;
            relevanceNote?: string;
          }[];
        };

        try {
          const researchResponse = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            system: researchSystemPrompt,
            tools: [
              {
                type: "web_search_20250305",
                name: "web_search",
              },
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

          try {
            const jsonMatch = researchText.match(/\{[\s\S]*\}/);
            researchData = jsonMatch
              ? JSON.parse(jsonMatch[0])
              : { researchSummary: researchText, sources: [] };
          } catch {
            researchData = { researchSummary: researchText, sources: [] };
          }
        } catch (err) {
          // If web search fails, fall back to model knowledge only
          console.error("Web search failed, falling back:", err);
          send("step", {
            step: 1,
            total: 4,
            label: "Researching your topic",
            detail: "Web search unavailable, using AI knowledge...",
          });

          const fallbackResponse = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            system: researchSystemPrompt,
            messages: [
              {
                role: "user",
                content: `Research this topic for curriculum design using your knowledge (web search is not available): "${topic}"${motivation ? `\nLearner motivation: ${motivation}` : ""}\nTarget difficulty: ${difficulty}\nAssessment summary: ${JSON.stringify(assessmentSummary)}`,
              },
            ],
          });

          const fallbackText =
            fallbackResponse.content
              .filter((b): b is Anthropic.TextBlock => b.type === "text")
              .map((b) => b.text)
              .join("\n") || "";

          try {
            const jsonMatch = fallbackText.match(/\{[\s\S]*\}/);
            researchData = jsonMatch
              ? JSON.parse(jsonMatch[0])
              : { researchSummary: fallbackText, sources: [] };
          } catch {
            researchData = { researchSummary: fallbackText, sources: [] };
          }
        }

        const sourceCount = researchData.sources?.length || 0;
        send("step", {
          step: 1,
          total: 4,
          label: "Research complete",
          detail: sourceCount > 0
            ? `Found ${sourceCount} source${sourceCount !== 1 ? "s" : ""}`
            : "Research summary generated",
        });

        // === STEP 2: Build curriculum ===
        send("step", {
          step: 2,
          total: 4,
          label: "Designing your curriculum",
          detail:
            "Building modules, lessons, and quizzes based on research...",
        });

        let skillContent = "";
        try {
          skillContent = readFileSync(
            join(process.cwd(), "src/lib/skills/curriculum-skill.md"),
            "utf-8"
          );
        } catch {
          // skill file not found
        }

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

        let curriculum: {
          title?: string;
          collegeEquivalent?: string;
          estimatedTotalHours?: number;
          modules?: {
            title: string;
            description?: string;
            lessons?: { title: string; estimatedDurationMinutes?: number }[];
            quiz?: { title?: string; quizType?: string };
          }[];
          finalExam?: boolean;
        } | null;
        try {
          const jsonMatch = curriculumText.match(/\{[\s\S]*\}/);
          curriculum = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          curriculum = null;
        }

        if (!curriculum) {
          send("error", { message: "Failed to generate curriculum structure. Please try again." });
          controller.close();
          return;
        }

        const moduleCount = curriculum.modules?.length || 0;
        const lessonCount =
          curriculum.modules?.reduce(
            (sum, m) => sum + (m.lessons?.length || 0),
            0
          ) || 0;

        send("step", {
          step: 2,
          total: 4,
          label: "Curriculum designed",
          detail: `${moduleCount} modules, ${lessonCount} lessons`,
        });

        // === STEP 3: Schedule ===
        send("step", {
          step: 3,
          total: 4,
          label: "Scheduling your course",
          detail: `Planning ${sessionsPerWeek} sessions per week starting ${startDate}...`,
        });

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

        let schedule: {
          endDate?: string;
          schedule?: {
            type: string;
            moduleIndex: number;
            lessonIndex?: number;
            quizType?: string;
            date: string;
          }[];
        } | null;
        try {
          const jsonMatch = scheduleText.match(/\{[\s\S]*\}/);
          schedule = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          schedule = null;
        }

        send("step", {
          step: 3,
          total: 4,
          label: "Schedule created",
          detail: schedule?.endDate
            ? `Course runs until ${schedule.endDate}`
            : "Dates assigned to all sessions",
        });

        // === STEP 4: Save to database ===
        send("step", {
          step: 4,
          total: 4,
          label: "Saving your course",
          detail: "Writing curriculum to database...",
        });

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
          console.error("Course insert error:", courseError);
          send("error", { message: "Failed to save course to database" });
          controller.close();
          return;
        }

        // Save sources
        if (researchData.sources && researchData.sources.length > 0) {
          await supabase.from("sources").insert(
            researchData.sources.map((s) => ({
              course_id: course.id,
              url: s.url || null,
              title: s.title || null,
              domain: s.domain || null,
              relevance_note: s.relevanceNote || null,
            }))
          );
        }

        // Save modules, lessons, quizzes
        for (let mi = 0; mi < (curriculum.modules || []).length; mi++) {
          const mod = curriculum.modules![mi];
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

          for (let li = 0; li < (mod.lessons || []).length; li++) {
            const lesson = mod.lessons![li];
            const scheduledDate =
              schedule?.schedule?.find(
                (s) =>
                  s.type === "lesson" &&
                  s.moduleIndex === mi &&
                  s.lessonIndex === li
              )?.date || null;

            await supabase.from("lessons").insert({
              module_id: moduleData.id,
              course_id: course.id,
              title: lesson.title,
              estimated_duration_minutes:
                lesson.estimatedDurationMinutes || 45,
              scheduled_date: scheduledDate,
              order_index: li,
              status: "pending",
            });
          }

          if (mod.quiz) {
            const quizDate =
              schedule?.schedule?.find(
                (s) =>
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

        if (curriculum.finalExam) {
          const finalDate =
            schedule?.schedule?.find(
              (s) => s.type === "quiz" && s.quizType === "final_exam"
            )?.date || null;

          await supabase.from("quizzes").insert({
            course_id: course.id,
            title: "Final Exam",
            quiz_type: "final_exam",
            scheduled_date: finalDate,
          });
        }

        send("step", {
          step: 4,
          total: 4,
          label: "Course saved",
          detail: "Everything is ready!",
        });

        send("complete", { courseId: course.id });
        controller.close();
      } catch (error) {
        console.error("Research/curriculum generation error:", error);
        send("error", {
          message: `Something went wrong: ${error instanceof Error ? error.message : "Unknown error"}. Check the server console for details.`,
        });
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
