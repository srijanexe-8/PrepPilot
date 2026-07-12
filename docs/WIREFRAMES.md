# PrepPilot — Wireframe Specifications

> These are **structured text specifications** intended for Geetesh to turn into Excalidraw or Figma sketches. Each spec defines screen purpose, all UI elements, layout notes, and the single primary action.

---

## Screen 1 — Login / Signup

**Purpose:** First point of entry. Converts a new visitor into an authenticated user. Keeps friction minimal — no social login required for the hackathon, just email + password.

**Key UI Elements:**

| Element | Detail |
|---|---|
| Logo / wordmark | Top-centre, "PrepPilot" with tagline "Your AI interview coach on WhatsApp" |
| Tab switcher | Two tabs: "Log In" and "Sign Up" — toggles the form below |
| Email field | Standard text input, placeholder "you@email.com" |
| Password field | Password input with show/hide toggle |
| Confirm password | (Sign Up tab only) Second password field |
| CTA button | Full-width primary button: "Log In" / "Create Account" |
| Error banner | Inline, below the form, shown on bad credentials |
| Footer note | "By signing up you agree to our Terms. No spam — only your coach." |

**Layout Notes:** Single-column card, centred on a dark/neutral background. Logo above the card. The card should feel like a modal rather than a full-page form.

**Primary User Action:** Submit the login or signup form → redirect to Upload screen (new user) or Dashboard (returning user).

---

## Screen 2 — Upload (Resume + Job Description)

**Purpose:** Collect the two documents that drive all downstream AI processing. This is the single most important data-collection step in the onboarding flow.

**Key UI Elements:**

| Element | Detail |
|---|---|
| Progress indicator | Step 1 of 3: "Upload" → "Review Roadmap" → "Connect WhatsApp" |
| Screen heading | "Tell us what you're aiming for" |
| Resume upload zone | Drag-and-drop area with paperclip icon; accepts PDF/DOCX; shows filename + file size on upload |
| JD input area | Large textarea with placeholder "Paste the full job description here…"; OR a URL field with a "Fetch JD" button (stretch goal) |
| Character count | Below JD textarea; shown as e.g. "1,243 characters" |
| Parse button | Primary CTA "Analyse my profile →" — disabled until both fields are filled |
| Loading state | Skeleton/spinner overlay on the button while Claude parses: "Analysing your profile…" |

**Layout Notes:** Two-column on desktop (resume left, JD right), single-column stacked on mobile. Progress stepper at the top.

**Primary User Action:** Click "Analyse my profile →" → triggers Claude parse → navigate to Roadmap Review screen.

---

## Screen 3 — Roadmap Review

**Purpose:** Show the user what Claude has generated based on their profile gap analysis. Allow them to review, edit, and confirm the plan before committing. This is the "trust-building" screen — the user sees AI output is reasonable and personalised.

**Key UI Elements:**

| Element | Detail |
|---|---|
| Progress indicator | Step 2 of 3: "Review Roadmap" highlighted |
| Screen heading | "Your personalised prep plan" with interview date shown if provided |
| Flagged fields panel | Yellow/amber card: "⚠️ We noticed some gaps" — lists items from `flagged_fields` (e.g. "No quantified impact in resume", "Kubernetes not present"). Each item has a dismiss button |
| Topic list | Ordered, numbered list of prep topics (from `roadmaps.topics`). Each row: Day number, topic name, learning goal. Editable inline (click to rename topic). Drag handle to reorder |
| Add topic button | "+ Add topic" link at bottom of list |
| Delete topic button | Trash icon on each row, visible on hover |
| Interview date picker | Date input at the top of the topic list: "Interview date: [date picker]" |
| Confirm CTA | Primary button "Confirm Roadmap →" |

**Layout Notes:** Single-column, scrollable. Flagged fields panel appears at the top before the topic list. Keep the topic list rows compact — target 8–10 rows visible without scrolling.

**Primary User Action:** Click "Confirm Roadmap →" → save the finalised roadmap to the DB → navigate to WhatsApp Connect screen.

---

## Screen 4 — WhatsApp Connect

**Purpose:** Pair the user's WhatsApp account with PrepPilot so the coaching loop can begin. Uses the Twilio Sandbox opt-in flow (user sends a join code from their phone).

**Key UI Elements:**

| Element | Detail |
|---|---|
| Progress indicator | Step 3 of 3: "Connect WhatsApp" highlighted |
| Screen heading | "One last step — connect your WhatsApp" |
| Instruction block | Numbered steps: (1) Open WhatsApp on your phone (2) Message this number: +1 415 523 8886 (3) Send the message: `join <your-sandbox-code>` |
| Sandbox number display | Large, copyable text showing the Twilio sandbox number with a "Copy" button |
| Join code display | Highlighted code badge: `join silver-hammer` (or whatever the sandbox code is), with a "Copy" button |
| Status indicator | Polling badge: "Waiting for connection…" (amber) → "✓ Connected!" (green) once opt-in is detected |
| WhatsApp number field | Input: "Your WhatsApp number" with country-code selector — saved to `users.whatsapp_number` |
| CTA button | "I've sent the message" — triggers a check and advances if connected; shows error if not yet confirmed |
| Skip link | Small text link: "Skip for now — I'll connect later" (goes straight to Dashboard) |

**Layout Notes:** Centred single column. The instruction block should feel like a step-by-step card. The status indicator should be visually prominent and animate between states.

**Primary User Action:** Click "I've sent the message" → verify opt-in → navigate to Dashboard.

---

## Screen 5 — Dashboard

**Purpose:** The ongoing home screen once the user is set up. Shows progress at a glance, motivates continued engagement, and surfaces any action required (e.g. answer today's question if unanswered).

**Key UI Elements:**

| Element | Detail |
|---|---|
| Top nav | Logo left, user email/avatar right with logout option |
| Readiness Score | Large circular/ring chart — single number 0–100 labelled "Readiness Score". Colour-coded: red <40, amber 40–70, green >70 |
| Today's question card | Highlighted card: shows today's question text, topic, and day number. If already answered: shows the score + a snippet of Claude's feedback. If unanswered: shows a "Check WhatsApp" prompt |
| Topic accuracy chart | Bar chart or segmented list: each topic covered so far with an average score bar. E.g. "System Design — 72%", "Kubernetes — 55%" |
| Roadmap completion | Horizontal progress bar: "Day 5 of 14 complete" with a mini version of the topic list on hover |
| Weekly summary card | Text card: total questions answered this week, average score, biggest improvement, weakest area. Refreshes every Sunday |
| WhatsApp status badge | Small status chip in the corner: "WhatsApp Connected ✓" or "WhatsApp Not Connected" with a link to reconnect |

**Layout Notes:** Two-column grid on desktop — Readiness Score + Today's Question in the left column (wide), topic accuracy chart + roadmap progress in the right column (narrow). Weekly summary full-width at the bottom. Mobile: single column, stacked in the same order.

**Primary User Action:** (No single action — this is a read/monitor screen. The micro-action is clicking "Check WhatsApp" on Today's Question card to be reminded to reply.)
