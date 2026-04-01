"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Course, Module, Lesson, Source } from "@/lib/types";

export default function CourseOverviewPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<(Module & { lessons: Lesson[] })[]>(
    []
  );
  const [sources, setSources] = useState<Source[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [courseRes, modulesRes, lessonsRes, sourcesRes] = await Promise.all([
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
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

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
