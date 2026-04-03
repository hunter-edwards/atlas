"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Course, Module, Lesson, Source, Quiz } from "@/lib/types";

interface StudyGuide {
  type: string;
  courseTitle: string;
  executiveSummary: string;
  modules: { title: string; keyConcepts: string[]; summary: string }[];
  glossary: { term: string; definition: string }[];
  topTenList: string[];
  practiceQuestions: {
    question: string;
    difficulty: string;
    answer: string;
  }[];
}

interface ModuleSummary {
  type: string;
  moduleTitle: string;
  overview: string;
  concepts: { name: string; description: string }[];
  relationships: string[];
  misconceptions: string[];
  reviewQuestions: string[];
}

export default function CourseOverviewPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<(Module & { lessons: Lesson[] })[]>(
    []
  );
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [moduleSummaries, setModuleSummaries] = useState<Record<string, ModuleSummary>>({});
  const [generatingGuide, setGeneratingGuide] = useState(false);
  const [generatingModSummary, setGeneratingModSummary] = useState<string | null>(null);
  const [showStudyGuide, setShowStudyGuide] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [courseRes, modulesRes, lessonsRes, quizzesRes, sourcesRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase
          .from("modules")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index"),
        supabase
          .from("lessons")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index"),
        supabase
          .from("quizzes")
          .select("*")
          .eq("course_id", courseId),
        supabase
          .from("sources")
          .select("*")
          .eq("course_id", courseId)
          .order("accessed_at"),
      ]);

      if (courseRes.data) setCourse(courseRes.data);
      if (modulesRes.data && lessonsRes.data) {
        const modulesWithLessons = modulesRes.data.map((mod) => ({
          ...mod,
          lessons: lessonsRes.data.filter((l) => l.module_id === mod.id),
        }));
        setModules(modulesWithLessons);
        // Expand first module by default
        if (modulesRes.data.length > 0) {
          setExpandedModules(new Set([modulesRes.data[0].id]));
        }
      }
      if (quizzesRes.data) setQuizzes(quizzesRes.data);
      if (sourcesRes.data) setSources(sourcesRes.data);
    }

    load();
  }, [courseId]);

  function toggleModule(id: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generateStudyGuide() {
    setGeneratingGuide(true);
    try {
      const res = await fetch("/api/agent/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "study_guide", courseId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setStudyGuide(data.summary);
          setShowStudyGuide(true);
        }
      }
    } catch {
      // silently fail
    }
    setGeneratingGuide(false);
  }

  async function generateModuleSummary(moduleId: string) {
    setGeneratingModSummary(moduleId);
    try {
      const res = await fetch("/api/agent/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "module_summary", courseId, moduleId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setModuleSummaries((prev) => ({ ...prev, [moduleId]: data.summary }));
        }
      }
    } catch {
      // silently fail
    }
    setGeneratingModSummary(null);
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
        <p className="text-muted-foreground">{course.topic_description}</p>
        <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
          {course.difficulty_level && (
            <span className="rounded-full border border-border px-3 py-1">
              {course.difficulty_level}
            </span>
          )}
          {course.estimated_total_hours && (
            <span className="rounded-full border border-border px-3 py-1">
              ~{course.estimated_total_hours} hours
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mb-8">
        <Link
          href={`/course/${courseId}/calendar`}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          View Calendar
        </Link>
        <button
          onClick={() =>
            studyGuide ? setShowStudyGuide(!showStudyGuide) : generateStudyGuide()
          }
          disabled={generatingGuide}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {generatingGuide
            ? "Generating Study Guide..."
            : studyGuide
              ? showStudyGuide
                ? "Hide Study Guide"
                : "Show Study Guide"
              : "Generate Study Guide"}
        </button>
      </div>

      {/* Module tree */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">Curriculum Outline</h2>
        <div className="space-y-2">
          {modules.map((mod, i) => (
            <div key={mod.id} className="border border-border rounded-md">
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium">
                  Module {i + 1}: {mod.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {mod.lessons.length} lessons
                </span>
              </button>
              {expandedModules.has(mod.id) && (
                <div className="border-t border-border px-4 py-2 space-y-1">
                  {mod.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {mod.description}
                    </p>
                  )}
                  {mod.lessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={`/course/${courseId}/lesson/${lesson.id}`}
                      className="flex items-center justify-between py-1.5 text-sm hover:text-accent transition-colors"
                    >
                      <span>{lesson.title}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          lesson.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : lesson.status === "in_progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {lesson.status}
                      </span>
                    </Link>
                  ))}
                  {/* Module quiz link */}
                  {quizzes
                    .filter((q) => q.module_id === mod.id)
                    .map((quiz) => (
                      <Link
                        key={quiz.id}
                        href={`/course/${courseId}/quiz/${quiz.id}`}
                        className="flex items-center justify-between py-1.5 text-sm hover:text-accent transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                            <path d="M9 11l3 3L22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                          {quiz.title || "Module Exam"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            quiz.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {quiz.status === "completed" ? "completed" : "quiz"}
                        </span>
                      </Link>
                    ))}
                  <button
                    onClick={() => generateModuleSummary(mod.id)}
                    disabled={generatingModSummary === mod.id}
                    className="text-xs text-accent hover:underline mt-2 disabled:opacity-50"
                  >
                    {generatingModSummary === mod.id
                      ? "Generating summary..."
                      : moduleSummaries[mod.id]
                        ? "Refresh summary"
                        : "Generate module summary"}
                  </button>
                  {moduleSummaries[mod.id] && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-md space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {moduleSummaries[mod.id].overview}
                      </p>
                      {moduleSummaries[mod.id].concepts.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-1">Key Concepts</p>
                          <div className="flex flex-wrap gap-1">
                            {moduleSummaries[mod.id].concepts.map((c, ci) => (
                              <span
                                key={ci}
                                className="text-xs bg-card border border-border rounded px-2 py-0.5"
                                title={c.description}
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {moduleSummaries[mod.id].reviewQuestions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-1">Review Questions</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {moduleSummaries[mod.id].reviewQuestions.map((q, qi) => (
                              <li key={qi} className="text-xs text-muted-foreground">{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Final exam link */}
        {quizzes
          .filter((q) => q.quiz_type === "final_exam" && !q.module_id)
          .map((quiz) => (
            <Link
              key={quiz.id}
              href={`/course/${courseId}/quiz/${quiz.id}`}
              className="flex items-center justify-between mt-3 border border-amber-200 bg-amber-50 rounded-md px-4 py-3 text-sm font-medium hover:bg-amber-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                {quiz.title || "Final Exam"}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  quiz.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {quiz.status === "completed" ? "completed" : "final exam"}
              </span>
            </Link>
          ))}
      </section>

      {/* Study Guide */}
      {showStudyGuide && studyGuide && (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Study Guide</h2>

          <div className="border border-border rounded-md p-6 mb-4 bg-card">
            <p className="text-sm text-muted-foreground mb-4">
              {studyGuide.executiveSummary}
            </p>

            {/* Top 10 */}
            {studyGuide.topTenList?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-2">Top Things to Remember</h3>
                <ol className="list-decimal list-inside space-y-1">
                  {studyGuide.topTenList.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Module summaries */}
            {studyGuide.modules?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-2">Module Overview</h3>
                <div className="space-y-3">
                  {studyGuide.modules.map((m, i) => (
                    <div key={i} className="border border-border rounded p-3">
                      <p className="text-sm font-medium mb-1">{m.title}</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {m.summary}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {m.keyConcepts.map((c, ci) => (
                          <span
                            key={ci}
                            className="text-xs bg-muted rounded px-2 py-0.5"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Glossary */}
            {studyGuide.glossary?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-2">Glossary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {studyGuide.glossary.map((g, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">{g.term}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {g.definition}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Practice Questions */}
            {studyGuide.practiceQuestions?.length > 0 && (
              <div>
                <h3 className="text-sm font-bold mb-2">Practice Questions</h3>
                <div className="space-y-3">
                  {studyGuide.practiceQuestions.map((pq, i) => (
                    <details key={i} className="border border-border rounded p-3">
                      <summary className="text-sm cursor-pointer">
                        <span className="font-medium">{pq.question}</span>
                        <span
                          className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            pq.difficulty === "easy"
                              ? "bg-green-100 text-green-700"
                              : pq.difficulty === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {pq.difficulty}
                        </span>
                      </summary>
                      <p className="text-sm text-muted-foreground mt-2 pl-4">
                        {pq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Research Sources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="border border-border rounded-md p-4"
              >
                <p className="text-sm font-medium mb-1">
                  {source.title || "Untitled"}
                </p>
                {source.domain && (
                  <span className="inline-block text-xs bg-muted text-muted-foreground rounded px-2 py-0.5 mb-2">
                    {source.domain}
                  </span>
                )}
                {source.relevance_note && (
                  <p className="text-xs text-muted-foreground">
                    {source.relevance_note}
                  </p>
                )}
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline mt-1 block"
                  >
                    View source
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
