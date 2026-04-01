// Re-export database types for convenience
export type { Database } from "./database";

// Application-level types derived from the database schema
import type { Database } from "./database";

type Tables = Database["public"]["Tables"];

export type Course = Tables["courses"]["Row"];
export type CourseInsert = Tables["courses"]["Insert"];

export type Assessment = Tables["assessments"]["Row"];
export type AssessmentInsert = Tables["assessments"]["Insert"];

export type Module = Tables["modules"]["Row"];
export type ModuleInsert = Tables["modules"]["Insert"];

export type Lesson = Tables["lessons"]["Row"];
export type LessonInsert = Tables["lessons"]["Insert"];

export type Slide = Tables["slides"]["Row"];
export type SlideInsert = Tables["slides"]["Insert"];

export type Quiz = Tables["quizzes"]["Row"];
export type QuizInsert = Tables["quizzes"]["Insert"];

export type QuizQuestion = Tables["quiz_questions"]["Row"];
export type QuizQuestionInsert = Tables["quiz_questions"]["Insert"];

export type QuizResponse = Tables["quiz_responses"]["Row"];
export type QuizResponseInsert = Tables["quiz_responses"]["Insert"];

export type Source = Tables["sources"]["Row"];
export type SourceInsert = Tables["sources"]["Insert"];

// Agent-specific types
export interface AssessmentSummary {
  knowledge_level: "beginner" | "novice" | "intermediate" | "advanced";
  known_concepts: string[];
  gaps_identified: string[];
  recommended_starting_point: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type DifficultyLevel =
  | "100-level"
  | "200-level"
  | "300-level"
  | "400-level"
  | "graduate";

export interface CourseConfig {
  difficulty: DifficultyLevel;
  weeklyHours: number;
  sessionsPerWeek: number;
  startDate: string;
}

export type CourseStatus = "draft" | "active" | "completed";
export type LessonStatus = "pending" | "in_progress" | "completed";
export type QuizType = "lesson_check" | "module_exam" | "final_exam";
