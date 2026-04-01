"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";
import type { Slide, Lesson } from "@/lib/types";

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const lessonRes = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();
      const slidesRes = await supabase
        .from("slides")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index");

      if (lessonRes.data) setLesson(lessonRes.data);

      if (slidesRes.data && slidesRes.data.length > 0) {
        setSlides(slidesRes.data);
      } else {
        // Need to generate slides
        generateSlides();
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function generateSlides() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/agent/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, courseId }),
      });

      const data = await res.json();
      if (res.ok && data.slides && data.slides.length > 0) {
        setSlides(data.slides);
      } else {
        setGenError(data.error || "Failed to generate slides. Please try again.");
      }
    } catch {
      setGenError("Network error. Please try again.");
    }
    setGenerating(false);
  }

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  async function markComplete() {
    const supabase = createClient();
    await supabase
      .from("lessons")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", lessonId);
    setLesson((prev) =>
      prev ? { ...prev, status: "completed" } : prev
    );
  }

  if (generating) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-center">
          <div className="animate-pulse text-lg font-serif mb-2">
            Generating slides...
          </div>
          <p className="text-sm text-muted-foreground">
            Building your lesson content
          </p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-center max-w-sm">
          <p className="text-muted-foreground mb-4">
            {genError || "No slides available for this lesson."}
          </p>
          <button
            onClick={generateSlides}
            className="rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try Generating Again
          </button>
        </div>
      </div>
    );
  }

  const slide = slides[currentIndex];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="text-sm">
          <span className="font-medium">{lesson?.title}</span>
          <span className="text-muted-foreground ml-3">
            {currentIndex + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Format toggle placeholder */}
          <span className="text-xs text-muted-foreground border border-border rounded px-2 py-1 opacity-50">
            Slides
          </span>
          <span className="text-xs text-muted-foreground border border-border rounded px-2 py-1 opacity-30 cursor-not-allowed">
            Podcast — Coming Soon
          </span>
          {lesson?.status !== "completed" && (
            <button
              onClick={markComplete}
              className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Mark Complete
            </button>
          )}
          {lesson?.status === "completed" && (
            <span className="text-xs text-green-600 font-medium">
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Slide content */}
      <div
        className="flex-1 flex items-center justify-center px-6 cursor-pointer"
        onClick={goNext}
      >
        <div className="max-w-3xl w-full">
          {slide.title && (
            <h2 className="text-2xl font-bold mb-6">{slide.title}</h2>
          )}
          <div className="prose prose-neutral max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {slide.body}
            </ReactMarkdown>
          </div>
          {slide.visual_hint && (
            <div className="mt-6 border border-dashed border-border rounded-md p-4 text-sm text-muted-foreground italic">
              Visual: {slide.visual_hint}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          Previous
        </button>
        {/* Progress dots */}
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>
        <button
          onClick={goNext}
          disabled={currentIndex === slides.length - 1}
          className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
