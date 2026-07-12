# PrepPilot — System Architecture

## Overview

PrepPilot is built as a **message-driven, AI-augmented coaching system**. The user interacts through two surfaces: a lightweight web frontend for onboarding and dashboarding, and WhatsApp for the daily coaching loop. All intelligence lives in the AI layer; the backend is the orchestrator that connects every piece.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER SURFACES                            │
│                                                                 │
│   ┌──────────────────────┐          ┌────────────────────────┐  │
│   │   React + Vite +     │          │     WhatsApp Client    │  │
│   │   Tailwind Frontend  │          │   (User's Phone)       │  │
│   └──────────┬───────────┘          └──────────┬─────────────┘  │
└──────────────┼────────────────────────────────┼────────────────┘
               │  REST API (HTTP)               │  Messages
               ▼                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND API                                  │
│              (Node + Express + TypeScript)                       │
│                                                                  │
│   ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────────┐  │
│   │  Auth /  │ │ Profile  │ │ Dashboard │ │ WhatsApp        │  │
│   │  Users   │ │ Roadmap  │ │ Aggreg.   │ │ Webhook Handler │  │
│   └──────────┘ └──────────┘ └───────────┘ └─────────────────┘  │
│                                                                  │
└──────┬───────────────┬─────────────────────────────┬────────────┘
       │               │                             │
       │               │ AI Requests                 │ Send / Receive
       ▼               ▼                             ▼
┌─────────────┐  ┌─────────────────┐      ┌──────────────────────┐
│ PostgreSQL  │  │  Claude API     │      │ Twilio WhatsApp      │
│ (Database)  │  │  (Anthropic)    │      │ Sandbox              │
└─────────────┘  └─────────────────┘      └──────────────────────┘

       ▲
       │  Trigger daily send / missed-practice check
┌──────────────┐
│  node-cron   │
│  Scheduler   │
└──────────────┘
```

---

## Component Breakdown

### Frontend — React + Vite + Tailwind CSS

**What it does:** Provides the onboarding and monitoring surface. Users upload their resume and job description, review and edit their personalised roadmap, connect their WhatsApp number, and track their readiness score on a dashboard.

**Why this choice:** Vite gives near-instant HMR during development — critical in a hackathon sprint. Tailwind accelerates styling without a custom design system. React's component model maps cleanly to the distinct screens (upload → roadmap → dashboard). The frontend has no AI or messaging logic; it is purely a view/input layer.

---

### Backend API — Node.js + Express + TypeScript

**What it does:** The central orchestrator. Handles user authentication, profile and roadmap CRUD operations, scheduling logic, the Twilio webhook endpoint for inbound WhatsApp replies, and dashboard data aggregation.

**Why this choice:** Node's async model is well-suited to this workload — most operations are I/O-bound (DB queries, external API calls, Twilio). TypeScript catches contract mismatches early, especially important when the team is splitting across three separate service boundaries. Express is minimal, well-documented, and doesn't impose opinions on how services are structured.

---

### AI Layer — Anthropic Claude API

**What it does:** Three distinct inference tasks: (1) Parse the uploaded resume and JD, extract skills, and flag gaps. (2) Generate a day-by-day question roadmap tailored to those gaps. (3) Evaluate each user answer — assigning a score, identifying strengths and weaknesses, and recommending the next focus topic.

**Why this choice:** Claude excels at long-context document understanding (resume + JD can be multi-page) and structured JSON output, which maps directly to the parsed schema. Using the API rather than a local model keeps infra simple and avoids GPU overhead during a hackathon.

---

### Messaging — Twilio WhatsApp Sandbox

**What it does:** Sends the daily question, motivational nudges, and weekly summary reports to the user's WhatsApp. Receives the user's text reply via a registered webhook URL, which the backend processes to trigger answer evaluation.

**Why Sandbox over WhatsApp Business API:** The WhatsApp Business API requires business verification, a Meta review process, and message template pre-approval — all of which take days to weeks. The Twilio Sandbox is available instantly with a free account and a one-time `join <code>` opt-in from the user's phone. It covers the full hackathon demo scope.

---

### Scheduler — node-cron

**What it does:** Runs two recurring jobs: a daily morning job that iterates over active roadmaps and triggers question sends, and a missed-practice check (e.g., midday) that sends a gentle nudge if no answer has been received.

**Why node-cron over a heavier job queue (BullMQ, Agenda):** At hackathon scale, the scheduler is running on a single server instance and the job volume is low (one job per active user per day). node-cron requires zero additional infrastructure — no Redis, no worker process. If the product scales, the scheduler can be swapped for BullMQ with minimal interface changes.

---

### Database — PostgreSQL

**What it does:** Stores users, profiles (resume/JD raw text + parsed output), roadmaps, daily questions, user responses, and the full message history.

**Why PostgreSQL over SQLite:** JSONB support is essential — parsed skills, flagged fields, and roadmap topics are all variable-structure data that would require many nullable columns in a strict relational model. PostgreSQL's JSONB allows efficient querying inside those structures. SQLite lacks JSONB and doesn't support concurrent writes safely, which matters even in a small multi-user demo.

---

## Data Flow — Daily Coaching Loop

```
1. node-cron fires at 08:00 UTC
2. Backend queries roadmaps with active users for today
3. Backend selects the next question from the roadmap
4. Backend calls Twilio → WhatsApp message sent to user
5. User replies on WhatsApp
6. Twilio POSTs reply to backend webhook
7. Backend stores inbound message, calls Claude to evaluate answer
8. Claude returns score + feedback JSON
9. Backend stores response, sends feedback message via Twilio
10. Dashboard readiness score is updated
```
