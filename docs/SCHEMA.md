# PrepPilot — Database Schema

## Entity Relationship Overview

```
users
 │
 ├──► profiles ──► roadmaps ──► questions ──► responses
 │
 └──► messages
```

All primary keys are UUIDs. Foreign key relationships enforce referential integrity. Timestamps use `TIMESTAMPTZ` (timezone-aware) to support users and servers in different timezones.

---

## Tables

### `users`
**Why it exists:** Core identity record. Stores credentials and the WhatsApp number that the entire coaching loop is keyed to.

```sql
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  whatsapp_number  TEXT,                        -- e.g. "whatsapp:+919876543210"
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `profiles`
**Why it exists:** Captures the raw resume and JD text at upload time, plus the Claude-parsed structured output (skills, gaps). Decoupled from `users` so a user can upload multiple profile versions over time.

```sql
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_raw_text TEXT,
  jd_raw_text     TEXT,
  parsed_skills   JSONB,    -- { "user_skills": [...], "jd_skills": [...], "gap_skills": [...] }
  flagged_fields  JSONB,    -- { "missing_sections": [...], "weak_areas": [...] }
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

---

### `roadmaps`
**Why it exists:** Holds the day-by-day topic plan generated from a profile's gap analysis. Storing `topics` as JSONB lets Claude return a variable-length ordered list without requiring a separate `roadmap_topics` join table.

```sql
CREATE TABLE roadmaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topics          JSONB NOT NULL,  -- [ { "day": 1, "topic": "...", "goal": "..." }, ... ]
  interview_date  DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roadmaps_profile_id ON roadmaps(profile_id);
```

---

### `questions`
**Why it exists:** One record per question sent to the user. Tracks which roadmap it belongs to, what day it was sent, and the learning goal it targets — enabling gap tracking over time.

```sql
CREATE TABLE questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id    UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  topic         TEXT NOT NULL,
  question_text TEXT NOT NULL,
  learning_goal TEXT,
  sent_at       TIMESTAMPTZ,
  day_number    INT NOT NULL
);

CREATE INDEX idx_questions_roadmap_id ON questions(roadmap_id);
```

---

### `responses`
**Why it exists:** Stores the user's raw answer alongside Claude's evaluation. The `score`, `strengths`, `gaps`, and `recommended_topic` fields are the output of the AI evaluation pass and feed directly into the dashboard readiness score.

```sql
CREATE TABLE responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id         UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text         TEXT NOT NULL,
  score               INT CHECK (score BETWEEN 0 AND 100),
  strengths           TEXT,
  gaps                TEXT,
  recommended_topic   TEXT,
  answered_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_responses_question_id ON responses(question_id);
```

---

### `messages`
**Why it exists:** Append-only log of every WhatsApp message sent and received. Used for debugging, replaying the conversation, and displaying the message history UI if needed. Kept separate from `responses` to capture non-answer messages (nudges, reports, opt-in confirmations).

```sql
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_type      AS ENUM ('question', 'answer', 'feedback', 'nudge', 'report', 'system');

CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction    message_direction NOT NULL,
  message_type message_type NOT NULL,
  content      TEXT NOT NULL,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
```

---

## Relationship Summary

| Parent | Child | Relationship | On Delete |
|---|---|---|---|
| `users` | `profiles` | One-to-many | Cascade |
| `profiles` | `roadmaps` | One-to-many | Cascade |
| `roadmaps` | `questions` | One-to-many | Cascade |
| `questions` | `responses` | One-to-one (typically) | Cascade |
| `users` | `messages` | One-to-many | Cascade |

---

## JSONB Field Shapes

### `profiles.parsed_skills`
```json
{
  "user_skills": ["Python", "REST APIs", "SQL"],
  "jd_skills": ["Python", "Kubernetes", "System Design", "SQL"],
  "gap_skills": ["Kubernetes", "System Design"]
}
```

### `profiles.flagged_fields`
```json
{
  "missing_sections": ["Projects", "Certifications"],
  "weak_areas": ["Leadership experience not demonstrated", "No quantified impact metrics"]
}
```

### `roadmaps.topics`
```json
[
  { "day": 1, "topic": "System Design Basics", "goal": "Understand CAP theorem and scaling patterns" },
  { "day": 2, "topic": "Kubernetes Fundamentals", "goal": "Explain pods, deployments, and services" }
]
```
