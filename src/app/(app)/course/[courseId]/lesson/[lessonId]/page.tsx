"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";
import type { Slide, Lesson } from "@/lib/types";

// ─── Design System ─────────────────────────────────────────────────────────────

type Archetype = "Scholar" | "Technician" | "Editorial" | "Architect" | "Naturalist" | "Obsidian";

interface ArchetypeTokens {
  bg: string;
  mid: string;
  accent: string;
  text: string;
  textMuted: string;
  isDark: boolean;
  accentAlpha: (opacity: number) => string;
}

const ARCHETYPES: Record<Archetype, ArchetypeTokens> = {
  Scholar: {
    bg: "#F5F0E8",
    mid: "#EAE4D6",
    accent: "#1A3A2A",
    text: "#1A1A1A",
    textMuted: "#6B6459",
    isDark: false,
    accentAlpha: (o) => `rgba(26,58,42,${o})`,
  },
  Technician: {
    bg: "#F0F4F8",
    mid: "#E2E8F0",
    accent: "#0284C7",
    text: "#0F172A",
    textMuted: "#64748B",
    isDark: false,
    accentAlpha: (o) => `rgba(2,132,199,${o})`,
  },
  Editorial: {
    bg: "#FAFAF8",
    mid: "#F0EFE9",
    accent: "#C0392B",
    text: "#1A1A1A",
    textMuted: "#6B6B6B",
    isDark: false,
    accentAlpha: (o) => `rgba(192,57,43,${o})`,
  },
  Architect: {
    bg: "#F2F0ED",
    mid: "#E5E3DF",
    accent: "#2C4A6E",
    text: "#1A1A1A",
    textMuted: "#6B6B6B",
    isDark: false,
    accentAlpha: (o) => `rgba(44,74,110,${o})`,
  },
  Naturalist: {
    bg: "#EEF2EE",
    mid: "#DDE5DC",
    accent: "#3D5A3E",
    text: "#1A1A1A",
    textMuted: "#5A6B5A",
    isDark: false,
    accentAlpha: (o) => `rgba(61,90,62,${o})`,
  },
  Obsidian: {
    bg: "#1C1C1E",
    mid: "#2C2C2E",
    accent: "#E8C547",
    text: "#F5F5F7",
    textMuted: "#A1A1A6",
    isDark: true,
    accentAlpha: (o) => `rgba(232,197,71,${o})`,
  },
};

function getArchetype(slide: Slide): ArchetypeTokens {
  const name = (slide.color_archetype || "Scholar") as Archetype;
  return ARCHETYPES[name] ?? ARCHETYPES.Scholar;
}

// ─── Callout Panel ─────────────────────────────────────────────────────────────

const CALLOUT_META: Record<string, { label: string; bg: string; border: string; labelColor: string }> = {
  key_insight: { label: "Key Insight", bg: "rgba(0,0,0,0.06)", border: "accent", labelColor: "accent" },
  definition: { label: "Definition", bg: "rgba(0,0,0,0.04)", border: "rgba(0,0,0,0.15)", labelColor: "inherit" },
  warning: { label: "Watch Out", bg: "#FEF3C7", border: "#D97706", labelColor: "#92400E" },
  example: { label: "Example", bg: "rgba(0,0,0,0.04)", border: "accent", labelColor: "accent" },
  tip: { label: "Pro Tip", bg: "rgba(0,0,0,0.03)", border: "accent", labelColor: "accent" },
};

function CalloutPanel({ text, type, tokens }: { text: string; type: string; tokens: ArchetypeTokens }) {
  const meta = CALLOUT_META[type] ?? CALLOUT_META.key_insight;
  const isWarning = type === "warning";

  const bg = isWarning ? meta.bg : tokens.accentAlpha(type === "key_insight" ? 0.1 : 0.05);
  const border = isWarning ? meta.border : tokens.accent;
  const labelColor = isWarning ? meta.labelColor : tokens.accent;

  return (
    <div
      style={{
        background: bg,
        borderLeft: `3px solid ${border}`,
        borderRadius: "0 6px 6px 0",
        padding: "12px 16px",
        marginTop: "20px",
      }}
    >
      <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: labelColor, margin: "0 0 4px 0", fontFamily: "'IBM Plex Sans', sans-serif" }}>
        {meta.label}
      </p>
      <p style={{ fontSize: "0.9rem", lineHeight: 1.55, color: tokens.text, margin: 0, fontFamily: "'IBM Plex Sans', sans-serif" }}>
        {text}
      </p>
    </div>
  );
}

