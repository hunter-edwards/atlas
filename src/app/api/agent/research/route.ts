import Anthropic from "@anthropic-ai/sdk";
import { getResearchSystemPrompt } from "@/lib/prompts/research";
import { getCurriculumBuilderSystemPrompt } from "@/lib/prompts/curriculum-builder";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
        // === STEP 1: Research (focused, fewer web searches) ===
        send("step", {
          step: 1,
          total: 3,
          label: "Researching your topic",
          detail: `Searching for key sources on "${topic}"...`,
        });

        let researchData: {
          researchSummary: string;
          sources: {
            url?: string;
            title?: string;
            domain?: string;
            relevanceNote?: string;
          }[];
          concept_map?: unknown;
          topicStructure?: unknown;
        };

        try {
          const researchResponse = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 3000,
            system: [
              {
                type: "text",
                text: getResearchSystemPrompt(),
                cache_control: { type: "ephemeral" },
              },
            ],
            tools: [
              {
                type: "web_search_20250305",
                name: "web_search",
                max_uses: 5,
              },
            ],
            messages: [
              {
                role: "user",
                content: `Research this topic for curriculum design. Be efficient — focus on the 5-8 most authoritative sources rather than exhaustive searching.

Topic: "${topic}"${motivation ? `\nLearner motivation: ${motivation}` : ""}
Target difficulty: ${difficulty}
Assessment summary: ${JSON.stringify(assessmentSummary)}

Return a concise research summary with sources and concept map. Prioritize breadth of coverage over depth of any single source.`,
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
            total: 3,
            label: "Researching your topic",
            detail: "Web search unavailable, using AI knowledge...",
          });

          const fallbackResponse = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 3000,
            system: [
              {
                type: "text",
                text: getResearchSystemPrompt(),
                cache_control: { type: "ephemeral" },
              },
            ],
            messages: [
              {
                role: "user",
                content: `Research this topic for curriculum design using your knowledge (web search is not available): "${topic}"${motivation ? `\nLearner motivation: ${motivation}` : ""}\nTarget difficulty: ${difficulty}\nAssessment summary: ${JSON.stringify(assessmentSummary)}\n\nReturn a concise research summary with concept map.`,
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
          total: 3,
          label: "Research complete",
          detail:
            sourceCount > 0
              ? `Found ${sourceCount} source${sourceCount !== 1 ? "s" : ""}`
              : "Research summary generated",
        });

        // === STEP 2: Build curriculum WITH schedule (combined to save a full LLM round trip) ===
        send("step", {
          step: 2,
          total: 3,
          label: "Designing your curriculum & schedule",
          detail:
            "Building modules, lessons, quizzes, and assigning dates...",
        });

        const curriculumResponse = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          system: [
            {
              type: "text",
              text: getCurriculumBuilderSystemPrompt(),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: `## Research Summary
${researchData.researchSummary}

## Concept Map
${JSON.stringify(researchData.concept_map || researchData.topicStructure || [])}

## Assessment Summary
${JSON.stringify(assessmentSummary)}

## Configuration
Difficulty: ${difficulty}
Hours/week: ${weeklyHours}
Sessions/week: ${sessionsPerWeek}
Start date: ${startDate}
Topic: ${topic}${motivation ? `\nMotivation: ${motivation}` : ""}

Generate the curriculum JSON following your skill file format. ALSO include a "schedule" field that assigns dates to each lesson and quiz.

Use these scheduling rules:
- Distribute ${sessionsPerWeek} sessions per week, each ≤90 minutes
- Start from ${startDate}, skip weekends for scheduling
- Place module quizzes after the last lesson in each module
- Add 1 buffer day between modules
- Apply spaced repetition: harder topics get more spread-out sessions

Your JSON must include these top-level fields:
{
  "title": "string",
  "collegeEquivalent": "string",
  "estimatedTotalHours": number,
  "modules": [...],
  "finalExam": boolean,
  "endDate": "YYYY-MM-DD",
  "schedule": [
    { "type": "lesson"|"quiz", "moduleIndex": number, "lessonIndex": number, "date": "YYYY-MM-DD" },
    { "type": "quiz", "moduleIndex": number, "quizType": "module_exam"|"final_exam", "date": "YYYY-MM-DD" }
  ]
}`,
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
            quizzes?: { title?: string; quiz_type?: string; quizType?: string }[];
          }[];
          finalExam?: boolean;
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
          const jsonMatch = curriculumText.match(/\{[\s\S]*\}/);
          curriculum = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          // Try to repair truncated JSON
          try {
            const arrStart = curriculumText.indexOf("{");
            if (arrStart !== -1) {
              let text = curriculumText.slice(arrStart);
              const lastBrace = text.lastIndexOf("}");
              if (lastBrace !== -1) {
                text = text.slice(0, lastBrace + 1);
                curriculum = JSON.parse(text);
              } else {
                curriculum = null;
              }
            } else {
              curriculum = null;
            }
          } catch {
            curriculum = null;
          }
        }

        if (!curriculum) {
          send("error", {
            message:
              "Failed to generate curriculum structure. Please try again.",
          });
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
          total: 3,
          label: "Curriculum & schedule ready",
          detail: `${moduleCount} modules, ${lessonCount} lessons${curriculum.endDate ? ` — ends ${curriculum.endDate}` : ""}`,
        });

        // === STEP 3: Save to database ===
        send("step", {
          step: 3,
          total: 3,
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
            end_date: curriculum.endDate || null,
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

        // Save sources in parallel with module creation
        const sourcePromise =
          researchData.sources && researchData.sources.length > 0
            ? supabase.from("sources").insert(
                researchData.sources.map((s) => ({
                  course_id: course.id,
                  url: s.url || null,
                  title: s.title || null,
                  domain: s.domain || null,
                  relevance_note: s.relevanceNote || null,
                }))
              )
            : Promise.resolve();

        // Save modules, lessons, quizzes — batch inserts where possible
        const schedule = curriculum.schedule || [];

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

          // Batch insert all lessons for this module
          const lessonInserts = (mod.lessons || []).map((lesson, li) => {
            const scheduledDate =
              schedule.find(
                (s) =>
                  s.type === "lesson" &&
                  s.moduleIndex === mi &&
                  s.lessonIndex === li
              )?.date || null;

            return {
              module_id: moduleData.id,
              course_id: course.id,
              title: lesson.title,
              estimated_duration_minutes:
                lesson.estimatedDurationMinutes || 45,
              scheduled_date: scheduledDate,
              order_index: li,
              status: "pending",
            };
          });

          if (lessonInserts.length > 0) {
            await supabase.from("lessons").insert(lessonInserts);
          }

          // Always create a module exam quiz for every module
          // Handle both "quiz" (singular) and "quizzes" (array) from LLM output
          const quizDate =
            schedule.find(
              (s) =>
                s.type === "quiz" &&
                s.quizType === "module_exam" &&
                s.moduleIndex === mi
            )?.date || null;

          const quizTitle =
            mod.quiz?.title ||
            mod.quizzes?.find(
              (q) =>
                (q.quiz_type || q.quizType) === "module_exam"
            )?.title ||
            `Module ${mi + 1} Exam`;

          await supabase.from("quizzes").insert({
            course_id: course.id,
            module_id: moduleData.id,
            title: quizTitle,
            quiz_type: "module_exam",
            scheduled_date: quizDate,
          });
        }

        if (curriculum.finalExam) {
          const finalDate =
            schedule.find(
              (s) => s.type === "quiz" && s.quizType === "final_exam"
            )?.date || null;

          await supabase.from("quizzes").insert({
            course_id: course.id,
            title: "Final Exam",
            quiz_type: "final_exam",
            scheduled_date: finalDate,
          });
        }

        // Wait for sources to finish
        await sourcePromise;

        send("step", {
          step: 3,
          total: 3,
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
