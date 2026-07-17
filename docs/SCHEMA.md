# PrepPilot — Database Schema

> **Status:** Reflects the live schema as of 17 July 2026 — `schema.sql` plus migrations 001–009.

## How the schema is built

The live schema is **not** `src/db/schema.sql` alone. That file bootstraps the database; nine ordered migrations in `src/db/migrations/` then reshape it. Migration 003 in particular drops and rebuilds `roadmaps` and `questions`, so `schema.sql`'s versions of those tables are historical.

Run in order, each via its own npm script from `backend/`:

```bash
npm run migrate                    # schema.sql bootstrap
npm run migrate:upload             # 001_user_documents.sql
tsx src/db/run-migration.ts 002_analysis_report.sql
npm run migrate:roadmap            # 003_roadmap_questions.sql
npm run migrate:name               # 004_add_user_name.sql
npm run migrate:responses          # 005_responses_practice.sql
npm run migrate:day-status         # 006_roadmap_day_status.sql
npm run migrate:practice-answers   # 007_practice_answers.sql
npm run migrate:notifications      # 008_notifications.sql
npm run migrate:roadmap-link       # 009_roadmap_analysis_link.sql
```

> Migration 002 has no npm alias; invoke `run-migration.ts` directly.

All primary keys are UUIDs (`gen_random_uuid()` via `pgcrypto`). Timestamps use `TIMESTAMPTZ`.

---

## Entity Relationship Overview

```
users
 │
 ├──► user_documents        (1:1 — resume, JD, analysis report)
 │
 ├──► roadmaps              (1:1 — UNIQUE on user_id)
 │     │
 │     └──► questions       (1 row per day: content + status + practice set)
 │           │
 │           ├──► responses         (per-day answer → drives readiness score)
 │           └──► practice_answers  (per-practice-question answer → AI scored)
 │
 ├──► responses             (also keyed directly to user_id and roadmap_id)
 ├──► practice_answers      (also keyed directly to user_id)
 └──► notifications         (in-app feed)
```

`questions` is the **per-day roadmap table** — one row per day of the plan, not one row per question asked. Its name predates that role.

---

## Tables

### `users`
**Why it exists:** Core identity record. Stores credentials and the WhatsApp number that outbound messaging is keyed to.

```sql
CREATE TABLE users (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  TEXT UNIQUE NOT NULL,
  password_hash          TEXT NOT NULL,
  whatsapp_number        TEXT,                  -- E.164, e.g. "+919876543210"
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  has_uploaded_documents BOOLEAN DEFAULT FALSE, -- migration 001
  name                   TEXT                   -- migration 004
);
```

`whatsapp_number` is stored bare (E.164, validated `^\+[1-9]\d{6,14}$` in `routes/profile.ts`); the `whatsapp:` prefix Twilio needs is added at send time by `sender.ts`.

---

### `user_documents`  *(migration 001, 002, 009)*
**Why it exists:** Holds the parsed resume and JD plus the full analysis report from the Python pipeline. **One row per user** — re-uploading overwrites.

```sql
CREATE TABLE user_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parsed_resume   JSONB,
  parsed_jd       JSONB,
  analysis_report JSONB,   -- migration 002: the complete /parse response
  uploaded_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_documents_user_id_unique UNIQUE (user_id)  -- migration 009
);

CREATE INDEX idx_user_documents_user_id ON user_documents(user_id);
```

**Why the UNIQUE matters (migration 009):** the live dev DB had it, but no migration created it. On a DB built from migrations alone, upload's `INSERT … ON CONFLICT` had no constraint to conflict against, so every upload inserted a duplicate and `ORDER BY uploaded_at DESC LIMIT 1` became nondeterministic. 009 collapses duplicates onto the newest row, then adds the constraint.

**`uploaded_at` is the analysis's identity.** `roadmaps.analysis_uploaded_at` mirrors it to prove a plan belongs to a given analysis. `upload.ts` reads it back as raw Postgres text (`uploaded_at::text`) — a JS `Date` truncates `timestamptz` microseconds, which would make the stamp differ from its source and flag every roadmap stale.

---

### `roadmaps`  *(rebuilt in migration 003, extended in 009)*
**Why it exists:** The user's prep plan. **One per user** (`UNIQUE(user_id)`), upserted on regeneration.

```sql
CREATE TABLE roadmaps (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topics               JSONB NOT NULL DEFAULT '[]',
  interview_date       DATE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  analysis_uploaded_at TIMESTAMPTZ,   -- migration 009
  UNIQUE(user_id)
);

CREATE INDEX idx_roadmaps_user_id ON roadmaps(user_id);
```

