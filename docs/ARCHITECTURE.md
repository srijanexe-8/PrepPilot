# PrepPilot — System Architecture

> **Status:** Reflects the code as of 17 July 2026.

## Overview

PrepPilot is an **AI-augmented coaching system** built as four processes: a React frontend, a Node/Express backend, a Python AI microservice, and PostgreSQL. The user interacts through the web app; WhatsApp is a **one-way notification channel** that pushes each day's practice questions to the user's phone.

The intelligence is split across two services. Deep candidate analysis (resume + JD → evidence-based fit report) runs as a LangGraph multi-agent pipeline in the Python service. The narrower per-day generation tasks (roadmap, practice content, answer scoring) run in the Node backend. Both call **Google Gemini**.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER SURFACES                            │
│                                                                 │
│   ┌──────────────────────┐          ┌────────────────────────┐  │
│   │   React + Vite +     │          │     WhatsApp Client    │  │
│   │   Tailwind (5173)    │          │   (User's Phone)       │  │
│   └──────────┬───────────┘          └──────────▲─────────────┘  │
└──────────────┼─────────────────────────────────┼────────────────┘
               │  REST API (HTTP)                │  Outbound only
               ▼                                 │
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND API  (Node + Express + TS, :3000)    │
│                                                                  │
│   ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────────┐    │
│   │  Auth /  │ │ Upload / │ │ Dashboard │ │ Notifications   │    │
│   │  Profile │ │ Roadmap  │ │ Aggreg.   │ │ (in-app feed)   │    │
│   └──────────┘ └──────────┘ └───────────┘ └─────────────────┘    │
│                                                                  │
│   Node-side AI services (services/ai/callGemini.ts):             │
│     roadmapGeneration · practiceContent · answerScoring          │
└──────┬───────────────┬──────────────┬────────────────┬───────────┘
       │               │              │                │
       │               │ POST /parse  │ Gemini         │ Send
       ▼               ▼              ▼                ▼
┌─────────────┐  ┌──────────────┐ ┌──────────┐  ┌──────────────────┐
│ PostgreSQL  │  │ Python AI    │ │ Google   │  │ Twilio WhatsApp  │
│ (Database)  │  │ FastAPI :8001│ │ Gemini   │  │ Sandbox          │
└─────────────┘  │ (LangGraph)  │ └──────────┘  └──────────────────┘
                 └──────┬───────┘
                        │ Gemini
                        ▼
                 ┌──────────────┐
                 │ Google       │
                 │ Gemini       │
                 └──────────────┘
```

WhatsApp sends are **event-driven**, triggered inline when a day is unlocked — there is no scheduler process and no inbound webhook. See [Daily Coaching Loop](#data-flow--daily-coaching-loop).

---

## Component Breakdown

### Frontend — React + Vite + Tailwind CSS (port 5173)

**What it does:** The primary surface for the entire product. Users sign up, upload their resume and JD, read the analysis report, work through the roadmap day by day, answer practice questions in-app, connect WhatsApp, and track readiness on a dashboard.

**Why this choice:** Vite gives near-instant HMR during development — critical in a hackathon sprint. Tailwind accelerates styling without a custom design system. React's component model maps cleanly to the distinct screens. The frontend has no AI or messaging logic; it is purely a view/input layer.

**Note:** Auth state (`store/AuthContext.tsx`) is held in memory only — a page refresh logs the user out. There are no route guards; unauthenticated users reaching a protected page get a failed API call rather than a redirect.

---

### Backend API — Node.js + Express + TypeScript (port 3000)

**What it does:** The central orchestrator. Handles authentication, file upload and forwarding to the Python service, roadmap generation and day gating, practice-answer scoring, dashboard aggregation, the in-app notification feed, and outbound WhatsApp dispatch.

**Why this choice:** Node's async model suits this workload — most operations are I/O-bound (DB queries, external API calls, Twilio). TypeScript catches contract mismatches early, which matters when the team is split across three service boundaries. Express is minimal and doesn't impose opinions on how services are structured.

**Why some AI lives here rather than in the Python service:** Roadmap generation, practice content, and answer scoring are single-prompt, single-response tasks that need no agent graph. Keeping them in Node avoids a network hop and lets them read and write the same tables in the same request. The Python service is reserved for the genuinely multi-agent work.

---

### AI Layer — Google Gemini (two callers)

Both services call Gemini. The model is configurable via `GEMINI_MODEL` and defaults to `gemini-3.1-flash-lite`.

#### 1. Python AI Microservice — FastAPI + LangGraph (port 8001)

Exposes `POST /parse` (resume file + JD text → full analysis report) and `GET /health`. Runs a 12-agent pipeline in three waves:

| Wave | Agents | Execution |
|---|---|---|
| **1** | `FitAnalysisGraph` — a LangGraph `StateGraph` over `resume_parser`, `jd_parser`, `semantic_matcher`, `gap_reasoner`, `critique_node`, `synthesizer` | See below |
| **2** | `ExperienceEvaluator`, `EducationEvaluator`, `CultureFit`, `ResumeSummarizer` | Parallel |
| **3** | `DecisionAgent`, `InterviewQuestionAgent` | Parallel |

#### Wave 1 — the fit-analysis graph (`src/graph/build.py`)

```
START ──► resume_parser ──┐
                          ├──► semantic_matcher ──► [route_after_match]
START ──► jd_parser ──────┘                              │
                                                         │ any match not 'strong'
                                          ┌──────────────┴──────────────┐
                                          ▼                             │ all 'strong'
                                     gap_reasoner ───► critique_node ◄──┘
                                          ▲                  │
                                          │                  ▼
                                          │          [route_after_critique]
                                          │                  │
                          ┌───────────────┴──────────────────┤ issues found
                          │                                  │ & retries left
                     semantic_matcher ◄────────── rework_target
                                                             │
                                                             │ clean, or
                                                             ▼ retries exhausted
                                                        synthesizer ──► END
```

Two conditional edges do the real work:

- **`_route_after_match`** skips `gap_reasoner` entirely when every requirement already matched `strong` — there are no gaps to reason about.
- **`_route_after_critique`** routes to `synthesizer` when the critique found no issues **or** `retry_count > MAX_CRITIQUE_RETRIES` (2). Otherwise it loops back to the critique's chosen `rework_target` — either `semantic_matcher` or `gap_reasoner` — passing `critique_issues` in as feedback so the reworked node sees what was wrong.

**Why a graph rather than a flat chain:** The fit report is the highest-stakes output in the product — a wrong gap analysis poisons the roadmap built from it. The critique loop lets the pipeline catch its own bad output before the user sees it, and re-runs *only* the node that was actually at fault rather than the whole chain. A single prompt cannot do either.

**Why the retry cap:** the loop is bounded (2) because a critique agent that keeps rejecting its own work would otherwise burn Gemini quota indefinitely. On exhaustion the pipeline synthesizes the best report it has rather than failing the request.

**Why Python:** LangGraph, and the resume-parsing ecosystem (PyMuPDF, python-docx) the pipeline depends on.

The compiled graph is cached with `@lru_cache(maxsize=1)` — built once per process, not per request.

#### 2. Node-side Gemini calls — `backend/src/services/ai/callGemini.ts`

| Service | Task |
|---|---|
| `roadmapGeneration.ts` | Turn the analysis's gap list into an N-day plan (N = 1–60) |
| `practiceContent.ts` | Generate curated resources + practice questions for one day, on first open |
| `answerScoring.ts` | Score a single practice answer 0–10 with written feedback |

---

### Weighted Scoring

`DecisionAgent.compute_weighted_score` combines four sub-scores into the report's `weighted_score`. Weights are env-overridable (`WEIGHT_SKILL`, `WEIGHT_EXPERIENCE`, `WEIGHT_EDUCATION`, `WEIGHT_CULTURE`):

| Dimension | Weight |
|---|---|
| Skills | 40% |
| Experience | 30% |
| Culture | 20% |
| Education | 10% |

This `weighted_score` becomes the **base** of the dashboard readiness score.

---

### Messaging — Twilio WhatsApp Sandbox (outbound only)

**What it does:** Pushes a day's practice questions to the user's WhatsApp when that day unlocks. `services/whatsapp/sender.ts` wraps Twilio; `templates.ts` holds the message bodies.

**What it does not do:** There is no inbound webhook. The user cannot reply to a message and have it scored — replies go nowhere. Every answer is submitted in the web app. The message body says so explicitly: *"Open PrepPilot to submit your answers and track your progress."*

**Best-effort by design:** `sendWhatsAppMessage` returns `false` rather than throwing, and no-ops entirely when Twilio credentials are absent. A messaging failure never breaks the API call that triggered it — the user gets an in-app notification telling them the send failed (commonly the sandbox's 50-message daily cap).

**Why Sandbox over WhatsApp Business API:** The Business API requires business verification, Meta review, and template pre-approval — days to weeks. The Sandbox is available instantly with a one-time `join <code>` opt-in from the user's phone, and covers the full demo scope.

---

### Scheduling — event-driven, no cron

There is **no scheduler running**. `startDailyReminderScheduler()` in `services/scheduler/dailyReminder.ts` is a deliberate no-op that logs *"Cron job scheduler disabled (replaced by event-driven unlocks)."* `node-cron` remains in `package.json` but nothing imports it.

Sends are triggered inline by `prepareAndSendDay(userId, questionId)` at two call sites:

1. `POST /api/roadmap/generate` — sends Day 1 immediately after the plan is persisted.
2. `POST /api/roadmap/:dayId/complete` — sends the day that completing this one just unlocked.

Both are fired without `await` (errors caught and logged) so a slow Twilio call never delays the API response.

**Why the change from a daily cron:** Progress is gated on completion, not on the calendar — a day unlocks when the previous one is finished, which may be any time or never. A fixed 08:00 job would message users about a day they hadn't unlocked, and stay silent for a user who finished three days in one sitting. Sending at the unlock event makes the message track the user's actual pace. It also removes the single-instance constraint a stateful in-process cron imposes.

**What this drops:** the missed-practice nudge. That was the one job genuinely keyed to wall-clock time, and nothing replaces it today.

---

### Database — PostgreSQL

**What it does:** Stores users, uploaded/parsed documents and the analysis report, roadmaps, per-day rows, practice answers with AI scores, per-day responses, and the in-app notification feed.

**Why PostgreSQL over SQLite:** JSONB is essential — the analysis report, resources, and practice question sets are all variable-structure AI output that would need many nullable columns in a strict relational model. JSONB allows efficient querying inside those structures. SQLite lacks JSONB and doesn't handle concurrent writes safely.

**Schema management:** `src/db/schema.sql` is the original bootstrap file and is **now partly stale** — it still defines the unused `profiles` and `messages` tables and a pre-migration shape of `roadmaps`/`questions`/`responses`. The live schema is `schema.sql` plus the nine ordered migrations in `src/db/migrations/`, each with its own `npm run migrate:*` script. See [SCHEMA.md](./SCHEMA.md).

---

## Data Flow — Onboarding & Analysis

```
1. User uploads resume (PDF/DOCX) + pastes JD          → POST /api/upload
2. Backend forwards multipart to Python service        → POST :8001/parse
3. Python runs the 3-wave, 12-agent pipeline (Gemini)  (~up to 6 min on free tier)
4. Python returns the full report
5. Backend upserts user_documents (one row per user), stamps uploaded_at
6. Backend calls Gemini to generate an N-day roadmap from the report's gaps
7. Backend upserts roadmaps + inserts one questions row per day
     · earliest day  → status 'today'
     · all others    → status 'locked'
     · roadmaps.analysis_uploaded_at ← the analysis's uploaded_at
8. Day 1 fired to WhatsApp (async, best-effort)
9. Full report returned to the frontend → Analysis page
```

If step 6 or 7 fails, the analysis is still saved and `roadmap_error` is returned. Any roadmap left in the DB belongs to a *previous* analysis, so its `analysis_uploaded_at` no longer matches — `GET /api/roadmap` reports this as `is_stale: true` and the UI offers a rebuild rather than presenting a stale plan as current.

---

## Data Flow — Daily Coaching Loop

```
1. Day N unlocks (status 'today')
2. prepareAndSendDay() fires:
     a. Skip if the user has no whatsapp_number
     b. Skip if the day's sent_at is already set (send-once guard)
     c. Generate practice content via Gemini if not yet generated, and persist it
        (so the modal opens instantly later)
     d. Send the first 3 practice questions via Twilio
     e. On success → stamp sent_at, notify "sent"
        On failure → notify "failed" (no sent_at stamp, so it can be retried)
3. User opens PrepPilot → GET /api/roadmap/:dayId/practice
4. User answers a question in the web modal
     → POST /api/roadmap/:dayId/questions/:questionId/answers
5. Backend scores it via Gemini (0–10 + feedback), stores it in practice_answers,
   and pushes an "answer scored" notification
6. User marks the day complete → POST /api/roadmap/:dayId/complete
7. In one transaction: day → 'completed', next locked day → 'today'
8. Notify "day unlocked" → loop back to step 2 for day N+1
```

**Note the two answer paths.** `practice_answers` holds per-question answers scored 0–10 by AI (the roadmap modal). `responses` holds per-day answers with an unused 0–100 `score` column (`POST /api/dashboard/practice-answer`) and is what drives the dashboard readiness score, streak, and session counts. They were kept separate so the two concerns don't collide — but it means **answering in the roadmap modal does not move the readiness score**.

---

## Known Architectural Gaps

| Gap | Detail |
|---|---|
| No inbound WhatsApp | Outbound only. Replies are not received or scored. |
| No missed-practice nudge | Lost when cron was removed; nothing time-based replaced it. |
| Two answer stores | `practice_answers` (roadmap, AI-scored) and `responses` (dashboard, drives readiness) are disconnected. |
| `responses.score` unused | Always NULL; readiness is `weighted_score + 2 × answer_count`, capped at 100. |
| Auth not persisted | In-memory only; refresh = logout. No route guards. |
| Dead tables | `profiles` and `messages` are defined in `schema.sql` and referenced by no code. |
| Dead dependencies | `node-cron` and `@anthropic-ai/sdk` are installed but unused. |
| No tests | No test suite in any of the three services. |
