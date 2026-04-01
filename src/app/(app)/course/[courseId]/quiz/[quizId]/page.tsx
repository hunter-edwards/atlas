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

interface FeedbackData {
  questionFeedback: {
    questionId: string;
    isCorrect: boolean;
    feedbackHtml: string;
    conceptsTested: string[];
    misconceptionIdentified: string | null;
    relatedLessonTitle: string | null;
  }[];
  summary: {
    strengths: string[];
    areasForGrowth: string[];
    studyRecommendation: string;
    encouragement: string;
  };
}

interface AdaptiveAnalysis {
  overallPerformance: string;
  scorePercent: number;
  recommendations: {
    shouldAdvance: boolean;
    remediationNeeded: boolean;
    suggestedActions: string[];
    paceAdjustment: string;
    reviewTopics: string[];
    supplementaryLessons: {
      title: string;
      focus: string;
      type: string;
    }[];
  };
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
  const [richFeedback, setRichFeedback] = useState<FeedbackData | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveAnalysis | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
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

      // Fetch rich feedback and adaptive analysis in parallel
      setLoadingInsights(true);
      Promise.all([
        fetch("/api/agent/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId, courseId, responses }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.feedback && setRichFeedback(d.feedback))
          .catch(() => {}),
        fetch("/api/agent/adapt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId, courseId }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.analysis && setAdaptive({ ...d.analysis, scorePercent: d.scorePercent }))
          .catch(() => {}),
      ]).finally(() => setLoadingInsights(false));
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
    const scorePercent = Math.round((result.score / result.total) * 100);

    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Quiz Complete</h1>
        <p className="text-lg text-muted-foreground mb-2">
          You scored{" "}
          <strong>
            {result.score}/{result.total}
          </strong>{" "}
          ({scorePercent}%)
        </p>

        {/* Score bar */}
        <div className="w-full bg-muted rounded-full h-3 mb-8">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              scorePercent >= 80
                ? "bg-green-500"
                : scorePercent >= 60
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>

        {/* Rich feedback summary */}
        {richFeedback?.summary && (
          <div className="border border-border rounded-md p-6 mb-8 bg-card">
            <h2 className="text-lg font-bold mb-4">Performance Summary</h2>

            {richFeedback.summary.strengths.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-green-700 mb-1">Strengths</h3>
                <ul className="list-disc list-inside space-y-1">
                  {richFeedback.summary.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {richFeedback.summary.areasForGrowth.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-amber-700 mb-1">Areas for Growth</h3>
                <ul className="list-disc list-inside space-y-1">
                  {richFeedback.summary.areasForGrowth.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {richFeedback.summary.studyRecommendation && (
              <div className="mb-3">
                <h3 className="text-sm font-semibold mb-1">What to Study Next</h3>
                <p className="text-sm text-muted-foreground">{richFeedback.summary.studyRecommendation}</p>
              </div>
            )}

            {richFeedback.summary.encouragement && (
              <p className="text-sm italic text-muted-foreground border-t border-border pt-3 mt-3">
                {richFeedback.summary.encouragement}
              </p>
            )}
          </div>
        )}

        {/* Adaptive recommendations */}
        {adaptive?.recommendations && (
          <div className="border border-border rounded-md p-6 mb-8 bg-card">
            <h2 className="text-lg font-bold mb-4">Learning Recommendations</h2>

            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full ${
                  adaptive.recommendations.shouldAdvance
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {adaptive.recommendations.shouldAdvance
                  ? "Ready to advance"
                  : "Review recommended"}
              </span>
              <span className="text-xs text-muted-foreground">
                Pace: {adaptive.recommendations.paceAdjustment}
              </span>
            </div>

            {adaptive.recommendations.suggestedActions.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-1">Suggested Actions</h3>
                <ul className="list-disc list-inside space-y-1">
                  {adaptive.recommendations.suggestedActions.map((a, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {adaptive.recommendations.reviewTopics.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-1">Topics to Review</h3>
                <div className="flex flex-wrap gap-2">
                  {adaptive.recommendations.reviewTopics.map((t, i) => (
                    <span
                      key={i}
                      className="text-xs bg-muted text-muted-foreground rounded-full px-3 py-1"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {adaptive.recommendations.supplementaryLessons.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Recommended Additional Lessons</h3>
                <div className="space-y-2">
                  {adaptive.recommendations.supplementaryLessons.map((l, i) => (
                    <div
                      key={i}
                      className="border border-border rounded p-3"
                    >
                      <p className="text-sm font-medium">{l.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.focus}
                      </p>
                      <span className="text-xs bg-muted rounded px-2 py-0.5 mt-1 inline-block">
                        {l.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loadingInsights && (
          <div className="border border-border rounded-md p-6 mb-8 bg-card text-center">
            <div className="animate-pulse text-sm text-muted-foreground">
              Generating personalized feedback and learning recommendations...
            </div>
          </div>
        )}

        {/* Question-by-question results */}
        <h2 className="text-lg font-bold mb-4">Question Details</h2>
        <div className="space-y-4">
          {result.results.map((r, i) => {
            const richQ = richFeedback?.questionFeedback?.[i];
            return (
              <div
                key={i}
                className={`border rounded-md p-4 ${
                  r.correct
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <p className="text-sm font-medium mb-2">{r.question}</p>

                {richQ ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {richQ.feedbackHtml}
                    </p>
                    {richQ.misconceptionIdentified && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
                        Common misconception: {richQ.misconceptionIdentified}
                      </p>
                    )}
                    {richQ.relatedLessonTitle && (
                      <p className="text-xs text-muted-foreground">
                        Related lesson: {richQ.relatedLessonTitle}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {r.explanation}
                  </p>
                )}
              </div>
            );
          })}
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
