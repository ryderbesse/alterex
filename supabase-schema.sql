-- ============================================================
-- Alterex – Complete Supabase Schema
-- Paste this entire block into Supabase → SQL Editor → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type              TEXT        CHECK (user_type IN ('student','teacher')),
  learning_style         TEXT        CHECK (learning_style IN ('visual','auditory','kinesthetic','reading_writing','logical','social')),
  learning_style_scores  JSONB       DEFAULT '{}',
  quiz_completed         BOOLEAN     DEFAULT FALSE,
  disabilities           TEXT[]      DEFAULT '{}',
  accessibility_mode     BOOLEAN     DEFAULT FALSE,
  onboarding_completed   BOOLEAN     DEFAULT FALSE,
  feedback_history       JSONB       DEFAULT '[]',
  created_by             TEXT        NOT NULL,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Teachers need to read all student profiles to show learning-style analytics
CREATE POLICY "profiles_select_authenticated"
  ON user_profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "profiles_insert_own"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

CREATE POLICY "profiles_update_own"
  ON user_profiles FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = created_by);

CREATE POLICY "profiles_delete_own"
  ON user_profiles FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = created_by);

CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON user_profiles (created_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type  ON user_profiles (user_type);


-- ============================================================
-- 2. USER PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_progress (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  total_xp           INTEGER     DEFAULT 0,
  level              INTEGER     DEFAULT 1,
  current_streak     INTEGER     DEFAULT 0,
  longest_streak     INTEGER     DEFAULT 0,
  games_completed    INTEGER     DEFAULT 0,
  last_activity_date TEXT,
  preferences        JSONB       DEFAULT '{}',
  created_by         TEXT        NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_own"
  ON user_progress FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

CREATE INDEX IF NOT EXISTS idx_user_progress_created_by ON user_progress (created_by);


-- ============================================================
-- 3. CLASSES  (student-side class folders)
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT        NOT NULL,
  description           TEXT,
  subject               TEXT,
  color                 TEXT        DEFAULT 'violet',
  background_image      TEXT,
  background_pattern    TEXT,
  grades_enabled        BOOLEAN     DEFAULT FALSE,
  target_grade          INTEGER,
  grade_weights         JSONB,
  shared_from_classroom UUID,          -- references classrooms(id) – soft FK, no CASCADE
  teacher_email         TEXT,
  icon                  TEXT,
  created_by            TEXT        NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes_own"
  ON classes FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

CREATE INDEX IF NOT EXISTS idx_classes_created_by ON classes (created_by);


-- ============================================================
-- 4. DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  class_id          UUID        REFERENCES classes (id) ON DELETE SET NULL,
  file_url          TEXT,
  file_type         TEXT,
  extracted_text    TEXT,
  summary_short     TEXT,
  summary_medium    TEXT,
  summary_detailed  TEXT,
  key_concepts      JSONB       DEFAULT '[]',
  grade             NUMERIC,
  max_grade         NUMERIC,
  due_date          TEXT,
  processing_status TEXT        DEFAULT 'pending',
  created_by        TEXT        NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_own"
  ON documents FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents (created_by);
CREATE INDEX IF NOT EXISTS idx_documents_class_id   ON documents (class_id);


-- ============================================================
-- 5. LEARNING GAMES
-- ============================================================
CREATE TABLE IF NOT EXISTS learning_games (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT    NOT NULL,
  game_type      TEXT    NOT NULL CHECK (game_type IN ('quiz','flashcards','matching','timed_challenge')),
  questions      JSONB   DEFAULT '[]',
  flashcards     JSONB   DEFAULT '[]',
  matching_pairs JSONB   DEFAULT '[]',
  total_xp       INTEGER DEFAULT 100,
  time_limit     INTEGER,
  document_id    UUID    REFERENCES documents     (id) ON DELETE SET NULL,
  class_id       UUID    REFERENCES classes       (id) ON DELETE SET NULL,
  created_by     TEXT    NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE learning_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "games_own"
  ON learning_games FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

CREATE INDEX IF NOT EXISTS idx_learning_games_created_by  ON learning_games (created_by);
CREATE INDEX IF NOT EXISTS idx_learning_games_class_id    ON learning_games (class_id);
CREATE INDEX IF NOT EXISTS idx_learning_games_document_id ON learning_games (document_id);


-- ============================================================
-- 6. GAME SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id            UUID    REFERENCES learning_games (id) ON DELETE SET NULL,
  document_id        UUID    REFERENCES documents      (id) ON DELETE SET NULL,
  class_id           UUID    REFERENCES classes        (id) ON DELETE SET NULL,
  score              INTEGER DEFAULT 0,
  max_score          INTEGER DEFAULT 0,
  xp_earned          INTEGER DEFAULT 0,
  answers            JSONB   DEFAULT '[]',
  concepts_practiced TEXT[]  DEFAULT '{}',
  weak_areas         TEXT[]  DEFAULT '{}',
  created_by         TEXT    NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_own"
  ON game_sessions FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

CREATE INDEX IF NOT EXISTS idx_game_sessions_created_by ON game_sessions (created_by);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id    ON game_sessions (game_id);


-- ============================================================
-- 7. CONCEPT MASTERY
-- ============================================================
CREATE TABLE IF NOT EXISTS concept_mastery (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id           UUID    REFERENCES classes (id) ON DELETE SET NULL,
  concept            TEXT    NOT NULL,
  mastery_percentage INTEGER DEFAULT 0,
  mastery_level      TEXT    DEFAULT 'not_started'
                             CHECK (mastery_level IN ('not_started','learning','practicing','mastered')),
  total_attempts     INTEGER DEFAULT 0,
  correct_attempts   INTEGER DEFAULT 0,
  last_practiced     TIMESTAMPTZ,
  suggested_focus    BOOLEAN DEFAULT FALSE,
  feedback           TEXT,
  created_by         TEXT    NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mastery_own"
  ON concept_mastery FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

CREATE INDEX IF NOT EXISTS idx_concept_mastery_created_by ON concept_mastery (created_by);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_class_id   ON concept_mastery (class_id);


-- ============================================================
-- 8. ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT    NOT NULL,
  description    TEXT,
  class_id       UUID    REFERENCES classes (id) ON DELETE SET NULL,
  due_date       TEXT,
  due_time       TEXT,
  type           TEXT    DEFAULT 'homework',
  status         TEXT    DEFAULT 'not_started'
                         CHECK (status IN ('not_started','in_progress','completed')),
  priority       TEXT    DEFAULT 'medium'
                         CHECK (priority IN ('low','medium','high')),
  estimated_time INTEGER,
  notes          TEXT,
  category       TEXT,
  source         TEXT,   -- 'manual' | 'syllabus' | 'classroom'
  created_by     TEXT    NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_own"
  ON assignments FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

-- NOTE: When a teacher pushes an assignment to every student via
-- TeacherClassDetail, the insert runs with the Supabase service-role key
-- inside a Vercel function (/api/functions/createAssignment).
-- Direct inserts on behalf of other users are intentionally blocked above.

CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments (created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id   ON assignments (class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date   ON assignments (due_date);


-- ============================================================
-- 9. SYNCED ASSIGNMENTS  (Google Classroom imports)
-- ============================================================
CREATE TABLE IF NOT EXISTS synced_assignments (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  google_assignment_id TEXT,
  google_course_id     TEXT,
  class_folder_id      TEXT    DEFAULT 'global',
  title                TEXT    NOT NULL,
  description          TEXT,
  due_date             TEXT,
  due_time             TEXT,
  type                 TEXT    DEFAULT 'homework',
  status               TEXT    DEFAULT 'not_started',
  source               TEXT    DEFAULT 'google_classroom',
  archived             BOOLEAN DEFAULT FALSE,
  sync_active          BOOLEAN DEFAULT TRUE,
  created_by           TEXT    NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE synced_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "synced_assignments_own"
  ON synced_assignments FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

CREATE INDEX IF NOT EXISTS idx_synced_created_by       ON synced_assignments (created_by);
CREATE INDEX IF NOT EXISTS idx_synced_class_folder_id  ON synced_assignments (class_folder_id);


-- ============================================================
-- 10. BADGES
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_type    TEXT    NOT NULL
                        CHECK (badge_type IN ('assignments_completed','longest_streak','most_xp_day','games_played','highest_grade')),
  tier          TEXT    NOT NULL
                        CHECK (tier IN ('bronze','silver','gold','platinum','legendary')),
  value         NUMERIC,
  unlocked_date TIMESTAMPTZ DEFAULT NOW(),
  viewed        BOOLEAN DEFAULT FALSE,
  created_by    TEXT    NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_own"
  ON badges FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

CREATE INDEX IF NOT EXISTS idx_badges_created_by ON badges (created_by);


-- ============================================================
-- 11. DAILY XP
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_xp (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  date       TEXT    NOT NULL,   -- stored as YYYY-MM-DD string
  total_xp   INTEGER DEFAULT 0,
  created_by TEXT    NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_xp_own"
  ON daily_xp FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

CREATE INDEX IF NOT EXISTS idx_daily_xp_created_by ON daily_xp (created_by);
CREATE INDEX IF NOT EXISTS idx_daily_xp_date       ON daily_xp (date);


-- ============================================================
-- 12. CLASSROOMS  (teacher-side classroom management)
-- ============================================================
CREATE TABLE IF NOT EXISTS classrooms (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT    NOT NULL,
  subject            TEXT,
  description        TEXT,
  teacher_email      TEXT    NOT NULL,
  teacher_id         TEXT,
  student_emails     TEXT[]  DEFAULT '{}',
  join_code          TEXT    UNIQUE,
  color              TEXT    DEFAULT 'violet',
  background_image   TEXT,
  background_pattern TEXT,
  grades_enabled     BOOLEAN DEFAULT FALSE,
  target_grade       INTEGER,
  grade_weights      JSONB,
  created_by         TEXT    NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

-- Teachers: full access to their own classrooms
CREATE POLICY "classrooms_own"
  ON classrooms FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

-- Students: read-only access (needed for join-code lookup)
CREATE POLICY "classrooms_read_any"
  ON classrooms FOR SELECT TO authenticated
  USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_classrooms_created_by    ON classrooms (created_by);
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_email ON classrooms (teacher_email);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code     ON classrooms (join_code);


-- ============================================================
-- 13. CLASSROOM ASSIGNMENTS  (teacher-pushed to all students)
-- ============================================================
CREATE TABLE IF NOT EXISTS classroom_assignments (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id   UUID    REFERENCES classrooms (id) ON DELETE CASCADE,
  title          TEXT    NOT NULL,
  description    TEXT,
  due_date       TEXT,
  due_time       TEXT,
  type           TEXT    DEFAULT 'homework',
  estimated_time INTEGER,
  created_by     TEXT    NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE classroom_assignments ENABLE ROW LEVEL SECURITY;

-- Teachers manage their own classroom assignments
CREATE POLICY "classroom_assignments_own"
  ON classroom_assignments FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

-- Students read all classroom assignments (to see what their teacher posted)
CREATE POLICY "classroom_assignments_read_any"
  ON classroom_assignments FOR SELECT TO authenticated
  USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_classroom_assignments_classroom_id ON classroom_assignments (classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_created_by   ON classroom_assignments (created_by);


-- ============================================================
-- 14. GOOGLE CLASSROOM CONNECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS google_classroom_connections (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  class_folder_id         TEXT    DEFAULT 'global',
  access_token_encrypted  TEXT,
  refresh_token_encrypted TEXT,
  token_expiry            TIMESTAMPTZ,
  google_course_id        TEXT,
  google_course_name      TEXT,
  sync_active             BOOLEAN DEFAULT TRUE,
  last_synced_at          TIMESTAMPTZ,
  created_by              TEXT    NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE google_classroom_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gc_connections_own"
  ON google_classroom_connections FOR ALL TO authenticated
  USING      ((auth.jwt() ->> 'email') = created_by)
  WITH CHECK ((auth.jwt() ->> 'email') = created_by);

CREATE INDEX IF NOT EXISTS idx_gc_connections_created_by ON google_classroom_connections (created_by);


-- ============================================================
-- STORAGE BUCKET  (for DocumentUploader → Supabase Storage)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_authenticated_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "storage_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'documents');

CREATE POLICY "storage_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');
