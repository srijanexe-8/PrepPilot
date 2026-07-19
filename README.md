<div align="center">
  <div style="background-color: #059669; color: white; width: 64px; height: 64px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin-bottom: 16px;">
  
  </div>
  <h1 align="center">PrepPilot</h1>
  <p align="center">
    <strong>An AI-powered interview coach that builds personalized roadmaps and tests your readiness.</strong>
  </p>
</div>

---

## 🎯 The Problem

Most interview prep fails—not because resources are scarce, but because **consistency is hard to maintain alone**. People binge LeetCode for a weekend, then go cold for two weeks. When the actual interview arrives, the preparation is stale and the confidence is hollow.

PrepPilot fixes the consistency problem by generating a highly personalized, day-by-day roadmap tailored exactly to your resume and target job description.

---

## ✨ What PrepPilot Does

1. **Upload & Analyze:** You upload your resume and paste the job description you're targeting.
2. **Multi-Agent Evaluation:** A 12-agent pipeline (Skills, Experience, Education, Culture Fit, and more) running on **Google Gemini** analyzes your profile across three waves. A critique agent reviews the fit analysis and sends it back for rework if it's wrong.
3. **Personalized Roadmap:** PrepPilot builds a roadmap — **1 to 60 days, 15 by default** — targeting your exact skill gaps.
4. **Daily Practice:** Each day brings curated resources and practice questions. Finish a day and the next unlocks, with its questions pushed to your **WhatsApp**.
5. **Tracking:** Your dashboard tracks a **Readiness Score**, streak, and weekly trend as you practice.

---

## 🛠️ Tech Stack

PrepPilot is built using a modern, microservice-inspired architecture.

| Layer | Technology |
|---|---|
| **Frontend UI** | React 19 + Vite 7 + Tailwind CSS 3 + React Router 7 |
| **Backend API** | Node.js + Express 5 + TypeScript |
| **AI Engine** | Python + FastAPI + LangGraph + Google Gemini |
| **Database** | PostgreSQL |
| **Messaging** | Twilio WhatsApp Sandbox (outbound) |

---

## 🚀 Running Locally

You will need **four** things running: PostgreSQL, the Node backend, the Python AI API, and the Vite frontend.

### 1. Database Setup

Ensure you have a PostgreSQL database running — a local instance or a managed service like Supabase/Neon.

### 2. Node Backend Setup

```bash
cd backend
cp ../.env.example .env
```

Edit `backend/.env`:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_SECRET` — a random secret (`openssl rand -base64 32`)
- `GOOGLE_API_KEY` — your Gemini key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

Install dependencies and run **all** migrations, in order:

```bash
npm install

npm run migrate                    # schema.sql bootstrap
npm run migrate:upload             # 001 user_documents
npx tsx src/db/run-migration.ts 002_analysis_report.sql
npm run migrate:roadmap            # 003 roadmaps + questions (rebuild)
npm run migrate:name               # 004 users.name
npm run migrate:responses          # 005 responses
npm run migrate:day-status         # 006 day status + practice content
npm run migrate:practice-answers   # 007 practice_answers
npm run migrate:notifications      # 008 notifications
npm run migrate:roadmap-link       # 009 roadmap ↔ analysis link
```

> [!IMPORTANT]
> Run **every** migration, in this order. There is no migration-tracking table — the ordering is manual, and skipping one leaves the app broken in ways that surface later (migration 003 rebuilds tables 001 created; 009 adds a UNIQUE constraint the upload route's upsert depends on). Migration 002 has no npm alias, hence the direct `tsx` call.

Start the backend (port 3000):

```bash
npm run dev
```

### 3. Python AI Engine Setup

In a **second terminal**:

```bash
cd python-api
python -m venv venv
```

Activate the virtual environment:
- Windows: `.\venv\Scripts\activate`
- Mac/Linux: `source venv/bin/activate`

The Python service loads its **own** `.env` from `python-api/`, not the backend's:

```bash
cp ../.env.example .env
```

Set `GOOGLE_API_KEY` in `python-api/.env`.

> [!NOTE]
> The variable is `GOOGLE_API_KEY` — **not** `GEMINI_API_KEY`. Both services will refuse to start an AI call without it.

Install dependencies and start the server (port 8001):

```bash
pip install -r requirements.txt
python -m uvicorn api_server:app --port 8001 --reload
```

### 4. Frontend Setup

In a **third terminal**:

```bash
cd frontend
npm install
npm run dev
```

Your application will now be running at `http://localhost:5173`.

### 5. WhatsApp (optional)

Leave the `TWILIO_*` variables unset and WhatsApp simply disables itself — sends become a logged no-op and nothing else breaks. To enable it, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_SANDBOX_KEYWORD` in `backend/.env`, then opt in from your phone by messaging the sandbox join code (the `/whatsapp` page shows it).

### Verify

```bash
curl localhost:3000/health     # {"status":"ok",...}
curl localhost:8001/health     # {"status":"ok","service":"preppilot-analysis-api",...}
```

> [!TIP]
> The first analysis takes a while — the backend allows the pipeline **6 minutes**, and free-tier Gemini quota is the usual bottleneck. If you see a 502 mentioning quota, wait and retry.

---

## 📂 Repository Structure

```text
prep-pilot/
├── backend/            # Node + Express + TypeScript API (auth, DB, routes, WhatsApp)
├── frontend/           # React + Vite + Tailwind app (UI, dashboard, roadmap)
├── python-api/         # FastAPI + LangGraph engine (12-agent AI analysis)
├── docs/               # Architecture, schema, API contracts, PRD, demo script
└── seed/               # Sample data scripts
```

---

## 📚 Documentation

| Doc | What's in it |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Services, the agent graph, event-driven WhatsApp, data flows |
| [SCHEMA.md](docs/SCHEMA.md) | Live schema, all 9 migrations, JSONB shapes |
| [API_CONTRACTS.md](docs/API_CONTRACTS.md) | Every endpoint, request/response, error codes |
| [PRD.md](docs/PRD.md) | Product scope, build status, known gaps |
| [WIREFRAMES.md](docs/WIREFRAMES.md) | Every screen as built |
| [DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | Live demo walkthrough |

---

## ⚠️ Current Limitations

Known and tracked in [PRD §7](docs/PRD.md#7-known-gaps--tech-debt):

- **WhatsApp is outbound only.** There's no inbound webhook — replying to a message does nothing. Answers are submitted in the web app.
- **Regenerating a roadmap deletes all progress**, with no confirmation.
- **No tests** in any of the three services.

*(Note: Auth persistence across refreshes and unified roadmap/dashboard scoring have recently been resolved!)*

---

## 👥 Team

Built with ☕ and late nights for the hackathon by:
- **Srijan** — Backend, database design, authentication, deployment
- **Ranith** — AI layer (Python FastAPI), resume/JD parsing, gap analysis
- **Geetesh** — Frontend, UI/UX, responsive design

> [!NOTE]
> PrepPilot is actively under development. This repository represents the completed integration of the Node backend, React frontend, and Python AI microservice.
