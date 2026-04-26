# ProtocolForge AI

**From hypothesis to lab-ready experiment plan.**

ProtocolForge is a scientist-in-the-loop experiment planning tool. Paste a scientific hypothesis and it generates an operational plan — protocol steps, materials, budget, timeline, validation plan, controls, and risk table — while maintaining a persistent skill memory that improves future plans from expert corrections.

> **Disclaimer:** ProtocolForge produces planning drafts only. Every plan must be reviewed by a qualified scientist, ethics board, and relevant safety personnel before lab execution.

---

## How it works

```
Hypothesis → Clarify (3–5 questions) → Literature QC → Experiment Plan → Expert Feedback → Skill Memory
```

1. **Hypothesis input** — paste a free-text hypothesis; the system parses domain, model, intervention, and primary outcome
2. **Clarification** — 3–5 multiple-choice questions lock the plan to your actual intent (control groups, assay choices, budget mode, etc.)
3. **Literature QC** — Tavily-powered search returns traffic-light novelty signal (novel / similar / exact match) with reference cards
4. **Experiment plan** — full structured plan: protocol steps, materials table with supplier lookup, budget lines, Gantt timeline, validation plan, controls, and risk register
5. **Expert feedback** — scientists annotate the plan with text-level comments; the system distills corrections into reusable skill rules
6. **Skill memory** — rules are stored and automatically applied to future plans in the same domain/experiment type

---

## Tech stack

- **Framework:** Next.js 13 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui primitives
- **Database:** Supabase (PostgreSQL)
- **Literature search:** Tavily Search API
- **LLM:** OpenAI, Groq, or OpenRouter (configurable via env vars)
- **Fonts:** Inter, JetBrains Mono, Instrument Serif

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` (or create `.env.local`) and fill in the values you want:

```bash
# LLM — pick one
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
OLLAMA_BASE_URL=http://localhost:11434   # for local Ollama

# Literature search
TAVILY_API_KEY=tvly-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

If you want real persistence and evidence, set Supabase + Tavily + an LLM provider.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database setup (Supabase)

If you want persistent storage, run the migration in the Supabase SQL editor:

```bash
supabase/001_protocolforge.sql
```

This creates the following tables:

| Table | Description |
|---|---|
| `projects` | Hypothesis + parsed fields |
| `clarification_answers` | Scientist answers to clarifying questions |
| `literature_qc` | Novelty signal + confidence per project |
| `literature_results` | Individual reference records |
| `plans` | Full generated plan JSON |
| `comments` | Expert feedback annotations on plan sections |
| `skill_rules` | Distilled reusable planning rules |
| `applied_rules` | Audit log of rules applied to each plan |

Without Supabase configured, data is not persisted between server restarts.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── new/page.tsx                # Hypothesis input
│   ├── projects/page.tsx           # Projects list
│   ├── memory/page.tsx             # Skill memory viewer
│   ├── projects/[id]/
│   │   ├── clarify/page.tsx        # Clarification questions
│   │   ├── literature/page.tsx     # Literature QC results
│   │   └── plan/page.tsx           # Full experiment plan
│   └── api/                        # API route handlers
├── components/
│   ├── AppShell.tsx                # Sidebar + topbar layout shell
│   ├── PlanSection.tsx             # Plan section renderer
│   ├── plan/PlanViews.tsx          # Plan tab views
│   └── ui/                         # shadcn/ui primitives
└── lib/
    ├── llm.ts                      # LLM provider abstraction
    ├── pipeline.ts                 # End-to-end plan generation pipeline
    ├── prompts.ts                  # All LLM prompts
    ├── skillRules.ts               # Rule retrieval and application
    ├── materialGrounding.ts        # Supplier lookup logic
    ├── tavily.ts                   # Literature search client
    ├── resume.ts                   # Project resume-state logic
    ├── env.ts                      # Environment variable helpers
    └── db/
        ├── index.ts                # DB client
        ├── local-store.ts          # Local fallback store (dev only)
        └── types.ts                # TypeScript DB types
```

---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```
