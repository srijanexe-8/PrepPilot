# PrepPilot 🎯

> *An interview coach that texts you like a mentor would — one sharp question a day, honest feedback on your answer, and a readiness score that actually moves.*

---

## The Problem

Most interview prep fails — not because resources are scarce, but because **consistency is hard to maintain alone**. People binge LeetCode for a weekend, then go cold for two weeks. When the actual interview arrives, the preparation is stale and the confidence is hollow.

PrepPilot fixes the consistency problem by making the coach come to *you*, through a channel you already check every day: **WhatsApp**.

---

## What PrepPilot Does

1. You upload your resume and the job description you're targeting.
2. Claude parses both, identifies your skill gaps, and builds a personalised day-by-day prep roadmap.
3. Every morning, PrepPilot sends you one sharp, targeted question over WhatsApp.
4. You reply in plain English — no special format required.
5. Claude evaluates your answer, scores it, and texts back honest feedback + the next focus topic.
6. Your dashboard tracks a **Readiness Score** that moves as you actually practise.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + Vite + Tailwind CSS |
| **Backend API** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL |
| **AI Layer** | Anthropic Claude API |
| **Messaging** | Twilio WhatsApp Sandbox |
| **Scheduler** | node-cron |

---

## Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/your-org/prep-pilot.git
cd prep-pilot

# 2. Set up backend environment
cd backend
cp ../.env.example .env
# Edit .env and fill in:
#   DATABASE_URL  — your PostgreSQL/Supabase connection string
#   JWT_SECRET    — any random secret (use: openssl rand -base64 32)
#   ANTHROPIC_API_KEY, TWILIO_* — filled in later phases

# 3. Install backend dependencies
npm install

# 4. Run database migration (creates all tables)
npm run migrate

# 5. Start the backend dev server
npm run dev
# → API running at http://localhost:3000

# 6. In a second terminal, start the frontend
cd ../frontend
npm install
npm run dev
# → Frontend running at http://localhost:5173 (or 5174 if port is busy)
```

### Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Phase 1 | PostgreSQL connection string (Supabase, Neon, local) |
| `JWT_SECRET` | ✅ Phase 1 | Secret key for signing JWTs |
| `PORT` | Optional | Backend port (default: 3000) |
| `FRONTEND_ORIGIN` | Optional | CORS allowed origin (default: http://localhost:5173) |
| `ANTHROPIC_API_KEY` | Phase 2 | Claude API key for AI parsing + scoring |
| `TWILIO_ACCOUNT_SID` | Phase 3 | Twilio account SID for WhatsApp |
| `TWILIO_AUTH_TOKEN` | Phase 3 | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | Phase 3 | Twilio sandbox number (`whatsapp:+14155238886`) |



---

## Repository Structure

```
prep-pilot/
├── docs/               # Architecture, schema, wireframes, API contracts
├── frontend/           # React + Vite + Tailwind app
├── backend/            # Node + Express + TypeScript API
└── seed/               # Sample data scripts
```

---

## Team

| Name | Role |
|---|---|
| **Srijan** | Backend, database design, authentication, deployment |
| **Ranith** | AI layer — resume/JD parsing, gap analysis, scoring engine |
| **Geetesh** | Frontend — upload flow, dashboard, wireframes & design |

---

## Hackathon Context

PrepPilot is being built as a hackathon submission. This repository represents **Milestone 1** — the documentation and architecture phase. Backend logic, AI integration, and frontend components are scoped for subsequent milestones.

---

*Built with ☕ and late nights by Srijan, Ranith & Geetesh.*
