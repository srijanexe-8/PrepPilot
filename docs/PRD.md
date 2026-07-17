# PrepPilot — Product Requirements Document

> **Status:** Milestone 1 largely delivered — see [Build Status](#5-build-status).
> **Authors:** Srijan (backend), Ranith (AI), Geetesh (frontend)
> **Last Updated:** 17 July 2026

---

## 1. Problem Statement

Interview preparation fails at the consistency layer, not the content layer. Resources are abundant — LeetCode, YouTube crash courses, Glassdoor question banks. The real failure mode is the two-week gap between "I should prep" and "the interview is tomorrow." Without external accountability, prep is binge-and-forget.

PrepPilot solves this by making the coach proactive: instead of the user going to a platform, the platform comes to the user through a channel they already check every day — WhatsApp.

---

## 2. Product Vision

> *An interview coach that texts you like a mentor would — one sharp question a day, honest feedback on your answer, and a readiness score that actually moves.*

**Where the build diverges from the vision.** Two of those three promises are only partly kept today:

- **"Texts you"** — PrepPilot texts *out*, but cannot hear you. WhatsApp replies are not received. Every answer is typed into the web app, which makes WhatsApp a notification channel rather than the coaching surface.
- **"A readiness score that actually moves"** — it moves on the dashboard answer flow, but not when the user practises through the roadmap, which is the flow the product pushes them toward.

Both are tracked in [§7](#7-known-gaps--tech-debt) and are the highest-value work remaining.

---

## 3. Target Users

**Primary:** Software engineers and tech professionals with a specific interview or job application in the next 2–6 weeks, who struggle with consistency in self-directed prep.

**Not targeting (for now):** Students preparing for campus placements (different question format), users with no WhatsApp access, non-technical roles.

---

## 4. Core User Journey

```
Sign up → Upload resume + JD → 12-agent AI pipeline analyses fit and identifies gaps
→ Review the analysis report (scores, gaps, decision, sample questions)
→ Get an auto-generated N-day roadmap (1–60 days, default 15)
→ Connect WhatsApp (Twilio Sandbox opt-in)
→ Day 1's practice questions pushed to WhatsApp
→ Open the app, work through the day's resources + practice questions
→ Answers scored 0–10 with written feedback
→ Mark the day complete → next day unlocks → its questions push to WhatsApp
→ Track readiness on the dashboard
```

**Changed since the original design:** the user does **not** review and edit the roadmap before it is committed — it is generated and persisted automatically by the upload flow. They can regenerate at a different length, but not rename, reorder, or delete individual topics. Progression is **completion-gated**, not calendar-gated: the next day unlocks when the previous is marked complete, which may be minutes or weeks later.

---

## 5. Build Status

### 5.1 Onboarding — ✅ Built

- Email/password registration and login (JWT, 24h expiry, bcrypt cost 12)
- Resume upload (PDF/DOCX, ≤10 MB) and JD text paste
- **Gemini-powered** gap analysis via a 12-agent LangGraph pipeline in three waves, producing an evidence-based fit report with a self-critique retry loop
- Weighted scoring: Skills 40% · Experience 30% · Culture 20% · Education 10%
- Analysis page: scores, gaps, narrative summary, decision, and 10 sample interview questions

> **Correction to the original PRD:** this was specified as "Claude-powered". The build uses **Google Gemini** (`gemini-3.1-flash-lite` by default) in both the Python service and the Node backend. No Anthropic call exists in the codebase.

### 5.2 Roadmap Generation — ✅ Built, with scope changes

- Gemini generates a day-by-day plan from the gap analysis
- **Configurable length 1–60 days** (default 15) — the original spec assumed a fixed 15-day sprint
- Persisted and used to drive day unlocking
- Staleness detection: a roadmap not built from the analysis on file is flagged `is_stale` and the user is prompted to rebuild
- Per-day resources + practice questions generated on demand and cached

**❌ Not built:** the roadmap review/edit step. No inline rename, reorder, delete, add topic, or interview-date picker. Regenerating replaces the plan wholesale and **destroys all progress** on it.

### 5.3 WhatsApp Coaching Loop — ⚠️ Outbound only

**✅ Built:**
- Twilio Sandbox connect page with join code, deep link, and E.164 number capture
- A day's first 3 practice questions pushed on unlock (Day 1 at generation; day N+1 on completing day N)
- Send-once guard via `questions.sent_at`; best-effort sending that never breaks the triggering request
- In-app notification on send success *and* failure (the sandbox's 50-msg/day cap is the usual cause)

**❌ Not built:**
- **Inbound replies.** No Twilio webhook exists. A user who replies to the message gets no response, and their answer is lost. The message body works around this: *"Open PrepPilot to submit your answers."*
- **Missed-practice nudge.** Removed with the cron scheduler; nothing time-based replaced it.
- Feedback delivered over WhatsApp — scoring feedback appears only in-app.

**Architectural change:** the daily 08:00 cron was replaced by event-driven sends on unlock. Progress is gated on completion, not the calendar, so a fixed daily job would message users about days they hadn't reached. `startDailyReminderScheduler()` is now a deliberate no-op. See [ARCHITECTURE.md](./ARCHITECTURE.md#scheduling--event-driven-no-cron).

### 5.4 Answer Scoring — ✅ Built (roadmap path)

- Per-practice-question answers scored **0–10** with written feedback via Gemini
- `answer_scored` notification on completion
- Append-only history per day, prefilled into the practice modal

**⚠️ Diverges from spec:** the original called for score 0–100 plus strengths, gaps, and a recommended next topic. The build returns a 0–10 score and a single feedback string. `responses.strengths` / `gaps` / `recommended_topic` were dropped in migration 005.

### 5.5 Dashboard — ✅ Built, some metrics are proxies

- Readiness score, weekly delta, and 7-day trend
- Sessions this week (goal 5) and streak days
- Today's question card
- Topic confidence breakdown
- Weekly review summary
- WhatsApp connection status

**⚠️ How the numbers really work:**

| Metric | Spec | Reality |
|---|---|---|
| Readiness score | Rolling average of response scores | `min(100, weighted_score + 2 × answer_count)` — **counts answers, doesn't grade them**. `responses.score` is never populated. |
| Per-topic accuracy | Average score per topic | Derived from the **analysis**, not from answers. It does not move as the user practises. |
| Roadmap completion | Progress bar | Lives on the roadmap page, not the dashboard. |

The score therefore rewards showing up rather than answering well — defensible as a consistency product, but it is not what the PRD promised.

### 5.6 Beyond original scope — ✅ Built

- In-app notification feed (header bell, unread badge, mark-read)
- Settings: change name, change password, delete account
- Account deletion cascades across every table

---

## 6. Out of Scope (Post-Hackathon)

- Mock interview mode (multi-turn conversational simulation)
- Voice note answers via WhatsApp
- Team/group prep plans
- Calendar integration for interview date auto-detection
- WhatsApp Business API (replacing the Sandbox)
- Mobile native app
- Payment / subscription layer

---

## 7. Known Gaps & Tech Debt

Ordered by user impact.

| # | Gap | Impact |
|---|---|---|
| 1 | **Two disconnected answer stores.** `practice_answers` (roadmap, AI-scored) vs `responses` (dashboard, drives readiness). | A user practising through the roadmap — the flow the product steers them into — sees their readiness score never move. Most likely to be noticed in a demo. |
| 2 | **No inbound WhatsApp.** | The core "coach that texts you" promise is half-delivered. Replies vanish. |
| 3 | **Auth not persisted.** Token is in memory only; no route guards. | Refreshing any page logs the user out. |
| 4 | **Regeneration destroys progress.** `POST /api/roadmap/generate` deletes all days, cascading away every answer. | Silent, irreversible data loss with no warning. |
| 5 | **`responses.score` always NULL.** | Readiness measures activity, not quality. |
| 6 | **No missed-practice nudge.** | Nothing re-engages a user who goes quiet — the exact failure mode the product exists to fix. |
| 7 | **Server-local date maths.** Streaks/sessions use the server's timezone, not the user's. | Streaks break at the wrong midnight for distant users. |
| 8 | **No tests** in any of the three services. | — |
| 9 | **Dead code.** `profiles` + `messages` tables; `node-cron` + `@anthropic-ai/sdk` dependencies. | Misleads new contributors. |
| 10 | **Sandbox opt-in unverified.** Saving a number doesn't confirm the user sent `join <code>`. | Sends fail silently until the failure notification arrives. |

---

## 8. Success Metrics (Demo Day)

| Metric | Target | Status |
|---|---|---|
| Full onboarding (upload → analysis → roadmap) | < 3 min | ⚠️ **At risk.** The 12-agent pipeline is allowed **6 minutes** and free-tier Gemini quota can push it there. Pre-seed the demo account. |
| Time from answer submitted to feedback shown | < 10 s | ✅ Single Gemini call |
| Readiness score visibly changes after 3 answers | ✓ | ⚠️ **Only via the dashboard card.** Roadmap-modal answers won't move it (gap #1). |
| Judge receives a live WhatsApp question | ✓ | ✅ Fires on day unlock — but the judge's number must have completed the sandbox `join` opt-in first, and the sandbox caps at 50 msgs/day. |

---

## 9. Constraints

- **Twilio Sandbox:** one sandbox number per account; requires a `join <code>` opt-in per user; **50 messages/day**. Post-hackathon requires WhatsApp Business API approval.
- **Gemini rate limits:** the free tier is the pipeline's real bottleneck — 10+ calls per analysis. The Python service retries quota errors up to twice, honouring the returned `retryDelay`; the backend surfaces exhaustion as a friendly 502. Concurrent onboarding by multiple judges may exhaust quota.
- **No production auth hardening:** static `JWT_SECRET`, 24h tokens, no refresh or rotation.
- **Single-server deployment:** no horizontal scaling. (Removing the in-process cron did lift the single-instance constraint on messaging.)
- **Migrations are manual and unordered by tooling:** nine separate `npm run migrate:*` scripts with no tracking table. A fresh environment needs them run by hand, in order.
