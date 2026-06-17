# om-ai-pilot

AI-powered tools for operations management education. This repo contains two independent features, each with its own Flask backend and a lightweight HTML/JS frontend for local testing.

| Feature | Status | Purpose |
|---|---|---|
| `tutor` | Working | Socratic tutoring chatbot that guides students to answers rather than giving them directly |
| `case_study` | In progress | Generates current, relevant case studies from real news, instead of relying on outdated textbook examples |

Both frontends are plain HTML/JS for now since they're for local testing only — not yet built for deployment.

---

## Project structure

```
om-ai-pilot/
├── src/
│   ├── tutor/
│   │   ├── backend/
│   │   │   ├── app.py
│   │   │   └── .env
│   │   └── frontend/
│   │       ├── index.html
│   │       ├── app.js
│   │       └── styles.css
│   └── case_study/
│       ├── backend/
│       │   ├── app.py
│       │   └── .env
│       └── frontend/
│           ├── index.html
│           ├── app.js
│           └── styles.css
└── README.md
```

---

## Setup

### Requirements

- Python 3.9+
- pip
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A [Tavily API key](https://tavily.com) (case_study only — free tier is sufficient)

### Install dependencies

Each feature's backend has its own dependencies. From the relevant `backend/` folder:

```bash
pip install flask openai python-dotenv
```

The `case_study` backend additionally needs:

```bash
pip install tavily-python
```

### Environment variables

Each backend folder needs its own `.env` file (not committed to git):

**`src/tutor/backend/.env`**
```
OPENAI_API_KEY=your_key_here
```

**`src/case_study/backend/.env`**
```
OPENAI_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here
```

---

## Running locally

Each feature runs as its own Flask server, on its own port, with its own static frontend. There's no build step — just start the backend and open the HTML file.

### Tutor

```bash
cd src/tutor/backend
python app.py
```
Runs on `http://localhost:5000`. Open `src/tutor/frontend/index.html` in your browser.

### Case study generator

```bash
cd src/case_study/backend
python app.py
```
Runs on `http://localhost:5001`. Open `src/case_study/frontend/index.html` in your browser.

> Both servers can run at the same time since they're on different ports.

---

## How `case_study` works

The case study tool has two components that work together:

1. **Researcher** (`POST /research`) — takes a concept (e.g. "bullwhip effect"), course, education level, and date range. Searches the web via Tavily, then uses GPT to evaluate and select the 3-5 most relevant real-world examples, each with a summary and an explanation of why it illustrates the concept.

2. **Generator** (`POST /generate`) — takes one or more selected articles plus course context and learning objectives, and produces a structured educational case study: background, the challenge, key stakeholders, timeline, supporting data, discussion questions, and educator-only teaching notes.

The frontend walks the user through both steps in sequence: research → select sources → generate. The educator stays in control by reviewing and choosing which sources to use before the case study is generated, rather than the tool picking automatically.

A collapsible debug panel on the selection step shows the raw search results returned by Tavily, separate from the ones GPT selected — useful for evaluating whether the search itself or the selection step needs tuning.

---

## Roadmap

- [x] Case study generator (article → structured case study)
- [x] Researcher (concept → curated real-world examples)
- [x] Connect researcher → generator in one flow
- [ ] Save/library for generated case studies
- [ ] Export to PDF / Word
- [ ] Consolidate `tutor` and `case_study` into a single Flask app (blueprints) once both features are stable
- [ ] Migrate frontend to a proper framework (Next.js) for deployment

---

## Notes for contributors

- Each feature is intentionally isolated right now (separate backend, separate frontend) to avoid breaking one while building the other. They will be consolidated into a single backend with blueprints once both are stable — see Roadmap.
- Prompts live as module-level constants in each `app.py`, not in separate files yet. Worth extracting into a `prompts.py` if they grow further.
- Frontends are plain HTML/JS for fast local iteration. Not representative of the final shipped UI.
