# om-ai-pilot

AI-powered tools for operations management education. Built with Next.js, this app provides two features: a Socratic tutoring chatbot and an AI case study generator that pulls from real-world news instead of outdated textbook examples.

## Features

| Feature | Route | Purpose |
|---|---|---|
| Socratic Tutor | `/tutor` | Guides students to answers through questions rather than giving them directly |
| Case Study Generator | `/case-study` | Generates structured educational case studies from current news events |
| Library | `/case-study/library` | Saves, organizes, and exports generated case studies as PDF |

---

## Project structure

```
om-ai-pilot/
├── src/
│   └── frontend/                       ← Next.js app (UI + API routes)
│       ├── app/
│       │   ├── layout.tsx              ← shared header/nav
│       │   ├── page.tsx                ← landing page
│       │   ├── globals.css             ← design tokens + global styles
│       │   ├── tutor/
│       │   │   └── page.tsx            ← tutor chat UI
│       │   ├── case-study/
│       │   │   ├── page.tsx            ← generator (3-step flow)
│       │   │   └── library/
│       │   │       └── page.tsx        ← saved case studies
│       │   └── api/
│       │       ├── tutor/
│       │       │   └── route.ts        ← POST /api/tutor
│       │       └── case-study/
│       │           ├── research/
│       │           │   └── route.ts    ← POST /api/case-study/research
│       │           ├── generate/
│       │           │   └── route.ts    ← POST /api/case-study/generate
│       │           └── library/
│       │               ├── route.ts    ← GET/POST /api/case-study/library
│       │               └── [id]/
│       │                   ├── route.ts          ← GET/PUT/DELETE
│       │                   └── export/
│       │                       └── route.ts      ← GET (PDF download)
│       ├── lib/
│       │   └── db.ts                   ← SQLite client (better-sqlite3)
│       ├── .env.local                  ← API keys (not committed)
│       └── package.json
└── README.md
```

---

## Setup

### Requirements

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A [Tavily API key](https://tavily.com) — free tier is sufficient

### Install dependencies

```bash
cd src/frontend
npm install
```

### Environment variables

Create `src/frontend/.env.local`:

```
OPENAI_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here
```

These are server-side only — never exposed to the browser.

### Run locally

```bash
cd src/frontend
npm run dev
```

Open `http://localhost:3000`.

---

## How it works

### Socratic Tutor (`/tutor`)

A chat interface backed by GPT-4o with a system prompt that enforces Socratic method — it never gives answers directly, always responds with a guiding question. Maintains conversation history client-side for the duration of the session.

### Case Study Generator (`/case-study`)

Three-step flow:

**Step 1 — Research**
The educator enters a concept (e.g. "bullwhip effect"), course, education level, and date range. The app searches the web via Tavily, then uses GPT-4o to evaluate and select the 3-5 most relevant real-world examples, each with a summary and explanation of why it illustrates the concept. A debug panel shows the raw Tavily results for evaluation.

**Step 2 — Select**
The educator reviews the curated articles and selects one or more to use as source material. They also add learning objectives and any additional instructions.

**Step 3 — Generate**
GPT-4o synthesizes the selected articles into a structured educational case study with eight sections: title & overview, background, the challenge, key stakeholders, timeline of events, data & evidence, discussion questions, and educator-only teaching notes.

### Library (`/case-study/library`)

Generated case studies can be saved to a local SQLite database (`case_studies.db`), grouped by concept. Supports rename, delete, full case study view, and PDF export via ReportLab (Python) — served from a Next.js API route.

### API route summary

| Method | Route | Description |
|---|---|---|
| POST | `/api/tutor` | Send a message to the Socratic tutor |
| POST | `/api/case-study/research` | Search for real-world examples of a concept |
| POST | `/api/case-study/generate` | Generate a case study from selected articles |
| GET | `/api/case-study/library` | List all saved case studies grouped by concept |
| POST | `/api/case-study/library` | Save a generated case study |
| GET | `/api/case-study/library/[id]` | Get a single saved case study |
| PUT | `/api/case-study/library/[id]` | Rename a saved case study |
| DELETE | `/api/case-study/library/[id]` | Delete a saved case study |
| GET | `/api/case-study/library/[id]/export` | Download as PDF |

---

## Roadmap

- [x] Socratic tutor chatbot
- [x] Case study generator
- [x] Researcher (concept → curated real-world examples via Tavily + GPT)
- [x] Connected flow (research → select → generate)
- [x] Save / library with full CRUD
- [x] PDF export
- [x] Next.js migration (consolidated frontend + API routes)
- [ ] Deploy to Vercel
- [ ] Prompt tuning based on real-world testing
- [ ] Export to Word (.docx)
- [ ] Student-facing view (read-only case study page)

---

## Notes for contributors

- All API keys must be in `src/frontend/.env.local` — never commit this file
- The SQLite database (`case_studies.db`) lives in `src/frontend` and is auto-created on first use
- Prompts are defined inline in each API route file — worth extracting to a `lib/prompts.ts` as they grow
- The old Flask backend (`src/backend/`) and HTML/JS frontends (`src/tutor/frontend/`, `src/case_study/frontend/`) are no longer used and can be deleted
