"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";
import type { Slide, Lesson } from "@/lib/types";

// Slide theme palettes — each slide gets a different visual treatment
const SLIDE_THEMES = [
  { bg: "from-blue-600 to-blue-800", text: "text-white", accent: "text-blue-200", badge: "bg-blue-500/30" },
  { bg: "from-slate-50 to-slate-100", text: "text-slate-900", accent: "text-blue-600", badge: "bg-blue-100" },
  { bg: "from-indigo-600 to-purple-700", text: "text-white", accent: "text-indigo-200", badge: "bg-indigo-500/30" },
  { bg: "from-white to-slate-50", text: "text-slate-900", accent: "text-indigo-600", badge: "bg-indigo-100" },
  { bg: "from-emerald-600 to-teal-700", text: "text-white", accent: "text-emerald-200", badge: "bg-emerald-500/30" },
  { bg: "from-slate-50 to-white", text: "text-slate-900", accent: "text-emerald-600", badge: "bg-emerald-100" },
  { bg: "from-amber-500 to-orange-600", text: "text-white", accent: "text-amber-100", badge: "bg-amber-500/30" },
  { bg: "from-slate-800 to-slate-900", text: "text-white", accent: "text-blue-400", badge: "bg-slate-700" },
];

// Slide layout: if slide has a visual (image or diagram), use split; otherwise positional
function getSlideLayout(
  index: number,
  total: number,
  hasVisual: boolean
): "hero" | "content" | "split" | "highlight" | "summary" {
  if (index === 0) return hasVisual ? "split" : "hero";
  if (index === total - 1) return "summary";
  if (hasVisual) return "split";
  if (index % 3 === 0) return "highlight";
  return "content";
}

