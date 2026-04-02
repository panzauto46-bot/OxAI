# Product Requirements Document
## OxAI — Visual AI Studio for Everyone

**Version:** 1.0  
**Author:** Pandu  
**Date:** April 1, 2026  
**Hackathon:** OxBuild by Oxlo.ai

---

## 1. Executive Summary

OxAI is a browser-based AI Studio that lets anyone — developer or non-technical user — visually build, test, version, and deploy AI workflows and agents without infrastructure complexity. Users drag, connect, and configure AI-powered nodes on a canvas, then run them instantly using Oxlo.ai's unified model API. Think of it as a combination of n8n + PromptLayer + Flowise, but leaner, faster, and fully powered by Oxlo.ai.

---

## 2. Problem Statement

Building AI-powered applications today requires juggling multiple tools:

- One tool to write and test prompts
- Another to chain models together
- Another to manage versions
- Another to deploy

There is no single, accessible, open-source studio that unifies all of this. Most existing tools (LangFlow, Flowise, Dify) are complex to self-host and not beginner-friendly. OxAI solves this with a zero-setup, browser-first experience.

---

## 3. Core Modules

### 3.1 🧩 Visual Workflow Canvas (Drag & Drop)

- Canvas-based editor (React Flow)
- **Node types:**
  - **Input Node** — text, file upload, user prompt
  - **AI Model Node** — calls Oxlo.ai model with configurable system prompt
  - **Transform Node** — regex, JSON parse, string manipulation
  - **Condition Node** — if/else branching based on AI output
  - **Output Node** — display result, copy to clipboard, export
- Connect nodes with edges to define data flow
- Run workflow with one click → see live output per node

### 3.2 🧪 Prompt Engineering Studio

- Side-by-side prompt tester: write prompt → see output instantly
- **Model Comparison Mode:** run same prompt on 2–3 different Oxlo models simultaneously, compare responses side by side
- Prompt variables with `{{variable}}` syntax
- Version history: save, name, and diff prompt versions
- Prompt scoring: rate outputs and track best performing version

### 3.3 🤖 No-Code AI Agent Builder

- Pre-built agent templates: Customer Support, Research Assistant, Code Reviewer, Content Writer
- Users configure: persona, instructions, tools (web search, calculator, summarizer)
- Each agent tool call routes through Oxlo.ai API
- One-click deploy → generates shareable chat link (e.g. `oxai.vercel.app/agent/abc123`)
- Embeddable widget snippet for any website

### 3.4 📦 Content Pipeline Studio

- Linear pipeline: Input → Generate → Edit → Format → Export
- **Nodes:** Blog Writer, SEO Optimizer, Translator, Tone Adjuster, Summarizer
- Batch mode: upload CSV of topics → generate content for all rows
- Export as Markdown, JSON, or plain text

---

## 4. Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│                   OxAI (Vite + React)               │
│                                                     │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Visual Canvas│  │ Prompt   │  │ Agent Builder │  │
│  │ (React Flow) │  │ Studio   │  │               │  │
│  └──────┬───────┘  └────┬─────┘  └──────┬────────┘  │
│         └───────────────┼───────────────┘           │
│                         ▼                           │
│              ┌─────────────────────┐                │
│              │  Workflow Engine    │                │
│              │  (Node Executor)    │                │
│              └──────────┬──────────┘                │
└─────────────────────────┼───────────────────────────┘
                          ▼
               ┌──────────────────────┐
               │     Oxlo.ai API      │
               │  (Multiple Models)   │
               │  - Model A           │
               │  - Model B           │
               │  - Model C           │
               └──────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 19, TailwindCSS, Radix UI |
| Canvas Engine | React Flow (reactflow.dev) |
| AI Backend | Oxlo.ai API (multi-model) |
| State Management | Zustand |
| Storage | localStorage |
| Deployment | Vercel (free tier) |

---

## 5. User Flow

### Workflow Builder
1. Open OxAI → Choose mode: `[Workflow Builder] [Prompt Studio] [Agent Builder] [Content Pipeline]`
2. Drag nodes onto canvas
3. Connect: Input → AI Model → Condition → Output
4. Configure each node (model, prompt, params)
5. Click "Run" → see live data flowing through nodes
6. Save workflow → get shareable link

### Prompt Studio
1. Write prompt with `{{variables}}`
2. Fill variable values
3. Click "Compare" → runs on 3 Oxlo models simultaneously
4. See side-by-side output + latency + token count
5. Rate outputs → save best version

### Agent Builder
1. Pick template or start blank
2. Set persona + instructions
3. Add tools (summarizer, web search, Q&A)
4. Test in live chat window
5. Deploy → get shareable chat link

### Content Pipeline
1. Pick pipeline template (Blog, Social, Translation)
2. Input topic or upload CSV
3. Run pipeline → see each stage output
4. Export results

---

## 6. Oxlo.ai API Usage Plan

| Feature | API Calls Per Use |
|---------|------------------|
| Workflow node execution | 1 per AI node |
| Prompt comparison (3 models) | 3 per comparison |
| Agent tool call | 1–5 per conversation turn |
| Content pipeline (5-stage) | 5 per run |
| Batch content generation | N per row |
| **Typical session total** | **10–25 calls** |

> Multi-model usage in Prompt Studio directly satisfies the "substantial API usage" and "higher usage is a plus" criteria.

---

## 7. MVP Scope — 4 Days

### Day 1 — April 1 ✅ (hari ini)
- [x] Init Vite + React + Tailwind, push GitHub
- [x] Setup Oxlo.ai API integration + test all available models
- [x] Build Prompt Studio (single model) — paling cepat, paling mudah
- [x] Add model comparison mode (2 models side by side)

### Day 2 — April 2
- [ ] Integrate React Flow
- [ ] Build Input Node, AI Model Node, Output Node
- [ ] Workflow execution engine (node runner)
- [ ] Basic Condition Node

### Day 3 — April 3
- [ ] Agent Builder UI + persona config
- [ ] Deploy agent → shareable link
- [ ] Content Pipeline (Blog template, 3-stage)
- [ ] Polish UI, dark mode, responsive

### Day 4 — April 4
- [ ] Deploy ke Vercel
- [ ] Write README (use case, models, Oxlo email, demo link)
- [ ] Record demo GIF / screenshot
- [ ] Submit sebelum April 5 deadline ✅

---

## 8. README Checklist (Compliance)

- [ ] Project description + real-world use case
- [ ] Architecture diagram
- [ ] Which Oxlo models were used and why
- [ ] How to run locally (`npm install → npm run dev`)
- [ ] Live demo link (Vercel URL)
- [ ] Registered Oxlo.ai email
- [ ] Screenshots / demo GIF

---

## 9. Judging Alignment

| Criteria | OxAI's Answer |
|----------|---------------|
| Relevancy | AI Studio tools are in massive demand — every dev needs this |
| Complexity | Multi-module platform, workflow engine, multi-model orchestration, React Flow canvas |
| Code Quality | Vite + React + TypeScript + modular architecture, documented nodes |

---

## 10. Why OxAI Will Win

- Tidak ada peserta lain yang submit platform, mayoritas submit chatbot atau single-use tool
- **Substantial Oxlo usage built-in by design** — multi-model comparison per click
- **General purpose** — juri bisa langsung pakai untuk pekerjaan mereka sendiri
- **Live shareable agents** — impressive demo factor
- **Open source** — compliance hackathon terpenuhi
