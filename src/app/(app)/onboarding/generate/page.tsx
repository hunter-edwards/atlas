"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface StepInfo {
  step: number;
  total: number;
  label: string;
  detail: string;
}

const STEP_LABELS = [
  "Researching your topic",
  "Designing curriculum & schedule",
  "Saving your course",
];

export default function GeneratePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepInfo | null>(null);
  const [completedSteps, setCompletedSteps] = useState<StepInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const onboarding = sessionStorage.getItem("onboarding");
    const assessmentSummary = sessionStorage.getItem("assessmentSummary");
    const courseConfig = sessionStorage.getItem("courseConfig");

    if (!onboarding || !courseConfig) {
      router.push("/onboarding/describe");
      return;
    }

    const { topic, motivation } = JSON.parse(onboarding);
    const config = JSON.parse(courseConfig);
    const assessment = assessmentSummary
      ? JSON.parse(assessmentSummary)
      : {};

    startGeneration({
      topic,
      motivation,
      assessmentSummary: assessment,
      difficulty: config.difficulty,
      weeklyHours: config.weeklyHours,
      sessionsPerWeek: config.sessionsPerWeek,
      startDate: config.startDate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smooth progress animation
  useEffect(() => {
    if (!currentStep) return;
    const targetProgress = (currentStep.step / currentStep.total) * 100;

    // Animate to ~80% of the current step's range, then hold
    // The remaining 20% fills when the step completes
    const stepSize = 100 / currentStep.total;
    const baseProgress = (currentStep.step - 1) * stepSize;
    const animTarget = baseProgress + stepSize * 0.8;

    const timer = setInterval(() => {
      setSmoothProgress((prev) => {
        if (prev >= animTarget) {
          clearInterval(timer);
          return animTarget;
        }
        // Ease toward target
        return prev + (animTarget - prev) * 0.08;
      });
    }, 50);

    // When step label says "complete", jump to full step value
    if (
      currentStep.label.toLowerCase().includes("complete") ||
      currentStep.label.toLowerCase().includes("created") ||
      currentStep.label.toLowerCase().includes("designed") ||
      currentStep.label.toLowerCase().includes("ready") ||
      currentStep.label.toLowerCase().includes("saved")
    ) {
      setSmoothProgress(targetProgress);
    }

    return () => clearInterval(timer);
  }, [currentStep]);

  async function startGeneration(body: Record<string, unknown>) {
    // 3-minute timeout so we don't hang forever
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);

    let res: Response;
    try {
      res = await fetch("/api/agent/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Generation timed out after 3 minutes. Please try again.");
      } else {
        setError("Failed to connect to generation service.");
      }
      return;
    }
    clearTimeout(timeout);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    if (!reader) {
      setError("Failed to connect to generation service");
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "step") {
            setCurrentStep((prev) => {
              // If we're moving to a new step, archive the old one
              if (prev && prev.step < parsed.data.step) {
                setCompletedSteps((cs) => [...cs, prev]);
              }
              return parsed.data;
            });
          } else if (parsed.type === "complete") {
            setSmoothProgress(100);
            // Brief pause so user sees 100%, then redirect
            setTimeout(() => {
              router.push(`/course/${parsed.data.courseId}/overview`);
            }, 800);
          } else if (parsed.type === "error") {
            setError(parsed.data.message);
          }
        } catch {
          // skip
        }
      }
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="max-w-lg w-full px-6">
        <h1 className="text-3xl font-bold mb-2 text-center">
          Building Your Curriculum
        </h1>
        <p className="text-muted-foreground text-center mb-10">
          This takes about a minute. Here&apos;s what&apos;s happening:
        </p>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
            {error}
            <button
              onClick={() => router.push("/onboarding/configure")}
              className="block mt-2 text-red-900 font-medium underline"
            >
              Go back and try again
            </button>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="mb-10">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${smoothProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {Math.round(smoothProgress)}%
              </p>
            </div>

            {/* Step timeline */}
            <div className="space-y-4">
              {STEP_LABELS.map((label, i) => {
                const stepNum = i + 1;
                const isActive = currentStep?.step === stepNum;
                const isDone =
                  completedSteps.some((s) => s.step === stepNum) ||
                  (currentStep &&
                    currentStep.step > stepNum);
                const activeDetail =
                  isActive && currentStep ? currentStep.detail : null;
                const doneStep = completedSteps.find(
                  (s) => s.step === stepNum
                );

                return (
                  <div key={stepNum} className="flex items-start gap-4">
                    {/* Step indicator */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all duration-500 ${
                          isDone
                            ? "border-accent bg-accent text-accent-foreground"
                            : isActive
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {isDone ? (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          stepNum
                        )}
                      </div>
                      {stepNum < STEP_LABELS.length && (
                        <div
                          className={`w-0.5 h-6 mt-1 transition-colors duration-500 ${
                            isDone ? "bg-accent" : "bg-border"
                          }`}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="pt-1 pb-2 min-w-0">
                      <p
                        className={`text-sm font-medium transition-colors duration-300 ${
                          isActive
                            ? "text-foreground"
                            : isDone
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {isDone && doneStep
                          ? doneStep.label
                          : isActive && currentStep
                            ? currentStep.label
                            : label}
                      </p>
                      {(isActive && activeDetail) ||
                      (isDone && doneStep?.detail) ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isActive ? activeDetail : doneStep?.detail}
                        </p>
                      ) : null}
                      {isActive && !isDone && (
                        <div className="flex gap-1 mt-2">
                          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