**Keyed to `user_id`, not `profile_id`.** Migration 003 dropped the original profile-dependent tables (unused and empty) and rebuilt them against `users` directly.

**`analysis_uploaded_at`** mirrors `user_documents.uploaded_at` of the analysis this plan was built from. A roadmap is **stale** when the two don't match — surfaced as `is_stale` by `GET /api/roadmap`. Before this column existed, a roadmap left behind by a failed regeneration was indistinguishable from a current one. 009 backfills it only where a roadmap was created at or after the analysis on file (which `upload.ts`'s ordering guarantees was built from it); anything unattributable stays NULL and reads as stale — the safe default.

**`topics`** duplicates the generated plan as JSONB. The `questions` rows are what the app actually reads; `topics` is a snapshot.

---

### `questions`  *(rebuilt in 003, extended in 006)*
**Why it exists:** One row per **day** of the roadmap. Carries the day's content, its lock state, and its generated practice set. Deleted and re-inserted wholesale on each regeneration.

```sql
CREATE TABLE questions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id         UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  day_number         INT NOT NULL,
  topic              TEXT NOT NULL,
  question_text      TEXT NOT NULL,
  learning_goal      TEXT,
  difficulty         TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  focus_skill        TEXT,
  sent_at            TIMESTAMPTZ,                        -- WhatsApp send-once guard
  status             VARCHAR(20) NOT NULL DEFAULT 'locked',  -- migration 006
  resources          JSONB NOT NULL DEFAULT '[]',            -- migration 006
  practice_questions JSONB NOT NULL DEFAULT '[]',            -- migration 006
  completed_at       TIMESTAMPTZ                             -- migration 006
);

CREATE INDEX idx_questions_roadmap_id ON questions(roadmap_id);
CREATE INDEX idx_questions_day_number ON questions(roadmap_id, day_number);
CREATE INDEX idx_questions_status     ON questions(roadmap_id, status);
```

**`status`** is `'locked' | 'today' | 'completed'`. Exactly one day per roadmap is `'today'`; completing it flips it to `'completed'` and promotes the next `'locked'` day, in one transaction. Note the column is a plain `VARCHAR(20)` with no CHECK — the value set is enforced only in application code. Migration 006's backfill also references a `'up_next'` status that the app no longer produces.

**`sent_at`** doubles as the WhatsApp send-once guard: `prepareAndSendDay` only proceeds when it `IS NULL`, and stamps it on success. A failed send leaves it NULL so the day can be retried.

