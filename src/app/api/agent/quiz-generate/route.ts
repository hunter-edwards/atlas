import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQuizGeneratorSystemPrompt } from "@/lib/prompts/quiz-generator";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { quizId, courseId } = await req.json();

  const supabase = createAdminClient();

  const [quizRes, courseRes] = await Promise.all([
    supabase.from("quizzes").select("*").eq("id", quizId).single(),
    supabase.from("courses").select("*").eq("id", courseId).single(),
  ]);

  const quiz = quizRes.data;
  const course = courseRes.data;

  if (!quiz || !course) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Get module/lesson context
  let context = "";
  if (quiz.module_id) {
    const { data: mod } = await supabase
      .from("modules")
      .select("*")
      .eq("id", quiz.module_id)
      .single();
    if (mod) context += `Module: ${mod.title}\n${mod.description || ""}`;

    // Get lesson titles for context
    const { data: lessons } = await supabase
      .from("lessons")
      .select("title")
      .eq("module_id", quiz.module_id)
      .order("order_index");
    if (lessons) {
      context += `\nLessons covered:\n${lessons.map((l) => `- ${l.title}`).join("\n")}`;
    }
  }

  const questionCount =
    quiz.quiz_type === "final_exam"
      ? 20
      : quiz.quiz_type === "module_exam"
        ? 12
        : 4;

  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: getQuizGeneratorSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `Generate a ${quiz.quiz_type} quiz.

Course: ${course.title}
Difficulty: ${course.difficulty_level || "200-level"}
${context}
Question count: ${questionCount}

Follow the question type distribution from the skill file (60% MC, 25% short answer, 15% T/F).
Return ONLY a JSON array of questions matching the format in the skill file.`,
      },
    ],
  });

  const responseText =
    response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n") || "";

  let questions;
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    // Try to repair truncated JSON
    try {
      const arrStart = responseText.indexOf("[");
      if (arrStart !== -1) {
        let text = responseText.slice(arrStart);
        const lastObj = text.lastIndexOf("}");
        if (lastObj !== -1) {
          text = text.slice(0, lastObj + 1) + "]";
          questions = JSON.parse(text);
        }
      }
    } catch {
      questions = [];
    }
    if (!questions) questions = [];
  }

  if (questions.length > 0) {
    await supabase.from("quiz_questions").insert(
      questions.map(
        (
          q: {
            question: string;
            question_type?: string;
            questionType?: string;
            options?: string[];
            correct_answer?: string;
            correctAnswer?: string;
            explanation?: string;
            order_index?: number;
            orderIndex?: number;
          },
          i: number
        ) => ({
          quiz_id: quizId,
          question: q.question,
          question_type: q.question_type || q.questionType || "multiple_choice",
          options: q.options || null,
          correct_answer: q.correct_answer || q.correctAnswer || null,
          explanation: q.explanation || null,
          order_index: q.order_index ?? q.orderIndex ?? i,
        })
      )
    );
  }

  const { data: savedQuestions } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index");

  return Response.json({ questions: savedQuestions || [] });
}