// Mermaid diagram renderer component
function MermaidDiagram({ code, isDark }: { code: string; isDark: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          fontFamily: "IBM Plex Sans, sans-serif",
          flowchart: { curve: "basis", padding: 15 },
        });
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) setSvg(rendered);
      } catch (err) {
        console.error("Mermaid render failed:", err);
        // Show the code as fallback
        if (!cancelled)
          setSvg(
            `<pre style="font-size:12px;opacity:0.6;white-space:pre-wrap">${code}</pre>`
          );
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [code, isDark]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

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
  const [showNotes, setShowNotes] = useState(false);

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
        setGenError(
          data.error || "Failed to generate slides. Please try again."
        );
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
      if (e.key === "n" || e.key === "N") setShowNotes((v) => !v);
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
    setLesson((prev) => (prev ? { ...prev, status: "completed" } : prev));
  }

  if (generating) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
          </div>
          <div className="text-lg font-serif text-white mb-2">
            Generating your lesson...
          </div>
          <p className="text-sm text-slate-400">
            Crafting slides and generating visuals
          </p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center max-w-sm">
          <p className="text-muted-foreground mb-4">
            {genError || "No slides available for this lesson."}
          </p>
          <button
            onClick={generateSlides}
            className="rounded-md bg-blue-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            Generate Slides
          </button>
        </div>
      </div>
    );
  }

  const slide = slides[currentIndex];
  const theme = SLIDE_THEMES[currentIndex % SLIDE_THEMES.length];
  const isDark =
    theme.bg.includes("600") ||
    theme.bg.includes("700") ||
    theme.bg.includes("800") ||
    theme.bg.includes("900");
  const progress = ((currentIndex + 1) / slides.length) * 100;

  const hasImage = !!slide.image_url;
  const hasDiagram = slide.visual_type === "diagram" && !!slide.diagram_code;
  const hasVisual = hasImage || hasDiagram;
  const layout = getSlideLayout(currentIndex, slides.length, hasVisual);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border bg-white z-10">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium truncate max-w-[300px]">
            {lesson?.title}
          </span>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
            {currentIndex + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotes((v) => !v)}
            className={`text-xs border rounded px-2 py-1 transition-colors ${
              showNotes
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Notes (N)
          </button>
          {lesson?.status !== "completed" && (
            <button
              onClick={markComplete}
              className="rounded-md bg-emerald-600 text-white px-4 py-1.5 text-xs font-medium hover:bg-emerald-700 transition-colors"
            >
              Mark Complete
            </button>
          )}
          {lesson?.status === "completed" && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Complete
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-slate-200">
        <div
          className="h-full bg-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Slide content */}
      <div
        className={`flex-1 flex items-center justify-center bg-gradient-to-br ${theme.bg} transition-all duration-500 cursor-pointer relative overflow-hidden`}
        onClick={goNext}
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {layout === "hero" && (
            <>
              <div
                className={`absolute -top-20 -right-20 w-80 h-80 rounded-full ${isDark ? "bg-white/5" : "bg-black/3"}`}
              />
              <div
                className={`absolute -bottom-32 -left-32 w-96 h-96 rounded-full ${isDark ? "bg-white/3" : "bg-black/2"}`}
              />
            </>
          )}
          {layout === "highlight" && (
            <div
              className={`absolute top-0 left-0 w-2 h-full ${isDark ? "bg-white/20" : "bg-current opacity-10"}`}
            />
          )}
          {layout === "summary" && (
            <>
              <div
                className={`absolute top-10 right-10 w-40 h-40 rounded-full border ${isDark ? "border-white/10" : "border-black/5"}`}
              />
              <div
                className={`absolute bottom-10 left-10 w-24 h-24 rounded-full border ${isDark ? "border-white/10" : "border-black/5"}`}
              />
            </>
          )}
        </div>

        <div
          className={`relative z-10 w-full max-w-5xl px-12 py-8 ${
            layout === "hero" ? "text-center" : ""
          }`}
        >
          {/* Slide number badge */}
          <div
            className={`inline-block text-xs font-mono rounded-full px-3 py-1 mb-6 ${theme.badge} ${isDark ? "text-white/70" : "text-slate-600"}`}
          >
            {currentIndex + 1}
          </div>

          {/* Title */}
          {slide.title && (
            <h2
              className={`font-serif font-bold mb-8 leading-tight ${theme.text} ${
                layout === "hero"
                  ? "text-4xl md:text-5xl"
                  : layout === "summary"
                    ? "text-3xl"
                    : "text-2xl md:text-3xl"
              }`}
            >
              {slide.title}
            </h2>
          )}

          {/* Body with visual layout */}
          <div
            className={`flex gap-8 items-start ${layout === "split" ? "" : "flex-col"}`}
          >
            {/* Text content */}
            <div
              className={`${layout === "split" && hasVisual ? "flex-1 min-w-0" : "w-full"}`}
            >
              <div
                className={`prose max-w-none ${
                  isDark
                    ? "prose-invert prose-p:text-white/90 prose-li:text-white/90 prose-strong:text-white prose-headings:text-white"
                    : "prose-slate"
                } ${layout === "hero" ? "prose-lg text-center" : "prose-base"}`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {slide.body}
                </ReactMarkdown>
              </div>
            </div>

            {/* Visual: AI-generated image */}
            {hasImage && (
              <div
                className={`flex-shrink-0 ${layout === "split" ? "w-[42%]" : "w-full max-w-lg mx-auto"}`}
              >
                <div className="rounded-xl overflow-hidden shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.image_url!}
                    alt={slide.visual_hint || "Slide illustration"}
                    className="w-full h-auto"
                  />
                </div>
                {slide.visual_hint && (
                  <p
                    className={`text-xs mt-2 italic ${isDark ? "text-white/40" : "text-slate-400"}`}
                  >
                    {slide.visual_hint}
                  </p>
                )}
              </div>
            )}

            {/* Visual: Mermaid diagram */}
            {hasDiagram && (
              <div
                className={`flex-shrink-0 ${layout === "split" ? "w-[42%]" : "w-full max-w-lg mx-auto"}`}
              >
                <div
                  className={`rounded-xl p-4 ${isDark ? "bg-white/10 backdrop-blur" : "bg-white shadow-lg border border-slate-200"}`}
                >
                  <MermaidDiagram
                    code={slide.diagram_code!}
                    isDark={isDark}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Speaker notes panel */}
      {showNotes && slide.speaker_notes && (
        <div className="border-t border-border bg-amber-50 px-6 py-3 max-h-32 overflow-y-auto">
          <p className="text-xs font-semibold text-amber-800 mb-1">
            Speaker Notes
          </p>
          <p className="text-sm text-amber-900/80">{slide.speaker_notes}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-white">
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Previous
        </button>
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(i);
              }}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-6 h-2 bg-blue-600"
                  : i < currentIndex
                    ? "w-2 h-2 bg-blue-300"
                    : "w-2 h-2 bg-slate-200"
              }`}
            />
          ))}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          disabled={currentIndex === slides.length - 1}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          Next
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
