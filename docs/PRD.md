# PrepPilot — Product Requirements Document

> **Status:** Draft — Milestone 1  
> **Authors:** Srijan, Ranith, Geetesh  
> **Last Updated:** July 2026

---

## 1. Problem Statement

Interview preparation fails at the consistency layer, not the content layer. Resources are abundant — LeetCode, YouTube crash courses, Glassdoor question banks. The real failure mode is the two-week gap between "I should prep" and "the interview is tomorrow." Without external accountability, prep is binge-and-forget.

PrepPilot solves this by making the coach proactive: instead of the user going to a platform, the platform comes to the user through a channel they already check every day — WhatsApp.

---

## 2. Product Vision

> *An interview coach that texts you like a mentor would — one sharp question a day, honest feedback on your answer, and a readiness score that actually moves.*

---

## 3. Target Users

**Primary:** Software engineers and tech professionals with a specific interview or job application in the next 2–6 weeks, who struggle with consistency in self-directed prep.

**Not targeting (for now):** Students preparing for campus placements (different question format), users with no WhatsApp access, non-technical roles.

---

## 4. Core User Journey

```
Sign up → Upload resume + JD → AI parses and identifies gaps
→ Review and confirm personalised roadmap
→ Connect WhatsApp (Twilio Sandbox opt-in)
→ Receive daily question each morning
→ Reply with answer on WhatsApp
→ Receive score + feedback + next topic hint
→ Track readiness score on dashboard
```

---

## 5. Features — Milestone 1 Scope (Hackathon)

### 5.1 Onboarding
- Email/password registration and login (JWT-based auth)
- Resume upload (PDF/DOCX) and JD text paste
- Claude-powered gap analysis: extracts user skills, JD skills, and gap skills
- Flagged fields: missing resume sections, weak areas highlighted for user review

### 5.2 Roadmap Generation
- Claude generates a day-by-day topic list based on gap analysis and interview date
- User can view, edit (rename/reorder/delete/add) topics before confirming
- Roadmap stored to DB and used to drive the daily question queue

### 5.3 WhatsApp Coaching Loop
- Daily outbound question via Twilio WhatsApp Sandbox
- Inbound reply received via Twilio webhook
- Claude evaluates answer: score (0–100), strengths, gaps, recommended next topic
- Outbound feedback message sent immediately after evaluation
- Missed-practice nudge if no reply by midday

### 5.4 Dashboard
- Readiness Score (rolling average of response scores)
- Today's question status (answered / unanswered)
- Per-topic accuracy breakdown
- Roadmap completion progress
- Weekly summary (answers this week, avg score, biggest improvement, weakest area)

---

## 6. Out of Scope (Post-Hackathon)

- Mock interview mode (multi-turn conversational interview simulation)
- Voice note answers via WhatsApp
- Team/group prep plans
- Calendar integration for interview date auto-detection
- WhatsApp Business API (replacing the Sandbox)
- Mobile native app
- Payment / subscription layer

---

## 7. Success Metrics (Demo Day)

| Metric | Target |
|---|---|
| Full onboarding flow (upload → roadmap → WhatsApp connect) | < 3 minutes |
| Time from answer received to feedback sent | < 10 seconds |
| Readiness score visibly changes after 3 answered questions | ✓ |
| Judge can receive a live WhatsApp question during demo | ✓ |

---

## 8. Constraints

- **Twilio Sandbox:** Max 1 sandbox number per account; requires opt-in per user with `join <code>` message. Acceptable for demo; post-hackathon requires WhatsApp Business API approval.
- **Claude API rate limits:** Anthropic free tier has rate limits. If multiple judges trigger onboarding simultaneously, responses may be queued.
- **No production auth hardening:** JWT secret is a static env variable. Acceptable for hackathon; requires rotation and refresh token handling post-launch.
- **Single-server deployment:** No horizontal scaling; node-cron runs in-process. Acceptable for < 50 demo users.
