"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { createClient } from "@/lib/supabase/client";
import type { Lesson, Quiz } from "@/lib/types";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    type: "lesson" | "quiz";
    status: string;
  };
}

export default function CourseCalendarPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [lessonsRes, quizzesRes] = await Promise.all([
        supabase
          .from("lessons")
          .select("*")
          .eq("course_id", courseId)
          .order("scheduled_date"),
        supabase
          .from("quizzes")
          .select("*")
          .eq("course_id", courseId)
          .order("scheduled_date"),
      ]);

      const lessonEvents: CalendarEvent[] = (lessonsRes.data || [])
        .filter((l: Lesson) => l.scheduled_date)
        .map((l: Lesson) => ({
          id: l.id,
          title: l.title,
          date: l.scheduled_date!,
          backgroundColor:
            l.status === "completed" ? "#22c55e" : "#3b82f6",
          borderColor:
            l.status === "completed" ? "#16a34a" : "#2563eb",
          extendedProps: { type: "lesson" as const, status: l.status },
        }));

      const quizEvents: CalendarEvent[] = (quizzesRes.data || [])
        .filter((q: Quiz) => q.scheduled_date)
        .map((q: Quiz) => ({
          id: q.id,
          title: q.title || "Quiz",
          date: q.scheduled_date!,
          backgroundColor:
            q.status === "completed" ? "#22c55e" : "#f59e0b",
          borderColor:
            q.status === "completed" ? "#16a34a" : "#d97706",
          extendedProps: { type: "quiz" as const, status: q.status },
        }));

      setEvents([...lessonEvents, ...quizEvents]);
    }

    load();
  }, [courseId]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEventClick(info: any) {
    const { id, extendedProps } = info.event;
    if (extendedProps.type === "lesson") {
      router.push(`/course/${courseId}/lesson/${id}`);
    } else {
      router.push(`/course/${courseId}/quiz/${id}`);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Course Calendar</h1>
      <div className="bg-card border border-border rounded-lg p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          events={events}
          eventClick={handleEventClick}
          height="auto"
        />
      </div>
      {/* Legend */}
      <div className="flex gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#3b82f6]" />
          Lesson
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
          Quiz
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
          Completed
        </div>
      </div>
    </div>
  );
}
