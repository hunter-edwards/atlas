"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage, AssessmentSummary } from "@/lib/types";

export default function AssessPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AssessmentSummary | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("onboarding");
    if (!stored) {
      router.push("/onboarding/describe");
      return;
    }
    fetchNextQuestion([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchNextQuestion(history: ChatMessage[]) {
    setLoading(true);
    const stored = JSON.parse(sessionStorage.getItem("onboarding") || "{}");

    const res = await fetch("/api/agent/assess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: stored.topic,
        motivation: stored.motivation,
        conversationHistory: history,
      }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulatedText = "";

    if (!reader) return;

    // Add placeholder assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "summary") {
              setSummary(parsed.data);
              sessionStorage.setItem(
                "assessmentSummary",
                JSON.stringify(parsed.data)
              );
            } else if (parsed.type === "text") {
              accumulatedText += parsed.data;
              const snapshot = accumulatedText;
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: "assistant", content: snapshot },
              ]);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    }
    setLoading(false);
  }

  function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    fetchNextQuestion(newHistory);
  }

  function handleContinue() {
    router.push("/onboarding/configure");
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="mb-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Step 2 of 3
        </p>
        <h1 className="text-3xl font-bold mb-2">Knowledge Assessment</h1>
        <p className="text-muted-foreground">
          Answer a few questions so we can tailor your curriculum.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {summary ? (
        <div className="border-t border-border pt-4">
          <div className="rounded-md border border-border bg-muted p-4 mb-4">
            <p className="text-sm font-medium mb-1">Assessment Complete</p>
            <p className="text-sm text-muted-foreground">
              Level: <strong>{summary.knowledge_level}</strong> — Starting
              point: {summary.recommended_starting_point}
            </p>
          </div>
          <button
            onClick={handleContinue}
            className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Continue to Configuration
          </button>
        </div>
      ) : (
        <div className="border-t border-border pt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your answer..."
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
