import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const { quizId, courseId } = await req.json();

  const supabase = await createClient();

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
  }

  const questionCount =
    quiz.quiz_type === "final_exam"
      ? 15
      : quiz.quiz_type === "module_exam"
        ? 10
        : 4;

  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: `You are a quiz question generator. Generate ${questionCount} questions for a ${quiz.quiz_type} quiz. Follow these distributions: 60% multiple choice (4 options), 25% short answer, 15% true/false. Each question should include an explanation. Return a JSON array of questions.`,
    messages: [
      {
        role: "user",
        content: `Course: ${course.title}\nDifficulty: ${course.difficulty_level}\n${context}\n\nGenerate ${questionCount} quiz questions as a JSON array:\n[\n  {\n    "question": "...",\n    "questionType": "multiple_choice | short_answer | true_false",\n    "options": ["A", "B", "C", "D"],\n    "correctAnswer": "...",\n    "explanation": "...",\n    "orderIndex": 0\n  }\n]`,
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
    questions = [];
  }

  if (questions.length > 0) {
    await supabase.from("quiz_questions").insert(
      questions.map(
        (q: {
          question: string;
          questionType: string;
          options?: string[];
          correctAnswer: string;
          explanation?: string;
          orderIndex: number;
        }) => ({
          quiz_id: quizId,
          question: q.question,
          question_type: q.questionType || "multiple_choice",
          options: q.options || null,
          correct_answer: q.correctAnswer,
          explanation: q.explanation || null,
          order_index: q.orderIndex,
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
