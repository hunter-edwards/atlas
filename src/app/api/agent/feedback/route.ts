import Anthropic from "@anthropic-ai/sdk";
import { getFeedbackGenerationSystemPrompt } from "@/lib/prompts/feedback-generation";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { quizId, courseId, responses: userResponses } = await req.json();

  const supabase = createAdminClient();

  // Fetch quiz questions and course context
  const [questionsRes, courseRes, quizRes] = await Promise.all([
    supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("order_index"),
    supabase.from("courses").select("*").eq("id", courseId).single(),
    supabase.from("quizzes").select("*").eq("id", quizId).single(),
  ]);

  const questions = questionsRes.data;
  const course = courseRes.data;
  const quiz = quizRes.data;

  if (!questions || !course) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Get module/lesson context for richer feedback
  let lessonTitles: string[] = [];
  if (quiz?.module_id) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("title")
      .eq("module_id", quiz.module_id)
      .order("order_index");
    if (lessons) lessonTitles = lessons.map((l) => l.title);
  }

  // Build the question + answer pairs
  const questionAnswerPairs = questions.map((q) => {
    const userResp = userResponses?.find(
      (r: { questionId: string; answer: string }) => r.questionId === q.id
    );
    const userAnswer = userResp?.answer || "";
    const isCorrect =
      q.correct_answer?.toLowerCase().trim() ===
      userAnswer.toLowerCase().trim();

    return {
      questionId: q.id,
      question: q.question,
      questionType: q.question_type,
      options: q.options,
      correctAnswer: q.correct_answer,
      userAnswer,
      isCorrect,
      existingExplanation: q.explanation,
    };
  });

  const score = questionAnswerPairs.filter((q) => q.isCorrect).length;
  const total = questionAnswerPairs.length;

  const client = new Anthropic();

  const aiResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 6000,
    system: [
      {
        type: "text",
        text: getFeedbackGenerationSystemPrompt(),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Generate detailed feedback for this quiz submission.

Course: ${course.title}
Difficulty: ${course.difficulty_level || "200-level"}
Quiz: ${quiz?.title || "Quiz"}
Score: ${score}/${total} (${total > 0 ? Math.round((score / total) * 100) : 0}%)
Related lessons: ${lessonTitles.join(", ") || "N/A"}

Question-by-question data:
${JSON.stringify(questionAnswerPairs, null, 2)}

Generate personalized feedback for each question and an overall summary following the output format in your skill file.`,
      },
    ],
  });

  const responseText =
    aiResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n") || "";

  let feedback;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    feedback = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    feedback = null;
  }

  if (!feedback) {
    return Response.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }

  return Response.json({ feedback });
}
