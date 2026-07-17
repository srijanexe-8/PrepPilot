# PrepPilot — Screen Specifications

> **Status:** Rewritten 17 July 2026 to describe the screens **as built**. This file began as a pre-build spec for Geetesh to turn into Excalidraw/Figma sketches; every screen now exists, so it documents the implementation rather than proposing one. Where the build deliberately departs from the original sketch, it's called out.

## Screen Map

| # | Screen | Route | Source |
|---|---|---|---|
| 1 | Login | `/login` | `pages/LoginPage.tsx` |
| 2 | Signup | `/signup` | `pages/SignupPage.tsx` |
| 3 | Upload | `/upload` | `pages/UploadPage.tsx` |
| 4 | Analysis | `/analysis` | `pages/AnalysisPage.tsx` |
| 5 | Roadmap | `/roadmap` | `pages/RoadmapPage.tsx` |
| 5a | Practice modal | (overlay) | `components/PracticeModal.tsx` |
| 6 | Dashboard | `/dashboard` | `pages/DashboardPage.tsx` |
| 7 | WhatsApp Connect | `/whatsapp` | `pages/WhatsAppPage.tsx` |
| 8 | Settings | `/settings` | `pages/SettingsPage.tsx` |

Screens 3–8 render inside `layouts/RoadmapShell.tsx`. `/` and any unmatched route redirect to `/login`.

**Structural change from the original spec:** there is no 3-step onboarding stepper ("Upload → Review Roadmap → Connect WhatsApp"). The app is a **persistent sidebar shell** the user navigates freely. The roadmap review step was never built — the plan is generated automatically by upload.

⚠️ **No route guards.** Every route is reachable without a token; unauthenticated users get failed API calls rather than a redirect. Auth lives in memory (`store/AuthContext.tsx`), so **a page refresh logs the user out**.

---

## Shell — `RoadmapShell`

The persistent frame around every authenticated screen.

| Element | Detail |
|---|---|
| Sidebar nav | `Dashboard` · `Analysis` · `Roadmap` · `WhatsApp` · `New plan` |
| Sidebar footer | `Settings` (gear) and `Logout` icon buttons |
| Header | Screen title, `NotificationBell`, About button |
| Notification bell | Unread badge; dropdown feed from `GET /api/notifications`; mark-one-read and mark-all-read. **Polls every 60s** (`POLL_MS`), so the badge can lag a real event by up to a minute. |
| About modal | `components/AboutModal.tsx` |

Theme: light, white/emerald-green.

---

## Screen 1 & 2 — Login / Signup

**Purpose:** Convert a visitor into an authenticated user. Email + password only; no social login.

**Built as two separate routes**, not the single tab-switcher card in the original spec.

| Element | Detail |
|---|---|
| Layout | Two-panel split: dark marketing panel (headline + tagline) left, white auth card right |
| Email field | Text input |
| Password field | Password input |
| Name field | Signup only |
| CTA | Full-width primary button |
| Error banner | Inline, on bad credentials |
| Cross-link | "Don't have an account? Sign up" / vice versa |

**Validation** (server, `routes/auth.ts`): valid email format; password ≥ 8 chars; duplicate email → 409. Login returns one message — *"Invalid email or password"* — for both unknown email and wrong password, so accounts can't be enumerated.

**Primary action:** submit → store token in memory → navigate into the shell.

---

## Screen 3 — Upload (Resume + Job Description)

**Purpose:** Collect the two documents that drive every downstream AI step. The most important data-collection step in the product.

**Heading:** "Upload Your Documents"

| Element | Detail |
|---|---|
| Resume upload zone | Drag-and-drop; PDF/DOCX; ≤10 MB; shows filename + size |
| JD input | Large textarea for the pasted job description |
| Prep length | Day count for the roadmap (1–60, default 15) |
| Submit CTA | Disabled until resume + JD are present |
| Loading state | Progress UI noting *"Usually takes 1–2 minutes"* |
| Result preview | On success: parsed resume summary, top skills, target role, must-have skills, experience |

**Layout:** two-column on desktop (resume left, JD right), stacked on mobile.

**Primary action:** submit → `POST /api/upload` → analysis + roadmap generated → Analysis screen.

**⚠️ Long-running.** The backend allows **6 minutes** for the 12-agent pipeline; the "1–2 minutes" copy is optimistic on free-tier Gemini quota. Failure modes the UI must surface: **503** parse service offline, **502** Gemini quota exhausted.

**Not built from the original spec:** the JD-URL "Fetch JD" field (was a stretch goal) and the live character count.

---

## Screen 4 — Analysis

**Purpose:** Show the user what the AI concluded — the trust-building screen. It replaces the original spec's "Roadmap Review" as the post-upload destination.

**Data:** `GET /api/upload`.

| Element | Detail |
|---|---|
| Candidate header | Name from the parsed resume |
| Weighted score | Overall 0–100 (Skills 40% · Experience 30% · Culture 20% · Education 10%) |
| Decision card | Recommendation + confidence (0–100) |
| Narrative summary | Prose summary of the candidate |
| Score breakdown | Per-dimension score + reasoning for skills, experience, education, culture |
| Requirement matches | Each JD requirement with strength (`strong` / `partial` / `weak` / `none`) and supporting evidence |
| Sample questions | 10 questions in `technical` / `behavioral` / `cultural` tabs |

**Primary action:** read, then move to the Roadmap. There is **no confirm/commit step** — the roadmap was already generated and saved by upload.

---

## Screen 5 — Roadmap

**Purpose:** The day-by-day plan and the main practice surface.

