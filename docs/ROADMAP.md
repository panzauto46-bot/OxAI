# OxAI - Development Roadmap
## Visual AI Studio for Everyone | OxBuild by Oxlo.ai Hackathon

**Deadline:** April 5, 2026  
**Timeline:** 4 Days (April 1-4, 2026)

---

## Progress Overview

- Core foundation and Day 1 deliverables completed.
- Workflow engine and management (Day 2 scope) completed.
- Day 3 core modules and UI/UX polish items completed.
- Day 4 production deployment completed on Vercel (April 2, 2026); submission artifacts are still pending.

---

## Day 1 - April 1 (Foundation and Prompt Studio)

### 1.1 Project Setup
- [x] Init Vite + React + TailwindCSS project
- [x] Setup TypeScript configuration
- [x] Install core dependencies (React Flow, Zustand, Radix UI, Lucide)
- [x] Create project structure (`components/`, `services/`, `store/`, `utils/`)
- [x] Setup reusable UI components (Button, Card, Input, Select, Textarea)
- [x] Build responsive layout (Sidebar + Header + Main)
- [x] Setup Zustand store with persistence
- [x] Rename branding to OxAI

### 1.2 Oxlo.ai API Integration
- [x] Create `oxloApi.ts` service module
- [x] Implement `callOxloAPI()` - single model call
- [x] Implement `compareModels()` - multi-model parallel calls
- [x] Define available models (GPT-4o, Claude 3.5, Gemini 2.0, Llama 3.3)
- [x] API Key management (modal + localStorage)
- [x] Variable extraction and replacement (`{{variable}}` syntax)
- [x] Test all available Oxlo models end-to-end
- [x] Error handling improvements (rate limit, timeout, invalid key)

### 1.3 Prompt Engineering Studio
- [x] Basic Prompt Studio UI layout
- [x] Prompt input with `{{variable}}` support
- [x] Variable auto-detection and input fields
- [x] Model Comparison Mode - run same prompt on 2-3 models simultaneously
- [x] Side-by-side response display with latency + token count
- [x] Prompt version history (save, name, list)
- [x] Version diff viewer
- [x] Prompt scoring - rate outputs (1-5 stars)
- [x] Track best performing version per prompt

---

## Day 2 - April 2 (Workflow Canvas Engine)

### 2.1 Visual Workflow Canvas
- [x] React Flow canvas integration
- [x] Drag and drop node palette (sidebar)
- [x] 5 node types created:
  - [x] Input Node - text input / user prompt
  - [x] AI Model Node - model selection + system prompt + temperature
  - [x] Transform Node - regex, JSON parse, string manipulation
  - [x] Condition Node - if/else branching
  - [x] Output Node - display result
- [x] Connect nodes with edges
- [x] Save / Load workflows

### 2.2 Workflow Execution Engine
- [x] Node Runner - execute workflow graph in topological order
- [x] Live data flow visualization (highlight active node)
- [x] Per-node output display (show result inside each node)
- [x] Error handling per node (red border + error message)
- [x] Input Node -> passes text to connected nodes
- [x] AI Model Node -> calls Oxlo.ai API with input data
- [x] Transform Node -> applies transformation to data
- [x] Condition Node -> evaluates condition, routes to correct branch
- [x] Output Node -> displays final result
- [x] "Run Workflow" button -> triggers full execution
- [x] Execution progress indicator (loading spinners per node)

### 2.3 Workflow Management
- [x] Workflow naming and renaming
- [x] Workflow list (saved workflows)
- [x] Delete workflow
- [x] Duplicate workflow
- [x] Shareable workflow link (export as JSON)

---

## Day 3 - April 3 (Agent Builder + Pipeline + Polish)

### 3.1 No-Code AI Agent Builder
- [x] Agent Builder UI - persona and instructions config
- [x] Template selection (Customer Support, Research, Code Reviewer, Content Writer)
- [x] Tool configuration (summarizer, web search, Q&A)
- [x] Live chat testing window
- [x] Agent tool routing through Oxlo.ai API
- [x] Multi-turn conversation with context
- [x] System prompt auto-generation from persona + instructions
- [x] One-click deploy -> generate shareable chat link
- [x] Embeddable widget snippet generator
- [x] Agent configuration save/load

### 3.2 Content Pipeline Studio
- [x] Content Pipeline UI - linear pipeline view
- [x] Pipeline templates (Blog, Social, Translation)
- [x] Pipeline nodes: Blog Writer, SEO Optimizer, Translator, Tone Adjuster, Summarizer
- [x] Stage-by-stage execution with live output
- [x] Batch mode -> upload CSV of topics
- [x] Generate content for all rows
- [x] Export results as Markdown / JSON / Plain Text
- [x] Pipeline save/load

### 3.3 UI/UX Polish
- [x] Dark mode refinement (green dark theme)
- [x] Responsive design (tablet + mobile)
- [x] Loading states and skeleton screens
- [x] Toast notifications for actions
- [x] Keyboard shortcuts (Ctrl+S save, Ctrl+Enter run)
- [x] Smooth transitions and micro-animations
- [x] Global green dark color system across modules
- [x] Empty states with helpful guidance
- [x] Onboarding tooltip / walkthrough
- [x] Smart hover sidebar (auto-expand/collapse on desktop)
- [x] Single-screen animated landing page (3D hero + running marquee + flow animation)
- [x] Sidebar logout option (clear local session and return to landing)
- [x] GitHub OAuth login (client flow + secure token exchange endpoint)
- [x] Landing-first auth flow (GitHub login on landing, auto-enter studio after success)

---

## Day 4 - April 4 (Deploy + Documentation + Submit)

### 4.1 Production Build and Deployment
- [x] Fix all build warnings and errors
- [x] Optimize bundle size
- [x] Deploy to Vercel (Production URL: https://oxai-puce.vercel.app)
- [x] Configure custom domain (if available) - N/A (no custom domain configured in current Vercel account)
- [x] Test live deployment end-to-end
- [x] Verify all 4 modules work on production

### 4.2 Documentation
- [x] Write comprehensive README.md
- [x] Architecture diagram (Mermaid or image)
- [x] Which Oxlo models were used and why
- [x] How to run locally (npm install -> npm run dev)
- [x] Live demo link (Vercel URL): https://oxai-puce.vercel.app
- [ ] Registered Oxlo.ai email
- [ ] Screenshots / demo GIF
- [x] Add LICENSE file (MIT)

### 4.3 Demo and Submission
- [ ] Capture screenshots of all 4 modules
- [ ] Record demo GIF / video
- [ ] Final review of submission requirements
- [ ] Submit before April 5 deadline

---

## Feature Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Prompt Studio (multi-model comparison) | High | Low | **P0 - Must Have** |
| Workflow Execution Engine | High | High | **P0 - Must Have** |
| Agent Chat (Oxlo API routing) | High | Med | **P0 - Must Have** |
| Content Pipeline Execution | Med | Med | **P1 - Should Have** |
| Prompt Version History and Scoring | Med | Low | **P1 - Should Have** |
| Batch CSV Processing | Low | Med | **P2 - Nice to Have** |
| Shareable Agent Links | Med | High | **P2 - Nice to Have** |
| Embeddable Widget | Low | High | **P3 - Future** |

---

## Hackathon Compliance Checklist

- [x] Uses Oxlo.ai API as primary AI backend
- [x] Substantial API usage (multi-model by design)
- [x] TypeScript + modular architecture
- [ ] README with all required sections
- [x] Live demo link
- [ ] Registered Oxlo.ai email included
- [ ] Screenshots / demo media
- [ ] Submitted before April 5 deadline
