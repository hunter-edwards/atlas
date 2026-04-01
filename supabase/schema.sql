-- Atlas Curriculum Platform — Database Schema
-- Run this in the Supabase SQL editor to set up the database

-- Core course record
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  topic_description TEXT NOT NULL,
  difficulty_level TEXT,
  college_equivalent TEXT,
  estimated_total_hours INT,
  weekly_hours_available INT,
  sessions_per_week INT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assessment Q&A during onboarding
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  user_answer TEXT,
  order_index INT
);

-- High-level curriculum outline
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT,
  prerequisite_module_id UUID REFERENCES modules(id)
);

-- Individual lessons
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lesson_type TEXT DEFAULT 'slides',
  scheduled_date DATE,
  estimated_duration_minutes INT,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  order_index INT
);

-- Slide content
CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT NOT NULL,
  speaker_notes TEXT,
  visual_hint TEXT,
  order_index INT
);

-- Quizzes
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id),
  lesson_id UUID REFERENCES lessons(id),
  title TEXT,
  quiz_type TEXT DEFAULT 'lesson_check',
  scheduled_date DATE,
  status TEXT DEFAULT 'pending'
);

-- Quiz questions
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT,
  explanation TEXT,
  order_index INT
);

-- Quiz responses
CREATE TABLE quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  question_id UUID REFERENCES quiz_questions(id),
  user_answer TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ DEFAULT now()
);

-- Research sources
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  url TEXT,
  title TEXT,
  domain TEXT,
  relevance_note TEXT,
  accessed_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- RLS policies — users can only access their own data
CREATE POLICY "Users can CRUD own courses" ON courses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own assessments" ON assessments
  FOR ALL USING (course_id IN (SELECT id FROM courses WHERE user_id = auth.uid()));

CREATE POLICY "Users can access own modules" ON modules
  FOR ALL USING (course_id IN (SELECT id FROM courses WHERE user_id = auth.uid()));

CREATE POLICY "Users can access own lessons" ON lessons
  FOR ALL USING (course_id IN (SELECT id FROM courses WHERE user_id = auth.uid()));

CREATE POLICY "Users can access own slides" ON slides
  FOR ALL USING (lesson_id IN (
    SELECT id FROM lessons WHERE course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can access own quizzes" ON quizzes
  FOR ALL USING (course_id IN (SELECT id FROM courses WHERE user_id = auth.uid()));

CREATE POLICY "Users can access own quiz questions" ON quiz_questions
  FOR ALL USING (quiz_id IN (
    SELECT id FROM quizzes WHERE course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can access own quiz responses" ON quiz_responses
  FOR ALL USING (quiz_id IN (
    SELECT id FROM quizzes WHERE course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can access own sources" ON sources
  FOR ALL USING (course_id IN (SELECT id FROM courses WHERE user_id = auth.uid()));
