"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DescribePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [motivation, setMotivation] = useState("");

  function handleNext() {
    // Store in sessionStorage for the next step
    sessionStorage.setItem(
      "onboarding",
      JSON.stringify({ topic, motivation })
    );
    router.push("/onboarding/assess");
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Step 1 of 3
        </p>
        <h1 className="text-3xl font-bold mb-2">What do you want to learn?</h1>
        <p className="text-muted-foreground">
          Describe the topic in your own words. Be as specific or broad as you
          like.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-medium mb-2"
          >
            Topic
          </label>
          <textarea
            id="topic"
            rows={3}
            placeholder='e.g., "Microeconomics — how markets work, supply and demand, game theory basics"'
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        <div>
          <label
            htmlFor="motivation"
            className="block text-sm font-medium mb-2"
          >
            Why do you want to learn this?{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <textarea
            id="motivation"
            rows={2}
            placeholder="e.g., career change, personal interest, upcoming exam..."
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        <button
          onClick={handleNext}
          disabled={!topic.trim()}
          className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Continue to Assessment
        </button>
      </div>
    </div>
  );
}
