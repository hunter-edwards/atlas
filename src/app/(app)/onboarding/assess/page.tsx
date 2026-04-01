"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AssessmentSummary } from "@/lib/types";

interface QuizOption {
  label: string;
  text: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
  correctAnswer: string;
  knowledgeArea: string;
}

export default function AssessPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("onboarding");
    if (!stored) {
      router.push("/onboarding/describe");
      return;
    }

    async function loadQuestions() {
      const { topic, motivation } = JSON.parse(
        sessionStorage.getItem("onboarding") || "{}"
      );

      try {
        const res = await fetch("/api/agent/assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, motivation }),
        });

        if (!res.ok) throw new Error("Failed to load questions");

        const data = await res.json();
        setQuestions(data.questions || []);
      } catch {
        setError("Failed to generate assessment. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelect(label: string) {
    setAnswers((prev) => ({ ...prev, [questions[currentIndex].id]: label }));
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleBack() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  function handleFinish() {
    // Score the quiz and build the assessment summary
    let correctCount = 0;
    const knownAreas: string[] = [];
    const gapAreas: string[] = [];

    for (const q of questions) {
      const userAnswer = answers[q.id];
      if (userAnswer === q.correctAnswer) {
        correctCount++;
        knownAreas.push(q.knowledgeArea);
      } else {
        gapAreas.push(q.knowledgeArea);
      }
    }

    const ratio = correctCount / questions.length;
    let level: AssessmentSummary["knowledge_level"];
    if (ratio >= 0.8) level = "advanced";
    else if (ratio >= 0.6) level = "intermediate";
    else if (ratio >= 0.3) level = "novice";
    else level = "beginner";

    const summary: AssessmentSummary = {
      knowledge_level: level,
      known_concepts: knownAreas,
      gaps_identified: gapAreas,
      recommended_starting_point:
        level === "beginner"
          ? "Start from the very beginning with foundational concepts"
          : level === "novice"
            ? "Start with a brief review of basics, then move to core concepts"
            : level === "intermediate"
              ? "Skip introductory material and start with intermediate topics"
              : "Focus on advanced topics and edge cases",
    };

    sessionStorage.setItem("assessmentSummary", JSON.stringify(summary));
    router.push("/onboarding/configure");
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Step 2 of 3
        </p>
        <h1 className="text-3xl font-bold mb-6">Knowledge Assessment</h1>
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          Generating your assessment...
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Step 2 of 3
        </p>
        <h1 className="text-3xl font-bold mb-6">Knowledge Assessment</h1>
        <p className="text-muted-foreground">
          {error || "No questions generated. Please go back and try again."}
        </p>
      </div>
    );
  }

  const question = questions[currentIndex];
  const selected = answers[question.id];
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Step 2 of 3
        </p>
        <h1 className="text-3xl font-bold mb-2">Knowledge Assessment</h1>
        <p className="text-muted-foreground">
          Answer these questions so we can tailor your curriculum. Don&apos;t worry
          about getting them right — we just need to understand where you&apos;re
          starting from.
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === currentIndex
                ? "w-8 bg-accent"
                : answers[questions[i].id] !== undefined
                  ? "w-2 bg-accent/50"
                  : "w-2 bg-border"
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-2">
          Question {currentIndex + 1} of {questions.length}
        </p>
        <h2 className="text-lg font-medium mb-6">{question.question}</h2>

        <div className="space-y-3">
          {question.options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleSelect(opt.label)}
              className={`w-full flex items-center gap-3 rounded-md border p-4 text-left transition-colors ${
                selected === opt.label
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full border text-sm font-medium shrink-0 ${
                  selected === opt.label
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border"
                }`}
              >
                {opt.label}
              </span>
              <span className="text-sm">{opt.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentIndex === 0}
          className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          Back
        </button>

        <div className="flex gap-3">
          {!isLast ? (
            <button
              onClick={handleNext}
              disabled={!selected}
              className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!allAnswered}
              className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Continue to Configuration
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