**`resources` / `practice_questions`** are generated by Gemini on first access (roadmap modal open, or eagerly at WhatsApp send time) and persisted, so the AI is not re-hit on every open. Shapes are in [JSONB Field Shapes](#jsonb-field-shapes).

---

### `responses`  *(rebuilt in migration 005)*
**Why it exists:** One per-day answer, submitted from the **dashboard**. This is what drives the readiness score, streak, and session counts.

```sql
CREATE TABLE responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  roadmap_id   UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  answer_text  TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  score        INT CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX idx_responses_user_id      ON responses(user_id);
CREATE INDEX idx_responses_question_id  ON responses(question_id);
CREATE INDEX idx_responses_roadmap_id   ON responses(roadmap_id);
CREATE INDEX idx_responses_submitted_at ON responses(user_id, submitted_at);
```

Migration 005 dropped `schema.sql`'s original `responses` (never populated) and rebuilt it. The AI-evaluation columns from the original design — `strengths`, `gaps`, `recommended_topic` — are **gone**; that role moved to `practice_answers.ai_feedback`.

**`score` is currently always NULL.** `POST /api/dashboard/practice-answer` stores the answer without scoring it. The dashboard therefore counts responses rather than averaging their scores:

```
readiness_score = min(100, analysis_report.weighted_score + 2 × response_count)
```

---

### `practice_answers`  *(migration 007)*
**Why it exists:** One row per answer to an individual **practice question** inside a day's `practice_questions` JSONB. AI-scored 0–10 with written feedback. Kept separate from `responses` so the per-day and per-question concerns don't collide.

```sql
CREATE TABLE practice_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_id      UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,                      -- id inside practice_questions JSONB (no FK)
  answer_text TEXT NOT NULL,
  source      VARCHAR(20) NOT NULL DEFAULT 'web', -- 'web' | 'whatsapp'
  ai_score    INT CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 10)),
  ai_feedback TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_practice_answers_user_id  ON practice_answers(user_id);
CREATE INDEX idx_practice_answers_day_id   ON practice_answers(day_id);
CREATE INDEX idx_practice_answers_question ON practice_answers(user_id, question_id);
```

**`question_id` is TEXT with no FK** — it points at a JSONB item's `id`, not a table row. `day_id` is the FK to the roadmap day.

**`source`** is always `'web'` today. The `'whatsapp'` value is reserved for an inbound path that doesn't exist yet.

⚠️ **These answers do not affect the readiness score.** Only `responses` rows do. A user practising entirely through the roadmap modal will see their score stay flat.

---

### `notifications`  *(migration 008)*
**Why it exists:** The in-app feed behind the header bell. Rows are written at the point each real event happens, not by a polling job.

```sql
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(30) NOT NULL,
  message    TEXT NOT NULL,
  related_id TEXT,                   -- day id, answer id, etc. (no FK — source-agnostic)
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread       ON notifications(user_id) WHERE is_read = FALSE;
```

`type` values in use: `'answer_scored'`, `'day_unlocked'`, `'whatsapp'` (send success/failure). `'streak'` is reserved and unused. The unread index is partial — it only covers the rows the badge count query actually scans.

---

## Legacy tables — defined but unused

Both are still created by `schema.sql` and referenced by **no application code**. They are safe to drop.

### `profiles`
Superseded by `user_documents`. The original design had `users → profiles → roadmaps`; migration 003 removed the middle hop and keyed roadmaps to `user_id` directly. `parsed_skills` / `flagged_fields` became `user_documents.analysis_report`.

### `messages`
An append-only WhatsApp message log, from the design in which inbound replies were received and stored. Nothing reads or writes it — outbound sends are logged to stdout only, and there is no inbound path. Its two enums (`message_direction`, `message_type`) are likewise unused.

---

## Relationship Summary

| Parent | Child | Relationship | On Delete |
|---|---|---|---|
| `users` | `user_documents` | One-to-one | Cascade |
| `users` | `roadmaps` | One-to-one | Cascade |
| `roadmaps` | `questions` | One-to-many (one per day) | Cascade |
| `questions` | `responses` | One-to-many | Cascade |
| `questions` | `practice_answers` | One-to-many (via `day_id`) | Cascade |
| `users` | `responses` / `practice_answers` / `notifications` | One-to-many | Cascade |

Every table cascades from `users`, which is what lets `DELETE /profile` remove an account with a single `DELETE FROM users`.

---

## JSONB Field Shapes

### `user_documents.analysis_report`
The complete `POST :8001/parse` response. Top-level keys:

```json
{
  "resume": { "name": "…", "summary": "…", "skills": [], "experience": [], "education": [] },
  "jd": { "role_title": "Senior Backend Engineer", "requirements": [] },
  "narrative_summary": "…",
  "skills": {
    "score": 72,
    "reasoning": "…",
    "requirement_matches": [
      { "requirement": "Kubernetes", "strength": "weak", "evidence": "…" }
    ],
    "matched": [], "partial": [], "missing": []
  },
  "experience": { "score": 80, "reasoning": "…" },
  "education": { "score": 65, "reasoning": "…", "meets_requirement": true },
  "culture":   { "overall_score": 70, "reasoning": "…" },
  "weighted_score": 73.5,
  "decision": { "recommendation": "…", "overall_score": 73.5, "confidence": 82 },
  "interview_questions": { "technical": [], "behavioral": [], "cultural": [] }
}
```

`skills.requirement_matches` is the current evidence-based shape; `strength` is `'strong' | 'partial' | 'weak' | 'none'` and the dashboard maps it to a confidence percent (90 / 55 / 25 / 10). The flat `matched` / `partial` / `missing` arrays are the legacy shape, still read as a fallback for older analyses.

`decision.confidence` is converted from the agent's 0–1 float to a 0–100 int before returning.

### `roadmaps.topics`
Snapshot of the generated plan — the same objects inserted as `questions` rows.

```json
[
  {
    "day_number": 1,
    "topic": "Kubernetes Fundamentals",
    "question_text": "Explain the difference between a Deployment and a StatefulSet.",
    "learning_goal": "Explain pods, deployments, and services",
    "difficulty": "medium",
    "focus_skill": "Kubernetes"
  }
]
```

### `questions.resources`
```json
[{ "title": "Kubernetes Docs — Deployments", "url": "https://…" }]
```

### `questions.practice_questions`
```json
[{ "id": "b1f2…", "text": "Walk through a rolling update.", "difficulty": "medium" }]
```

`id` is a `randomUUID()` string generated by `practiceContent.ts`. It is what `practice_answers.question_id` stores.