**Data:** `GET /api/roadmap`. Heading: "Your {N}-Day Plan".

| Element | Detail |
|---|---|
| Empty state | "Build your roadmap" + day-count picker → `POST /api/roadmap/generate` |
| Error state | "Something went wrong" with retry |
| Day list | One row per day: number, topic, focus skill, difficulty, status |
| Day states | `locked` (greyed) · `today` (active, actionable) · `completed` (check) |
| Practice CTA | Opens the practice modal for an unlocked day |
| Complete CTA | `POST /api/roadmap/:dayId/complete` → unlocks the next day |
| Progress | Completed count against total days |
| Stale banner | Shown when `is_stale` — the plan wasn't built from the analysis on file; offers a rebuild |

**Gating is server-enforced:** a locked day returns 403 from both the practice and complete endpoints, so hiding the button is defence-in-depth rather than the control.

**⚠️ Regenerating destroys progress.** `POST /api/roadmap/generate` deletes every day, cascading away all answers. The UI should warn before calling it.

**Not built from the original spec:** inline topic rename, drag-to-reorder, add/delete topic, interview-date picker, and the flagged-fields dismissible panel. The plan is read-only apart from wholesale regeneration.

---

## Screen 5a — Practice Modal

**Purpose:** Where the user actually practises. Opened from a day row.

**Data:** `GET /api/roadmap/:dayId/practice` + `GET /api/roadmap/:dayId/answers`.

| Element | Detail |
|---|---|
| Day header | Topic + learning goal |
| Resources | Curated `{ title, url }` links |
| Question list | Practice questions with difficulty |
| Answer input | Textarea — *"Type or paste your answer…"* |
| Submit | `POST /api/roadmap/:dayId/questions/:questionId/answers` |
| Score + feedback | AI score **0–10** and written feedback, shown inline after scoring |
| Prefill | Previous answers loaded so scores persist across opens |

**First open is slow.** Resources and questions are generated by Gemini on first access and then cached — `has_practice_content` on the day tells the UI when to expect the wait.

⚠️ **Answers here do not move the readiness score.** They go to `practice_answers`; the dashboard counts `responses`. This is the most user-visible inconsistency in the product ([PRD §7](./PRD.md#7-known-gaps--tech-debt), gap #1).

---

## Screen 6 — Dashboard

**Purpose:** The home screen once set up. Progress at a glance, plus the one answer flow that moves the score.

**Data:** `GET /api/dashboard`.

| Element | Detail |
|---|---|
| Greeting | User's name |
| WhatsApp status | "WhatsApp ✓ Active — daily questions on", or a connect prompt |
| Readiness Score | 0–100 + weekly delta. Subtitle: "Based on analysis + practice" |
| Practice This Week | Sessions against a goal of 5 |
| Next Interview | Days remaining, or "No interview date set" |
| Today's Coaching | Today's question, topic, and goal — with an inline answer box (*"Type a practice answer…"*) posting to `POST /api/dashboard/practice-answer` |
| Readiness Trend | 7-day line chart |
| Topic Confidence | Up to 6 topics with a confidence bar. Empty → "Upload your resume to see topic analysis." |
| Weekly Review | Prose summary of the week |
| WhatsApp CTA | "Keep coaching in WhatsApp" |

**⚠️ What the numbers actually mean:**

- **Readiness Score** = `min(100, weighted_score + 2 × answer_count)`. It counts answers; it does not grade them (`responses.score` is never set). The "+ practice" half of the subtitle is a **count**, not a quality measure.
- **Topic Confidence** comes from the *analysis*, not from answers — it does not move as the user practises.
- **Today's Coaching** tracks answered/unanswered `responses`, **not** `questions.status`, so it can disagree with the Roadmap screen about which day is current.

**Layout:** stat cards across the top, two-column below, weekly review full-width.

**Primary action:** answer today's question inline.

---

## Screen 7 — WhatsApp Connect

**Purpose:** Pair the user's number so day unlocks push to their phone. Twilio Sandbox opt-in.

**Data:** `GET /api/whatsapp/sandbox-info` (public).

| Element | Detail |
|---|---|
| Instructions | Numbered steps to message the sandbox number with the join code |
| Sandbox number | `+1 415 523 8886`, copyable |
| Join code | e.g. `join grew-worry`, copyable |
| Deep link | `wa.me` link that pre-fills the join message |
| QR code | "Scan to join PrepPilot" — for joining from a second device |
| Number field | Placeholder `+91 9599028724`; hint *"Include country code"*. E.164 enforced server-side (`^\+[1-9]\d{6,14}$`) → `PATCH /profile/whatsapp` |
| Disconnect | `DELETE /profile/whatsapp` |

**Primary action:** send the join message from WhatsApp, then save your number.

**⚠️ The opt-in is not verified.** Saving a number only writes `users.whatsapp_number`; nothing confirms the `join` code was sent. The original spec's polling "Waiting for connection… → ✓ Connected!" indicator was **not built** — the badge reflects only whether a number is *stored*. A user who saves a number without opting in appears connected, and sends fail silently until the failure notification lands.

**Outbound only.** Replying to a PrepPilot WhatsApp message does nothing — there is no inbound webhook. Templates say so: *"Open PrepPilot to submit your answers."*

---

## Screen 8 — Settings

**Purpose:** Account management. Not in the original spec.

| Section | Detail |
|---|---|
| Profile | Edit display name → `PUT /profile` |
| Change Password | Current + new (≥8 chars) → `PATCH /profile/password` |
| Danger Zone | Delete account — password-confirmed → `DELETE /profile`. Cascades across every table. Irreversible. |
