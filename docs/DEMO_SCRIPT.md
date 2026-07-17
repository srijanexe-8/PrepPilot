# PrepPilot — Demo Script

> **Status:** Drafted 17 July 2026 against the working build. Every step below maps to a flow that exists — nothing here is aspirational. Rehearse once end-to-end before demo day; the timings assume the pre-flight in §1 was done.

---

## 1. Pre-flight — do this before you present

The demo has three failure modes that are **invisible until you're on stage**. All three are avoidable.

### ⚠️ Do not run a live upload as your opening

`POST /api/upload` runs 10+ Gemini calls and the backend allows it **6 minutes**. On free-tier quota it can hit that. The UI's "usually takes 1–2 minutes" is optimistic.

**Instead:** pre-seed a demo account with the analysis and roadmap already generated. Show the upload *starting*, then cut to the seeded account. If you must show a live analysis, start it before you begin talking and return to it later.

### ⚠️ The judge's WhatsApp must opt into the sandbox first

Twilio Sandbox requires each recipient to send `join <code>` from their own phone. **Saving a number in PrepPilot does not verify this** — there's no check. An un-opted-in number looks connected and silently fails.

**Do this in the room, before you start:** have the judge send the join code (Screen: `/whatsapp`, or scan the QR). Confirm you can send them a test message.

### ⚠️ Sandbox caps at 50 messages/day

Every rehearsal burns from the same daily budget. Count your test sends. If you rehearse the full loop 10 times you've used 10+.

### Checklist

