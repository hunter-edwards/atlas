"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { QuizQuestion } from "@/lib/types";

interface QuizResult {
  score: number;
  total: number;
  results: { question: string; correct: boolean; explanation: string }[];
}

export default function QuizPage() {
  const { courseId, quizId } = useParams<{
    courseId: string;
    quizId: string;
  }>();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index");

      if (data) setQuestions(data);
      setLoading(false);
    }

    load();
  }, [quizId]);

  function handleAnswer(answer: string) {
    setAnswers((prev) => ({
      ...prev,
      [questions[currentIndex].id]: answer,
    }));
  }

  function handleCheck() {
    setShowFeedback(true);
  }

  function handleNext() {
    setShowFeedback(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  async function handleSubmit() {
    const responses = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] || "",
    }));

    const res = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, courseId, responses }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground">
        Loading quiz...
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Quiz Complete</h1>
        <p className="text-lg text-muted-foreground mb-8">
          You scored{" "}
          <strong>
            {result.score}/{result.total}
          </strong>{" "}
          ({Math.round((result.score / result.total) * 100)}%)
        </p>

        <div className="space-y-4">
          {result.results.map((r, i) => (
            <div
              key={i}
              className={`border rounded-md p-4 ${
                r.correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-sm font-medium mb-1">{r.question}</p>
              <p className="text-xs text-muted-foreground">{r.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground">
        No questions available.
      </div>
    );
  }

  const question = questions[currentIndex];
  const currentAnswer = answers[question.id] || "";
  const isCorrect = currentAnswer === question.correct_answer;
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
      <div className="max-w-xl w-full px-6">
        <p className="text-sm text-muted-foreground mb-4">
          Question {currentIndex + 1} of {questions.length}
        </p>

        <h2 className="text-xl font-bold mb-6">{question.question}</h2>

        {question.question_type === "multiple_choice" && question.options && (
          <div className="space-y-2 mb-6">
            {(question.options as string[]).map((opt, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                  currentAnswer === opt
                    ? showFeedback
                      ? opt === question.correct_answer
                        ? "border-green-500 bg-green-50"
                        : "border-red-500 bg-red-50"
                      : "border-accent bg-accent/5"
                    : showFeedback && opt === question.correct_answer
                      ? "border-green-500 bg-green-50"
                      : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={opt}
                  checked={currentAnswer === opt}
                  onChange={() => handleAnswer(opt)}
                  disabled={showFeedback}
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        )}

        {(question.question_type === "short_answer" ||
          question.question_type === "true_false") && (
          <div className="mb-6">
            {question.question_type === "true_false" ? (
              <div className="flex gap-3">
                {["True", "False"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={showFeedback}
                    className={`flex-1 rounded-md border p-3 text-sm font-medium transition-colors ${
                      currentAnswer === opt
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={currentAnswer}
                onChange={(e) => handleAnswer(e.target.value)}
                disabled={showFeedback}
                placeholder="Type your answer..."
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            )}
          </div>
        )}

        {showFeedback && question.explanation && (
          <div
            className={`rounded-md border p-4 mb-6 ${
              isCorrect
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <p className="text-sm font-medium mb-1">
              {isCorrect ? "Correct!" : "Incorrect"}
            </p>
            <p className="text-xs text-muted-foreground">
              {question.explanation}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          {!showFeedback ? (
            <button
              onClick={handleCheck}
              disabled={!currentAnswer}
              className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Check Answer
            </button>
          ) : isLast ? (
            <button
              onClick={handleSubmit}
              className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Finish Quiz
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Next Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
