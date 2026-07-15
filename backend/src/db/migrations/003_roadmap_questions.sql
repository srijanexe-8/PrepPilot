-- Migration 003: rebuild roadmaps + questions tables, keyed to user_id directly
-- Drops the old profile-dependent tables (unused/empty) and recreates them cleanly.
-- Run via: npm run migrate:roadmap

-- Drop old tables (cascade handles any orphaned FK rows)
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS roadmaps CASCADE;

-- ─── roadmaps ─────────────────────────────────────────────────────────────────
-- One roadmap per user (UNIQUE on user_id). No profiles dependency.
CREATE TABLE IF NOT EXISTS roadmaps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topics         JSONB NOT NULL DEFAULT '[]',
  interview_date DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON roadmaps(user_id);

-- ─── questions ────────────────────────────────────────────────────────────────
-- 15 rows per roadmap. Deleted and re-inserted on each new analysis.
CREATE TABLE IF NOT EXISTS questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id     UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  day_number     INT NOT NULL,
  topic          TEXT NOT NULL,
  question_text  TEXT NOT NULL,
  learning_goal  TEXT,
  difficulty     TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  focus_skill    TEXT,
  sent_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_questions_roadmap_id ON questions(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_questions_day_number ON questions(roadmap_id, day_number);
