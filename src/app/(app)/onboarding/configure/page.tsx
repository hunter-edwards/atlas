"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DifficultyLevel } from "@/lib/types";

const DIFFICULTY_OPTIONS: {
  value: DifficultyLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "100-level",
    label: "100-Level — Survey / Introductory",
    description: "No prerequisites assumed. Start from zero.",
  },
  {
    value: "200-level",
    label: "200-Level — Foundational",
    description: "Light prerequisites. Some familiarity expected.",
  },
  {
    value: "300-level",
    label: "300-Level — Intermediate",
    description: "Moderate background assumed. Deeper exploration.",
  },
  {
    value: "400-level",
    label: "400-Level — Advanced",
    description: "Near-professional depth. Significant background needed.",
  },
  {
    value: "graduate",
    label: "Graduate — Research-Level",
    description: "Deep mastery. Research-level rigor.",
  },
];

export default function ConfigurePage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("200-level");
  const [weeklyHours, setWeeklyHours] = useState(5);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Default start date to today
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
  }, []);

  async function handleGenerate() {
    setLoading(true);

    const onboarding = JSON.parse(
      sessionStorage.getItem("onboarding") || "{}"
    );
    const assessmentSummary = JSON.parse(
      sessionStorage.getItem("assessmentSummary") || "{}"
    );

    // Create the course and kick off generation
    const res = await fetch("/api/agent/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: onboarding.topic,
        motivation: onboarding.motivation,
        assessmentSummary,
        difficulty,
        weeklyHours,
        sessionsPerWeek,
        startDate,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/course/${data.courseId}/overview`);
    }

    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Step 3 of 3
        </p>
        <h1 className="text-3xl font-bold mb-2">Configure Your Course</h1>
        <p className="text-muted-foreground">
          Set the difficulty, pace, and schedule.
        </p>
      </div>

      <div className="space-y-8">
        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Difficulty Level
          </label>
          <div className="space-y-2">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                  difficulty === opt.value
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={opt.value}
                  checked={difficulty === opt.value}
                  onChange={() => setDifficulty(opt.value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {opt.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Time commitment */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Hours per week: <strong>{weeklyHours}</strong>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1 hr</span>
            <span>20 hrs</span>
          </div>
        </div>

        {/* Sessions per week */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Sessions per week
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                onClick={() => setSessionsPerWeek(n)}
                className={`w-10 h-10 rounded-md text-sm font-medium border transition-colors ${
                  sessionsPerWeek === n
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Start date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium mb-2">
            Start date
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Generating Curriculum..." : "Generate My Curriculum"}
        </button>
      </div>
    </div>
  );
}
