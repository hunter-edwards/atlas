import Anthropic from "@anthropic-ai/sdk";
import { getAdaptiveLearningSystemPrompt } from "@/lib/prompts/adaptive-learning";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { quizId, courseId } = await req.json();

  const supabase = createAdminClient();

  // Fetch quiz, questions, responses, and course context in parallel
  const [quizRes, questionsRes, responsesRes, courseRes] = await Promise.all([
    supabase.from("quizzes").select("*").eq("id", quizId).single(),
    supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("order_index"),
    supabase
      .from("quiz_responses")
      .select("*")
      .eq("quiz_id", quizId)
      .order("answered_at"),
    supabase.from("courses").select("*").eq("id", courseId).single(),
  ]);

  const quiz = quizRes.data;
  const questions = questionsRes.data;
  const responses = responsesRes.data;
  const course = courseRes.data;

  if (!quiz || !questions || !course) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Build performance data
  const totalQuestions = questions.length;
  const correctCount =
    responses?.filter((r) => r.is_correct).length ?? 0;
  const scorePercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Get module and lesson context
  let moduleContext = "";
  let lessonTitles: string[] = [];
  if (quiz.module_id) {
    const [modRes, lessonsRes] = await Promise.all([
      supabase
        .from("modules")
        .select("*")
        .eq("id", quiz.module_id)
        .single(),
      supabase
        .from("lessons")
        .select("title, order_index")
        .eq("module_id", quiz.module_id)
        .order("order_index"),
    ]);
    if (modRes.data)
      moduleContext = `Module: ${modRes.data.title}\nDescription: ${modRes.data.description || "N/A"}`;
    if (lessonsRes.data)
      lessonTitles = lessonsRes.data.map((l) => l.title);
  }

  // Map questions to responses for detailed analysis
  const questionDetails = questions.map((q) => {
    const response = responses?.find((r) => r.question_id === q.id);
    return {
      question: q.question,
      questionType: q.question_type,
      correctAnswer: q.correct_answer,
      userAnswer: response?.user_answer || "no answer",
      isCorrect: response?.is_correct ?? false,
      explanation: q.explanation,
    };
  });

  const client = new Anthropic();

  const aiResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: [
      {
        type: "text",
        text: getAdaptiveLearningSystemPrompt(),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Analyze this quiz performance and recommend curriculum adjustments.

Course: ${course.title}
Difficulty: ${course.difficulty_level || "200-level"}
${moduleContext}
Lessons in module: ${lessonTitles.join(", ") || "N/A"}
Quiz type: ${quiz.quiz_type}

Score: ${correctCount}/${totalQuestions} (${scorePercent}%)

Question-by-question breakdown:
${JSON.stringify(questionDetails, null, 2)}

Based on this performance data, provide your analysis and recommendations following the output format in your skill file.`,
      },
    ],
  });

  const responseText =
    aiResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n") || "";

  let analysis;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    analysis = null;
  }

  if (!analysis) {
    return Response.json(
      { error: "Failed to generate analysis" },
      { status: 500 }
    );
  }

  return Response.json({
    quizId,
    scorePercent,
    analysis,
  });
}
