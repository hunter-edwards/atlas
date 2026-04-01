export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          topic_description: string;
          difficulty_level: string | null;
          college_equivalent: string | null;
          estimated_total_hours: number | null;
          weekly_hours_available: number | null;
          sessions_per_week: number | null;
          start_date: string | null;
          end_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          topic_description: string;
          difficulty_level?: string | null;
          college_equivalent?: string | null;
          estimated_total_hours?: number | null;
          weekly_hours_available?: number | null;
          sessions_per_week?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          topic_description?: string;
          difficulty_level?: string | null;
          college_equivalent?: string | null;
          estimated_total_hours?: number | null;
          weekly_hours_available?: number | null;
          sessions_per_week?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      assessments: {
        Row: {
          id: string;
          course_id: string;
          question: string;
          user_answer: string | null;
          order_index: number | null;
        };
        Insert: {
          id?: string;
          course_id: string;
          question: string;
          user_answer?: string | null;
          order_index?: number | null;
        };
        Update: {
          id?: string;
          course_id?: string;
          question?: string;
          user_answer?: string | null;
          order_index?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          order_index: number | null;
          prerequisite_module_id: string | null;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          order_index?: number | null;
          prerequisite_module_id?: string | null;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          order_index?: number | null;
          prerequisite_module_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "modules_prerequisite_module_id_fkey";
            columns: ["prerequisite_module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          course_id: string;
          title: string;
          lesson_type: string;
          scheduled_date: string | null;
          estimated_duration_minutes: number | null;
          status: string;
          completed_at: string | null;
          order_index: number | null;
        };
        Insert: {
          id?: string;
          module_id: string;
          course_id: string;
          title: string;
          lesson_type?: string;
          scheduled_date?: string | null;
          estimated_duration_minutes?: number | null;
          status?: string;
          completed_at?: string | null;
          order_index?: number | null;
        };
        Update: {
          id?: string;
          module_id?: string;
          course_id?: string;
          title?: string;
          lesson_type?: string;
          scheduled_date?: string | null;
          estimated_duration_minutes?: number | null;
          status?: string;
          completed_at?: string | null;
          order_index?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      slides: {
        Row: {
          id: string;
          lesson_id: string;
          title: string | null;
          body: string;
          speaker_notes: string | null;
          visual_hint: string | null;
          order_index: number | null;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          title?: string | null;
          body: string;
          speaker_notes?: string | null;
          visual_hint?: string | null;
          order_index?: number | null;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          title?: string | null;
          body?: string;
          speaker_notes?: string | null;
          visual_hint?: string | null;
          order_index?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "slides_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      quizzes: {
        Row: {
          id: string;
          course_id: string;
          module_id: string | null;
          lesson_id: string | null;
          title: string | null;
          quiz_type: string;
          scheduled_date: string | null;
          status: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          module_id?: string | null;
          lesson_id?: string | null;
          title?: string | null;
          quiz_type?: string;
          scheduled_date?: string | null;
          status?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          module_id?: string | null;
          lesson_id?: string | null;
          title?: string | null;
          quiz_type?: string;
          scheduled_date?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quizzes_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          question: string;
          question_type: string;
          options: Json | null;
          correct_answer: string | null;
          explanation: string | null;
          order_index: number | null;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          question: string;
          question_type?: string;
          options?: Json | null;
          correct_answer?: string | null;
          explanation?: string | null;
          order_index?: number | null;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          question?: string;
          question_type?: string;
          options?: Json | null;
          correct_answer?: string | null;
          explanation?: string | null;
          order_index?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_responses: {
        Row: {
          id: string;
          quiz_id: string;
          question_id: string;
          user_answer: string | null;
          is_correct: boolean | null;
          answered_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          question_id: string;
          user_answer?: string | null;
          is_correct?: boolean | null;
          answered_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          question_id?: string;
          user_answer?: string | null;
          is_correct?: boolean | null;
          answered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_responses_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_responses_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      sources: {
        Row: {
          id: string;
          course_id: string;
          url: string | null;
          title: string | null;
          domain: string | null;
          relevance_note: string | null;
          accessed_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          url?: string | null;
          title?: string | null;
          domain?: string | null;
          relevance_note?: string | null;
          accessed_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          url?: string | null;
          title?: string | null;
          domain?: string | null;
          relevance_note?: string | null;
          accessed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sources_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
