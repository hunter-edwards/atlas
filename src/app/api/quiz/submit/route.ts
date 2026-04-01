import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { quizId, responses } = await req.json();

  const supabase = createAdminClient();

  // Fetch all questions for the quiz
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index");

  if (!questions) {
    return Response.json({ error: "Quiz not found" }, { status: 404 });
  }

  let score = 0;
  const results = [];

  for (const resp of responses) {
    const question = questions.find((q) => q.id === resp.questionId);
    if (!question) continue;

    const isCorrect =
      question.correct_answer?.toLowerCase().trim() ===
      resp.answer?.toLowerCase().trim();

    if (isCorrect) score++;

    results.push({
      question: question.question,
      correct: isCorrect,
      explanation: question.explanation || "",
    });

    // Save response
    await supabase.from("quiz_responses").insert({
      quiz_id: quizId,
      question_id: resp.questionId,
      user_answer: resp.answer,
      is_correct: isCorrect,
    });
  }

  // Mark quiz as completed
  await supabase
    .from("quizzes")
    .update({ status: "completed" })
    .eq("id", quizId);

  return Response.json({
    score,
    total: questions.length,
    results,
  });
}