// ─── Mermaid Diagram ───────────────────────────────────────────────────────────

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
        if (!cancelled)
          setSvg(`<pre style="font-size:12px;opacity:0.6;white-space:pre-wrap">${code}</pre>`);
      }
    }
    render();
    return () => { cancelled = true; };
  }, [code, isDark]);

  return (
    <div ref={containerRef} className="flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

// ─── Shared Visual Zone ────────────────────────────────────────────────────────

function VisualZone({ slide, tokens }: { slide: Slide; tokens: ArchetypeTokens }) {
  const hasImage = !!slide.image_url;
  const hasDiagram = slide.visual_type === "diagram" && !!slide.diagram_code;

  if (hasImage) {
    return (
      <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={slide.image_url!} alt={slide.visual_hint || "Slide illustration"} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
    );
  }

  if (hasDiagram) {
    return (
      <div style={{ background: tokens.mid, borderRadius: 10, padding: "16px", border: `1px solid ${tokens.accentAlpha(0.12)}` }}>
        <MermaidDiagram code={slide.diagram_code!} isDark={tokens.isDark} />
      </div>
    );
  }

  return null;
}

// ─── Template A: Title / Hook ──────────────────────────────────────────────────

function TemplateA({ slide, tokens, label }: { slide: Slide; tokens: ArchetypeTokens; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", padding: "64px" }}>
      {/* Accent bar */}
      <div style={{ width: 48, height: 4, background: tokens.accent, borderRadius: 2, marginBottom: 40 }} />

      {/* Title */}
      {slide.title && (
        <h2 style={{
          fontFamily: "'Playfair Display', 'Libre Baskerville', Georgia, serif",
          fontSize: "clamp(2.4rem, 5vw, 3.5rem)",
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: "-0.03em",
          color: tokens.text,
          margin: "0 0 24px 0",
          maxWidth: "70%",
        }}>
          {slide.title}
        </h2>
      )}

      {/* Body as hook/subtitle */}
      <div style={{ maxWidth: "55%", color: tokens.textMuted, fontSize: "1.15rem", lineHeight: 1.6, fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{slide.body}</ReactMarkdown>
      </div>

      {/* Module label */}
      <p style={{ position: "absolute", bottom: 56, right: 64, fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: tokens.accent, fontFamily: "'IBM Plex Sans', sans-serif", margin: 0 }}>
        {label}
      </p>
    </div>
  );
}

// ─── Template B: Concept Instruction ──────────────────────────────────────────

function TemplateB({ slide, tokens }: { slide: Slide; tokens: ArchetypeTokens }) {
  const visual = <VisualZone slide={slide} tokens={tokens} />;
  const hasVisual = !!(slide.image_url || (slide.visual_type === "diagram" && slide.diagram_code));

  return (
    <div style={{ padding: "52px 64px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Title + rule */}
      {slide.title && (
        <>
          <h2 style={{ fontFamily: "'Playfair Display', 'Libre Baskerville', Georgia, serif", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, color: tokens.text, margin: "0 0 12px 0" }}>
            {slide.title}
          </h2>
          <div style={{ height: 1, background: tokens.accentAlpha(0.2), marginBottom: 28 }} />
        </>
      )}

      {/* Content row */}
      <div style={{ display: "flex", gap: 40, flex: 1, alignItems: "flex-start", overflow: "hidden" }}>
        {/* Left: body (55%) */}
        <div style={{ flex: hasVisual ? "0 0 55%" : "1", minWidth: 0, color: tokens.text, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.95rem", lineHeight: 1.65 }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              ul: ({ children }) => <ul style={{ paddingLeft: "1.2em", margin: "0 0 12px 0" }}>{children}</ul>,
              li: ({ children }) => <li style={{ marginBottom: 10, lineHeight: 1.6 }}>{children}</li>,
              strong: ({ children }) => <strong style={{ color: tokens.accent, fontWeight: 600 }}>{children}</strong>,
              p: ({ children }) => <p style={{ margin: "0 0 12px 0" }}>{children}</p>,
            }}
          >
            {slide.body}
          </ReactMarkdown>

          {slide.callout_text && slide.callout_type && (
            <CalloutPanel text={slide.callout_text} type={slide.callout_type} tokens={tokens} />
          )}
        </div>

        {/* Right: visual (40%) */}
        {hasVisual && (
          <div style={{ flex: "0 0 40%", minWidth: 0 }}>
            {visual}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Template C: Full-Bleed Visual ────────────────────────────────────────────

function TemplateC({ slide, tokens }: { slide: Slide; tokens: ArchetypeTokens }) {
  const hasVisual = !!(slide.image_url || (slide.visual_type === "diagram" && slide.diagram_code));

  return (
    <div style={{ padding: "48px 64px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Title */}
      {slide.title && (
        <h2 style={{ fontFamily: "'Playfair Display', 'Libre Baskerville', Georgia, serif", fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 700, letterSpacing: "-0.02em", color: tokens.text, margin: "0 0 20px 0" }}>
          {slide.title}
        </h2>
      )}

      {/* Visual — dominant */}
      {hasVisual && (
        <div style={{ flex: 1, minHeight: 0, marginBottom: 16, display: "flex", alignItems: "center" }}>
          <div style={{ width: "100%", maxHeight: "100%" }}>
            <VisualZone slide={slide} tokens={tokens} />
          </div>
        </div>
      )}

      {/* Caption from body */}
      <div style={{ color: tokens.textMuted, fontSize: "0.85rem", lineHeight: 1.5, fontFamily: "'IBM Plex Sans', sans-serif", fontStyle: "italic" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{slide.body}</ReactMarkdown>
      </div>
    </div>
  );
}

// ─── Template D: Stat / Callout ────────────────────────────────────────────────

function TemplateD({ slide, tokens }: { slide: Slide; tokens: ArchetypeTokens }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "64px", textAlign: "center" }}>
      {/* Large stat / title */}
      {slide.title && (
        <h2 style={{
          fontFamily: "'Playfair Display', 'Libre Baskerville', Georgia, serif",
          fontSize: "clamp(2.4rem, 6vw, 4rem)",
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          color: tokens.accent,
          margin: "0 0 28px 0",
          maxWidth: "80%",
        }}>
          {slide.title}
        </h2>
      )}

      {/* Context statement */}
      <div style={{ color: tokens.textMuted, fontSize: "1.05rem", lineHeight: 1.65, maxWidth: "60%", fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{slide.body}</ReactMarkdown>
      </div>
    </div>
  );
}

// ─── Template E: Comparison / Two-Column ──────────────────────────────────────

function TemplateE({ slide, tokens }: { slide: Slide; tokens: ArchetypeTokens }) {
  // Parse body: look for "---" separator between columns, or split on double newline
  const parts = slide.body.split(/\n---\n|\n\n---\n\n/);
  const left = parts[0] ?? slide.body;
  const right = parts[1] ?? "";

  const colStyle = {
    flex: "1 1 45%",
    background: tokens.mid,
    borderRadius: 8,
    padding: "20px 24px",
    color: tokens.text,
    fontSize: "0.9rem",
    lineHeight: 1.6,
    fontFamily: "'IBM Plex Sans', sans-serif",
  };

  return (
    <div style={{ padding: "48px 56px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Title + rule */}
      {slide.title && (
        <>
          <h2 style={{ fontFamily: "'Playfair Display', 'Libre Baskerville', Georgia, serif", fontSize: "clamp(1.5rem, 2.8vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", color: tokens.text, margin: "0 0 12px 0" }}>
            {slide.title}
          </h2>
          <div style={{ height: 1, background: tokens.accentAlpha(0.2), marginBottom: 24 }} />
        </>
      )}

      {/* Columns */}
      <div style={{ display: "flex", gap: 20, flex: 1, alignItems: "stretch" }}>
        <div style={colStyle}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              ul: ({ children }) => <ul style={{ paddingLeft: "1.2em", margin: 0 }}>{children}</ul>,
              li: ({ children }) => <li style={{ marginBottom: 8 }}>{children}</li>,
              p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
            }}
          >
            {left}
          </ReactMarkdown>
        </div>
        {right && (
          <div style={{ ...colStyle, borderLeft: `2px solid ${tokens.accentAlpha(0.3)}` }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                ul: ({ children }) => <ul style={{ paddingLeft: "1.2em", margin: 0 }}>{children}</ul>,
                li: ({ children }) => <li style={{ marginBottom: 8 }}>{children}</li>,
                p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
              }}
            >
              {right}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Callout as synthesis */}
      {slide.callout_text && slide.callout_type && (
        <div style={{ marginTop: 20 }}>
          <CalloutPanel text={slide.callout_text} type={slide.callout_type} tokens={tokens} />
        </div>
      )}
    </div>
  );
}

// ─── Template F: Step / Process ────────────────────────────────────────────────

function TemplateF({ slide, tokens }: { slide: Slide; tokens: ArchetypeTokens }) {
  // Parse numbered steps from body markdown
  const lines = slide.body.split("\n").filter((l) => l.trim());
  const steps: { num: string; title: string; desc: string }[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Match "1. **Title**" or "1. Title" patterns
    const match = line.match(/^(\d+)\.\s+(?:\*\*(.+?)\*\*|(.+))$/);
    if (match) {
      const desc = lines[i + 1] && !lines[i + 1].match(/^\d+\./) ? lines[i + 1] : "";
      steps.push({ num: match[1], title: match[2] || match[3], desc });
      if (desc) i += 2;
      else i += 1;
    } else {
      i++;
    }
  }

  // Fallback: if no numbered steps found, treat each line as a step
  const displaySteps = steps.length > 0 ? steps : lines.slice(0, 5).map((l, idx) => ({ num: String(idx + 1), title: l.replace(/^[-*]\s+/, ""), desc: "" }));

  return (
    <div style={{ padding: "48px 64px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Title + rule */}
      {slide.title && (
        <>
          <h2 style={{ fontFamily: "'Playfair Display', 'Libre Baskerville', Georgia, serif", fontSize: "clamp(1.5rem, 2.8vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", color: tokens.text, margin: "0 0 12px 0" }}>
            {slide.title}
          </h2>
          <div style={{ height: 1, background: tokens.accentAlpha(0.2), marginBottom: 28 }} />
        </>
      )}

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        {displaySteps.map((step) => (
          <div key={step.num} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            {/* Step number */}
            <div style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: tokens.accent,
              color: tokens.isDark ? tokens.bg : "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: "0.9rem",
              fontWeight: 700,
            }}>
              {step.num}
            </div>
            <div>
              <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: "1rem", color: tokens.text, margin: "4px 0 4px 0", lineHeight: 1.3 }}>
                {step.title}
              </p>
              {step.desc && (
                <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.875rem", color: tokens.textMuted, margin: 0, lineHeight: 1.55 }}>
                  {step.desc}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Template G: Code ─────────────────────────────────────────────────────────

function TemplateG({ slide, tokens }: { slide: Slide; tokens: ArchetypeTokens }) {
  // Extract code block from body
  const codeMatch = slide.body.match(/```(\w*)\n([\s\S]*?)```/);
  const lang = codeMatch?.[1] ?? "";
  const code = codeMatch?.[2] ?? "";
  const prose = slide.body.replace(/```[\s\S]*?```/g, "").trim();

  return (
    <div style={{ padding: "48px 64px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Title + rule */}
      {slide.title && (
        <>
          <h2 style={{ fontFamily: "'Playfair Display', 'Libre Baskerville', Georgia, serif", fontSize: "clamp(1.5rem, 2.8vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", color: tokens.text, margin: "0 0 12px 0" }}>
            {slide.title}
          </h2>
          <div style={{ height: 1, background: tokens.accentAlpha(0.2), marginBottom: 20 }} />
        </>
      )}

      {/* Setup sentence */}
      {prose && (
        <p style={{ color: tokens.textMuted, fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 20, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {prose}
        </p>
      )}

      {/* Code block */}
      {code && (
        <div style={{ background: "#0D1117", borderRadius: 8, overflow: "hidden", flex: 1, minHeight: 0 }}>
          {lang && (
            <div style={{ background: "#161B22", padding: "6px 16px", borderBottom: "1px solid #30363D" }}>
              <span style={{ fontSize: "0.7rem", color: "#8B949E", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.05em" }}>
                {lang}
              </span>
            </div>
          )}
          <pre style={{ margin: 0, padding: "20px", overflowX: "auto", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.85rem", lineHeight: 1.7, color: "#E6EDF3" }}>
            <code>{code}</code>
          </pre>
        </div>
      )}

      {/* Callout */}
      {slide.callout_text && slide.callout_type && (
        <div style={{ marginTop: 16 }}>
          <CalloutPanel text={slide.callout_text} type={slide.callout_type} tokens={tokens} />
        </div>
      )}
    </div>
  );
}

// ─── Slide Renderer ────────────────────────────────────────────────────────────

function SlideRenderer({ slide, index, total }: { slide: Slide; index: number; total: number }) {
  const tokens = getArchetype(slide);
  const template = (slide.layout_template || (index === 0 ? "A" : index === total - 1 ? "A" : "B")) as string;
  const label = `${index + 1} of ${total}`;

  const inner = (() => {
    switch (template) {
      case "A": return <TemplateA slide={slide} tokens={tokens} label={label} />;
      case "C": return <TemplateC slide={slide} tokens={tokens} />;
      case "D": return <TemplateD slide={slide} tokens={tokens} />;
      case "E": return <TemplateE slide={slide} tokens={tokens} />;
      case "F": return <TemplateF slide={slide} tokens={tokens} />;
      case "G": return <TemplateG slide={slide} tokens={tokens} />;
      default:  return <TemplateB slide={slide} tokens={tokens} />;
    }
  })();

  return (
    <div
      style={{
        background: tokens.bg,
        color: tokens.text,
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        transition: "background 0.4s ease",
      }}
    >
      {inner}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const lessonRes = await supabase.from("lessons").select("*").eq("id", lessonId).single();
      const slidesRes = await supabase.from("slides").select("*").eq("lesson_id", lessonId).order("order_index");
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
        setGenError(data.error || "Failed to generate slides. Please try again.");
      }
    } catch {
      setGenError("Network error. Please try again.");
    }
    setGenerating(false);
  }

  const goNext = useCallback(() => setCurrentIndex((i) => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const goPrev = useCallback(() => setCurrentIndex((i) => Math.max(i - 1, 0)), []);

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
    await supabase.from("lessons").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", lessonId);
    setLesson((prev) => (prev ? { ...prev, status: "completed" } : prev));
  }

  if (generating) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]" style={{ background: "#0F1117" }}>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: "#1C1F2E" }} />
            <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "#00E5FF", borderTopColor: "transparent" }} />
          </div>
          <p style={{ color: "#E8EAED", fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", marginBottom: 8 }}>
            Generating your lesson...
          </p>
          <p style={{ color: "#8A8FA8", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "0.875rem" }}>
            Crafting slides and generating visuals
          </p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]" style={{ background: "#FAFAF8" }}>
        <div className="text-center max-w-sm">
          <p className="text-muted-foreground mb-4">{genError || "No slides available for this lesson."}</p>
          <button onClick={generateSlides} className="rounded-md bg-blue-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors">
            Generate Slides
          </button>
        </div>
      </div>
    );
  }

  const slide = slides[currentIndex];
  const tokens = getArchetype(slide);
  const progress = ((currentIndex + 1) / slides.length) * 100;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border bg-white z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium truncate max-w-[300px]">{lesson?.title}</span>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
            {currentIndex + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotes((v) => !v)}
            className={`text-xs border rounded px-2 py-1 transition-colors ${showNotes ? "border-blue-300 bg-blue-50 text-blue-700" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            Notes (N)
          </button>
          {lesson?.status !== "completed" && (
            <button onClick={markComplete} className="rounded-md bg-emerald-600 text-white px-4 py-1.5 text-xs font-medium hover:bg-emerald-700 transition-colors">
              Mark Complete
            </button>
          )}
          {lesson?.status === "completed" && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              Complete
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 flex-shrink-0" style={{ background: tokens.mid }}>
        <div className="h-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: tokens.accent }} />
      </div>

      {/* Slide */}
      <div className="flex-1 min-h-0 cursor-pointer" onClick={goNext}>
        <SlideRenderer slide={slide} index={currentIndex} total={slides.length} />
      </div>

      {/* Speaker notes */}
      {showNotes && slide.speaker_notes && (
        <div className="flex-shrink-0 border-t border-border bg-amber-50 px-6 py-3 max-h-28 overflow-y-auto">
          <p className="text-xs font-semibold text-amber-800 mb-1">Speaker Notes</p>
          <p className="text-sm text-amber-900/80">{slide.speaker_notes}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-white flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Previous
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
              style={{
                width: i === currentIndex ? 24 : 8,
                height: 8,
                borderRadius: 99,
                background: i === currentIndex ? tokens.accent : i < currentIndex ? tokens.accentAlpha(0.4) : tokens.mid,
                transition: "all 0.3s",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          disabled={currentIndex === slides.length - 1}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  );
}
