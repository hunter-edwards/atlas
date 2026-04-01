"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Course } from "@/lib/types";

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("courses")
          .select("*")
          .order("created_at", { ascending: false });
        setCourses(data || []);
      } catch {
        // If Supabase isn't configured, show empty state
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold">Your Courses</h1>
          <p className="text-muted-foreground mt-1">
            Pick up where you left off or start something new.
          </p>
        </div>
        <Link
          href="/onboarding/describe"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          New Course
        </Link>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No courses yet. Start by describing what you want to learn.
          </p>
          <Link
            href="/onboarding/describe"
            className="text-sm font-medium text-accent hover:underline"
          >
            Create your first course
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => {
            const statusColor =
              course.status === "active"
                ? "bg-blue-100 text-blue-700"
                : course.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground";

            return (
              <Link
                key={course.id}
                href={`/course/${course.id}/overview`}
                className="block rounded-lg border border-border bg-card p-6 hover:border-muted-foreground/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">
                      {course.title}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.topic_description}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-4 ${statusColor}`}
                  >
                    {course.status}
                  </span>
                </div>
                <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                  {course.difficulty_level && (
                    <span>{course.difficulty_level}</span>
                  )}
                  {course.estimated_total_hours && (
                    <span>~{course.estimated_total_hours} hours</span>
                  )}
                  {course.sessions_per_week && (
                    <span>{course.sessions_per_week}x/week</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