- [ ] All four processes up: Postgres, Node (`:3000`), Python (`:8001`), Vite (`:5173`)
- [ ] `GET localhost:3000/health` and `GET localhost:8001/health` both OK
- [ ] Gemini quota has headroom (check today's usage)
- [ ] Twilio creds set — otherwise sends **silently no-op** with only a console warning
- [ ] Demo account seeded: analysis done, roadmap generated, Day 1 **not yet completed**
- [ ] Judge's phone opted into the sandbox, verified with a test send
- [ ] **Do not refresh the browser mid-demo** — auth is in-memory; a refresh logs you out
- [ ] Have the Analysis page pre-loaded in a second tab as a fallback

---

## 2. The Demo — ~6 minutes

### Beat 1 — The problem (45s)

> "Interview prep doesn't fail because resources are scarce. It fails because consistency is hard alone. You binge LeetCode for a weekend, go cold for two weeks, and walk in with stale prep and hollow confidence.
>
> PrepPilot fixes the consistency problem: instead of you going to a platform, the coach comes to you — on WhatsApp."

### Beat 2 — Upload (45s)

**Screen:** `/upload`

Drop in a resume, paste a JD, set the prep length.

> "Two inputs: your resume, and the job you actually want. Not a generic syllabus — this plan is built against *this* JD."

Click analyse. As it starts:

> "Behind this, twelve agents are running in three waves — resume and JD parsing in parallel, then semantic matching, gap reasoning, and a critique agent that checks the analysis and sends it back if it's wrong. That self-correction is why we trust the gap list enough to build a plan on it."

**→ Cut to the pre-seeded account.** Be honest and brief: *"That takes a couple of minutes on the free tier, so here's one I ran earlier."* Judges respect this; a silent 4-minute spinner kills the room.

### Beat 3 — The analysis (75s) — *your strongest screen*

**Screen:** `/analysis`

> "Here's what came back. An overall weighted score — skills 40%, experience 30%, culture 20%, education 10%."

Scroll to requirement matches:

> "This is the part that matters. Every requirement in the JD, matched against actual evidence in the resume, rated strong / partial / weak / none — with the evidence quoted. It's not keyword matching. It reasons about what you've actually done, and it tells you *why* it scored you that way."

Land the point:

> "That gap list is what the roadmap is built from."

### Beat 4 — The roadmap (45s)

**Screen:** `/roadmap`

> "A day per gap. Day one's unlocked; the rest are locked. This isn't a calendar — day two unlocks when day one is *done*. If you finish three in a sitting, you get three. If you go quiet, it waits."

Open the practice modal:

> "Each day has curated resources and practice questions, generated for this topic."

### Beat 5 — Answer + scoring (60s)

Answer a question in the modal. Submit.

> "Scored zero to ten with written feedback, in about five seconds."

Read one line of the AI feedback aloud — specific beats abstract.

### Beat 6 — The WhatsApp loop (75s) — *the money shot*

**Have the judge's phone visible.** Go back to the roadmap and mark Day 1 complete.

> "Watch what happens when I finish a day."

Point out, in order:
1. Day 2 unlocks in the UI — instant
2. **The judge's phone buzzes** — Day 2's practice questions arrive

> ⚠️ **Don't cue the notification bell here.** It polls every **60 seconds** (`POLL_MS` in `NotificationBell.tsx`), so it will not increment on demand — pointing at it and waiting is dead air. Show the bell earlier (Beat 5, after the answer is scored, by which time the poll has landed) or open the dropdown to force a fetch.

> "No cron job, no 8am blast. The moment you finish a day, the next one lands on your phone. The coach moves at your pace, not the calendar's."

**If the message doesn't arrive:** don't stall. *"Sandbox is rate-limited — here's the message from my rehearsal."* Have a screenshot ready. Move on.

### Beat 7 — Dashboard + close (45s)

**Screen:** `/dashboard`

> "Readiness score, weekly trend, streak, and where you're still weak."

**Be careful here.** If you want the score to move on camera, answer from the **Today's Coaching card on the dashboard** — that's the flow wired to the score. Answers from the roadmap modal won't move it (see §3).

> "Upload a resume, get an honest read on your gaps, get a plan built from them, and get a coach that texts you the moment you're ready for the next one. That's PrepPilot."

---

## 3. Known gaps — how to handle them honestly

Judges find these. Owning them reads as engineering maturity; getting caught reads as not knowing your own system.

| Gap | If asked |
|---|---|
| **Roadmap answers don't move the readiness score** | True, and it's our top bug. Two answer paths were built by different people against different tables — `practice_answers` scores per question, `responses` drives the dashboard. They need to converge on one. **Demo the dashboard card if you want the score to move.** |
| **WhatsApp is outbound only** | Honest framing: *"Today WhatsApp is the delivery channel and the app is where you answer. Inbound replies are the next milestone — the sender, templates, and scoring are already built, so it's a webhook and a route."* Don't imply replies work. |
| **Readiness score counts answers, doesn't grade them** | *"Right now it's `analysis score + 2 per answer`. It rewards consistency — which is the product thesis — but we already score every answer 0–10, so grading it is wiring, not new work."* |
| **No missed-practice nudge** | We removed the cron for event-driven sends and this went with it. It's the one genuinely time-based job, so it comes back as a scheduled worker. |
| **Refresh logs you out** | Known — the token is in memory only. It's a `localStorage` change plus route guards. |
| **Regenerating a roadmap wipes progress** | Known and unguarded — it deletes every day and cascades away the answers. Needs a confirm dialog at minimum. |
| **Why Gemini, when the README/docs said Claude?** | Early docs said Claude; the build is Gemini end to end. The docs are now corrected. |

---

## 4. If it breaks on stage

| Symptom | Cause | Say / do |
|---|---|---|
| Upload spins forever | Gemini quota, or Python service down | *"Free-tier quota."* Cut to the seeded account. |
| **503** "Parse service is offline" | Python service not running | Cut to seeded account. Restart it off-camera. |
| **502** "Gemini API daily quota reached" | Quota exhausted | Cut to seeded account. Nothing to fix live. |
| No WhatsApp message | Not opted in · 50/day cap · creds unset | Show the rehearsal screenshot, keep moving. |
| Suddenly logged out | You refreshed | Log back in. It's a known gap — say so and move on. |
| Roadmap says "No roadmap found" | Wrong account, or generation failed | Check you're on the seeded account. |
| Stale-roadmap banner | The plan predates the analysis on file | Feature, not bug — *"it detects when a plan doesn't match your current analysis and offers a rebuild."* Good save. |

---

## 5. One-liners worth having ready

- **"Why not a cron job?"** → *"Because progress is gated on completion, not the calendar. A daily blast messages you about a day you haven't reached."*
- **"What's the critique agent?"** → *"The fit report is the highest-stakes output — a wrong gap list poisons the whole plan. So the pipeline critiques its own analysis and retries, capped at two."*
- **"Why split Node and Python?"** → *"The multi-agent graph needs LangGraph and the Python parsing ecosystem. Roadmap, practice content, and scoring are single-prompt tasks — keeping them in Node saves a network hop and lets them hit the same tables in one request."*
- **"Is this just ChatGPT with steps?"** → *"Ask ChatGPT for a prep plan and you get a generic syllabus. This reasons over your evidence against their requirements, checks its own work, then paces you and follows you to WhatsApp."*
