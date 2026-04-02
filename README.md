<p align="center">
  <img src="docs/images/landing-page.png" alt="OxAI â€” Visual AI Studio" width="100%" />
</p>

<h1 align="center">ðŸ§  OxAI â€” Visual AI Studio</h1>

<p align="center">
  <strong>Build, compare, and launch AI systems from one professional workspace.</strong>
</p>

<p align="center">
  <a href="https://oxai-puce.vercel.app">ðŸŒ Live Demo</a> â€¢
  <a href="#-core-modules">ðŸ“¦ Features</a> â€¢
  <a href="#-architecture">ðŸ—ï¸ Architecture</a> â€¢
  <a href="#-quick-start">ðŸš€ Quick Start</a> â€¢
  <a href="#-tech-stack">ðŸ”§ Tech Stack</a> â€¢
  <a href="#-oxloai-models">ðŸ¤– Models</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite" alt="Vite 7" />
  <img src="https://img.shields.io/badge/Tailwind-4.1-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Powered%20by-Oxlo.ai-10B981?style=flat-square" alt="Oxlo.ai" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
</p>

---

## ðŸ“‹ Table of Contents

- [About](#-about)
- [Real-World Use Case](#-real-world-use-case)
- [Live Demo](#-live-demo)
- [Core Modules](#-core-modules)
  - [Prompt Studio](#1--prompt-studio)
  - [Workflow Builder](#2--workflow-builder)
  - [Agent Builder](#3--agent-builder)
  - [Content Pipeline](#4--content-pipeline)
- [Architecture](#-architecture)
- [Workflow Execution Engine](#-workflow-execution-engine)
- [Tech Stack](#-tech-stack)
- [Oxlo.ai Models](#-oxloai-models)
- [Quick Start](#-quick-start)
- [Deployment](#-deployment)
- [GitHub Login Setup](#-github-login-setup)
- [Project Structure](#-project-structure)
- [Sharing & Embed](#-sharing--embed)
- [Hackathon Info](#-hackathon-info)
- [License](#-license)

---

## ðŸŽ¯ About

**OxAI** is a browser-based AI Studio that lets anyone â€” developer or non-technical user â€” visually build, test, version, and deploy AI workflows and agents without infrastructure complexity.

Users drag, connect, and configure AI-powered nodes on a canvas, then run them instantly using **Oxlo.ai's unified multi-model API**. Think of it as a combination of **n8n + PromptLayer + Flowise**, but leaner, faster, and fully powered by Oxlo.ai.

### Why OxAI?

Building AI-powered applications today requires juggling multiple tools:

| Problem | OxAI Solution |
|---------|---------------|
| One tool to write and test prompts | **Prompt Studio** â€” write, compare, version, and rate |
| Another to chain models together | **Workflow Builder** â€” visual drag & drop canvas |
| Another to manage AI agents | **Agent Builder** â€” persona, tools, deploy in one click |
| Another to run content pipelines | **Content Pipeline** â€” batch generation with export |

**OxAI unifies all of this in a single, zero-setup, browser-first experience.**

---

## ðŸ’¡ Real-World Use Case

Teams can prototype and test AI automations without backend setup:

- **Marketing Teams** â†’ Batch-generate blog posts, social media content, and translations
- **Developers** â†’ Build and test multi-step AI workflows with condition logic
- **Product Managers** â†’ Compare model performance side-by-side for better decisions
- **Support Teams** â†’ Deploy custom AI agents with FAQ and tool routing
- **Content Creators** â†’ Run multi-stage content pipelines with SEO optimization

---

## ðŸŒ Live Demo

> **Production URL:** [https://oxai-puce.vercel.app](https://oxai-puce.vercel.app)
>
> Latest deployment: April 2, 2026

---

## ðŸ“¦ Core Modules

### 1. ðŸ§ª Prompt Studio

<p align="center">
  <img src="docs/images/prompt-studio.png" alt="Prompt Studio" width="100%" />
</p>

The Prompt Studio is a full-featured prompt engineering environment with multi-model comparison:

| Feature | Description |
|---------|-------------|
| **Variable Templating** | Use `{{variable}}` syntax for dynamic prompts with auto-detection |
| **Single Model Run** | Execute prompt on any Oxlo model with configurable temperature |
| **Model Comparison** | Run same prompt on 2-3 models simultaneously, compare side-by-side |
| **Version History** | Save, name, load, and delete prompt versions |
| **Version Diff Viewer** | Line-by-line diff comparison between any two saved versions |
| **Prompt Rating** | Rate outputs 1-5 stars, auto-track best-performing version |
| **Model Health Check** | Ping all 6 configured models to verify API connectivity |
| **Keyboard Shortcuts** | `Ctrl+Enter` to run, `Ctrl+S` to save version |

---

### 2. ðŸ”§ Workflow Builder

<p align="center">
  <img src="docs/images/workflow-builder.png" alt="Workflow Builder" width="100%" />
</p>

A visual drag-and-drop workflow canvas powered by React Flow:

| Feature | Description |
|---------|-------------|
| **5 Node Types** | Input, AI Model, Transform, Condition, Output |
| **Drag & Drop** | Drag nodes from palette onto canvas |
| **Visual Connections** | Connect nodes with animated emerald edges |
| **Topological Execution** | Smart graph traversal with per-node status tracking |
| **Condition Branching** | If/else routing with `true`/`false` output handles |
| **Per-Node Results** | Each node shows its output, errors, or skip reason |
| **Workflow Management** | Save, load, duplicate, delete, rename workflows |
| **Export JSON** | Download workflow as a portable JSON file |
| **Share Link** | Generate shareable Base64-encoded URL |
| **Circular Dependency Detection** | Prevents infinite execution loops |

---

### 3. ðŸ¤– Agent Builder

<p align="center">
  <img src="docs/images/agent-builder.png" alt="Agent Builder" width="100%" />
</p>

Build and deploy AI agents with persona configuration and tool routing:

| Feature | Description |
|---------|-------------|
| **4 Templates** | Customer Support, Research Assistant, Code Reviewer, Content Writer |
| **Persona & Instructions** | Define personality and behavioral guidelines |
| **6 Tools** | Summarizer, Web Search, Calculator, Code Analyzer, Tone Adjuster, FAQ |
| **Tool Trace Display** | See which tools were triggered and their outputs |
| **Multi-Turn Chat** | Full conversation context sent with each message |
| **Auto System Prompt** | Generated from persona + instructions + enabled tools |
| **One-Click Deploy** | Generate shareable agent link |
| **Embeddable Widget** | Copy iframe snippet for any website |
| **Agent Save/Load** | Persist configurations to browser storage |

---

### 4. ðŸ“¦ Content Pipeline

<p align="center">
  <img src="docs/images/content-pipeline.png" alt="Content Pipeline" width="100%" />
</p>

Multi-stage content generation pipeline with batch processing:

| Feature | Description |
|---------|-------------|
| **Pipeline Templates** | Blog Writer, Social Media, Translation |
| **Custom Stages** | Add/remove/reorder generation stages with custom prompts |
| **Stage-by-Stage Execution** | Live output display as each stage completes |
| **Batch Mode** | Process multiple topics from manual input or CSV upload |
| **Export Formats** | Markdown, JSON, or Plain Text |
| **Pipeline Save/Load** | Persist reusable pipelines in browser storage |

---

## ðŸ—ï¸ Architecture

<p align="center">
  <img src="docs/images/architecture.png" alt="OxAI Architecture Diagram" width="100%" />
</p>

### System Architecture

Architecture diagram is shown in the image above (`docs/images/architecture.png`).

### Data Flow

User request flow:

1. User enters prompt or config in OxAI UI.
2. UI updates Zustand state.
3. UI sends request to Oxlo.ai API.
4. API response returns content, token usage, and latency.
5. UI stores result and displays output.

---

## âš™ï¸ Workflow Execution Engine

<p align="center">
  <img src="docs/images/workflow-engine.png" alt="Workflow Execution Engine" width="100%" />
</p>

The Workflow Builder includes a production-grade execution engine:

Execution path:

`Input Node -> AI Model Node -> Transform Node -> Condition Node -> Output Node`

**Engine Features:**

- **Topological Sort** â€” resolves node execution order from the graph structure
- **Blocked Edge Tracking** â€” condition nodes block edges on the inactive branch
- **Skip Detection** â€” nodes on blocked branches are marked as "skipped"
- **Error Isolation** â€” a failing node doesn't crash the entire workflow
- **Circular Dependency Detection** â€” breaks infinite loops gracefully
- **Live Status Updates** â€” each node shows `idle` â†’ `loading` â†’ `success` / `error` / `skipped`

---

## ðŸ”§ Tech Stack

<p align="center">
  <img src="docs/images/tech-stack.png" alt="Tech Stack" width="100%" />
</p>

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 19 + TypeScript 5.9 | UI components with strict type safety |
| **Build Tool** | Vite 7 | Lightning-fast HMR and optimized builds |
| **Styling** | Tailwind CSS v4 | Utility-first CSS with emerald dark theme |
| **Visual Canvas** | React Flow | Drag-and-drop workflow graph editor |
| **State Management** | Zustand | Lightweight store with localStorage persistence |
| **UI Primitives** | Radix UI (Dialog, Select, Tabs, Slot) | Accessible headless components |
| **Icons** | Lucide React | Consistent icon set |
| **Utilities** | CVA, clsx, tailwind-merge | Variant-based component styling |
| **Auth** | GitHub OAuth | Secure login with CSPRNG state validation |
| **Deployment** | Vercel | Edge-optimized hosting with serverless functions |
| **AI Backend** | Oxlo.ai API | Multi-model inference gateway |

### Build Optimization

Code splitting is configured for optimal loading performance:

```
dist/
â”œâ”€â”€ index.js          235 KB (74 KB gzip)  â† React + core framework
â”œâ”€â”€ flow.js           142 KB (46 KB gzip)  â† React Flow (lazy loaded)
â”œâ”€â”€ WorkflowBuilder    23 KB ( 6 KB gzip)  â† Lazy loaded
â”œâ”€â”€ PromptStudio       14 KB ( 4 KB gzip)  â† Lazy loaded
â”œâ”€â”€ ContentPipeline    14 KB ( 4 KB gzip)  â† Lazy loaded
â”œâ”€â”€ AgentBuilder       13 KB ( 5 KB gzip)  â† Lazy loaded
â”œâ”€â”€ icons              20 KB ( 8 KB gzip)  â† Lucide icons chunk
â”œâ”€â”€ state               7 KB ( 3 KB gzip)  â† Zustand chunk
â””â”€â”€ CSS (total)        74 KB (13 KB gzip)
```

---

## ðŸ¤– Oxlo.ai Models

OxAI is configured with **6 models** across 4 providers for comprehensive coverage:

| Model | Provider | Best For |
|-------|----------|----------|
| `gpt-4o` | OpenAI | High-quality reasoning and instruction following |
| `gpt-4o-mini` | OpenAI | Fast, cost-efficient everyday tasks |
| `claude-3-5-sonnet-20241022` | Anthropic | Nuanced writing and analysis |
| `claude-3-5-haiku-20241022` | Anthropic | Ultra-fast responses with good quality |
| `gemini-2.0-flash` | Google | Speed-optimized multimodal tasks |
| `llama-3.3-70b-versatile` | Meta | Open-source alternative with strong performance |

**Why this mix?**

- **Quality vs Speed profiles** â€” users can compare response quality across tiers
- **Cost optimization** â€” mini/haiku models for iteration, premium models for production
- **Model-fit testing** â€” find the right model for each specific use case
- **Multi-model comparison** â€” Prompt Studio runs the same prompt on 2-3 models simultaneously

---

## ðŸš€ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/) v9+
- Oxlo.ai API Key ([Get one here](https://oxlo.ai))

### Installation

```bash
# Clone the repository
git clone https://github.com/panzauto46-bot/OxAI.git
cd OxAI

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`.

### With GitHub Login (requires Vercel CLI)

```bash
# Copy environment variables
cp .env.example .env

# Fill in your GitHub OAuth credentials
# VITE_GITHUB_CLIENT_ID=your_github_oauth_client_id
# GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

# Run with Vercel dev for API routes
npx vercel dev
```

### Production Build

```bash
npm run build
npm run preview
```

---

## â˜ï¸ Deployment

### Deploy to Vercel

```bash
npx vercel --prod --yes
```

### Environment Variables (Vercel Dashboard)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | âœ… |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | âœ… |

### Deployment Config (`vercel.json`)

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

---

## ðŸ” GitHub Login Setup

1. **Create a GitHub OAuth App** in [GitHub Developer Settings](https://github.com/settings/developers)
2. Set **Homepage URL** to your app URL
3. Set **Authorization callback URL** to your app root URL
4. Copy the **Client ID** and **Client Secret**
5. Set environment variables:
   - `VITE_GITHUB_CLIENT_ID` â€” Client ID (exposed to frontend)
   - `GITHUB_CLIENT_SECRET` â€” Client Secret (server-side only)

**Callback URLs:**
| Environment | URL |
|-------------|-----|
| Local | `http://localhost:3000/` (via `vercel dev`) |
| Production | `https://oxai-puce.vercel.app/` |

**Auth Flow:**
1. User clicks "Login with GitHub" on landing page
2. Redirected to GitHub OAuth authorization
3. GitHub redirects back with authorization code
4. Frontend sends code to `api/auth/github/exchange.js` (Vercel serverless)
5. Serverless function exchanges code for access token (client secret stays server-side)
6. Fetches user profile and primary email
7. Returns user data to frontend â†’ stored in Zustand

---

## ðŸ“ Project Structure

```
OxAI/
â”œâ”€â”€ ðŸ“„ index.html                          # Entry point
â”œâ”€â”€ ðŸ“„ package.json                        # Dependencies & scripts
â”œâ”€â”€ ðŸ“„ tsconfig.json                       # Strict TypeScript config
â”œâ”€â”€ ðŸ“„ vite.config.ts                      # Build config + chunk splitting
â”œâ”€â”€ ðŸ“„ vercel.json                         # Deployment config
â”œâ”€â”€ ðŸ“„ .env.example                        # Environment variables template
â”œâ”€â”€ ðŸ“„ LICENSE                             # MIT License
â”‚
â”œâ”€â”€ ðŸ“‚ api/                                # Vercel Serverless Functions
â”‚   â””â”€â”€ ðŸ“‚ auth/github/
â”‚       â””â”€â”€ ðŸ“„ exchange.js                 # OAuth token exchange endpoint
â”‚
â”œâ”€â”€ ðŸ“‚ docs/                               # Documentation
â”‚   â”œâ”€â”€ ðŸ“„ PRD.md                          # Product Requirements Document
â”‚   â”œâ”€â”€ ðŸ“„ ROADMAP.md                      # Development roadmap
â”‚   â””â”€â”€ ðŸ“‚ images/                         # Screenshots & diagrams
â”‚
â””â”€â”€ ðŸ“‚ src/                                # Application source
    â”œâ”€â”€ ðŸ“„ main.tsx                        # React root
    â”œâ”€â”€ ðŸ“„ App.tsx                         # Router + OAuth + lazy loading
    â”œâ”€â”€ ðŸ“„ index.css                       # Global styles + animations
    â”‚
    â”œâ”€â”€ ðŸ“‚ store/
    â”‚   â””â”€â”€ ðŸ“„ useStore.ts                 # Zustand state (persisted)
    â”‚
    â”œâ”€â”€ ðŸ“‚ services/
    â”‚   â”œâ”€â”€ ðŸ“„ oxloApi.ts                  # Oxlo.ai API client
    â”‚   â””â”€â”€ ðŸ“„ githubAuth.ts              # GitHub OAuth client
    â”‚
    â”œâ”€â”€ ðŸ“‚ utils/
    â”‚   â””â”€â”€ ðŸ“„ cn.ts                       # className merger utility
    â”‚
    â””â”€â”€ ðŸ“‚ components/
        â”œâ”€â”€ ðŸ“‚ landing/
        â”‚   â””â”€â”€ ðŸ“„ LandingPage.tsx         # Animated landing page
        â”‚
        â”œâ”€â”€ ðŸ“‚ layout/
        â”‚   â”œâ”€â”€ ðŸ“„ Sidebar.tsx             # Smart collapsible sidebar
        â”‚   â””â”€â”€ ðŸ“„ Header.tsx              # Top bar + API key management
        â”‚
        â”œâ”€â”€ ðŸ“‚ common/
        â”‚   â”œâ”€â”€ ðŸ“„ ApiKeyModal.tsx          # API key setup modal
        â”‚   â”œâ”€â”€ ðŸ“„ OnboardingTips.tsx       # Contextual onboarding tips
        â”‚   â””â”€â”€ ðŸ“„ ToastViewport.tsx        # Toast notification system
        â”‚
        â”œâ”€â”€ ðŸ“‚ ui/                         # Reusable UI primitives
        â”‚   â”œâ”€â”€ ðŸ“„ Button.tsx              # CVA variant button
        â”‚   â”œâ”€â”€ ðŸ“„ Card.tsx                # Card + CardHeader + CardContent
        â”‚   â”œâ”€â”€ ðŸ“„ Input.tsx               # Labeled input field
        â”‚   â”œâ”€â”€ ðŸ“„ Select.tsx              # Labeled select dropdown
        â”‚   â””â”€â”€ ðŸ“„ Textarea.tsx            # Labeled textarea
        â”‚
        â”œâ”€â”€ ðŸ“‚ prompt/
        â”‚   â””â”€â”€ ðŸ“„ PromptStudio.tsx        # Full prompt lab (696 lines)
        â”‚
        â”œâ”€â”€ ðŸ“‚ workflow/
        â”‚   â”œâ”€â”€ ðŸ“„ WorkflowBuilder.tsx     # Visual canvas + engine (916 lines)
        â”‚   â””â”€â”€ ðŸ“‚ nodes/
        â”‚       â”œâ”€â”€ ðŸ“„ InputNode.tsx        # User text input node
        â”‚       â”œâ”€â”€ ðŸ“„ AIModelNode.tsx      # AI model config node
        â”‚       â”œâ”€â”€ ðŸ“„ TransformNode.tsx    # Data transformation node
        â”‚       â”œâ”€â”€ ðŸ“„ ConditionNode.tsx    # If/else branching node
        â”‚       â””â”€â”€ ðŸ“„ OutputNode.tsx       # Result display node
        â”‚
        â”œâ”€â”€ ðŸ“‚ agent/
        â”‚   â””â”€â”€ ðŸ“„ AgentBuilder.tsx         # Agent config + chat (662 lines)
        â”‚
        â””â”€â”€ ðŸ“‚ pipeline/
            â””â”€â”€ ðŸ“„ ContentPipeline.tsx      # Pipeline studio (700+ lines)
```

---

## ðŸ”— Sharing & Embed

### Shared Links

OxAI supports sharing workflows and agents via URL hash payloads:

| Type | URL Format |
|------|-----------|
| Workflow | `https://oxai-puce.vercel.app/#workflow=<base64_payload>` |
| Agent | `https://oxai-puce.vercel.app/#agent=<base64_payload>` |

When opening these links, OxAI automatically switches to the relevant module and loads the shared configuration.

### Embeddable Agent Widget

After deploying an agent, you get an iframe snippet:

```html
<iframe
  src="https://oxai-puce.vercel.app/#agent=<base64_payload>"
  width="420"
  height="640"
  style="border:1px solid #334155; border-radius:12px;"
></iframe>
```

---

## ðŸ† Hackathon Info

**Hackathon:** OxBuild by Oxlo.ai  
**Deadline:** April 5, 2026  
**Live Demo:** [https://oxai-puce.vercel.app](https://oxai-puce.vercel.app)

### Judging Alignment

| Criteria | OxAI's Answer |
|----------|---------------|
| **Relevancy** | AI Studio tools are in massive demand â€” every dev and team needs this |
| **Complexity** | Multi-module platform with workflow engine, multi-model orchestration, React Flow canvas, OAuth, serverless functions |
| **Code Quality** | Strict TypeScript, modular architecture, 0 build errors, code splitting, lazy loading |
| **API Usage** | Substantial Oxlo.ai usage by design â€” multi-model comparison runs 2-3 API calls per prompt, workflow execution calls per AI node, agent chat sends full conversation context |
| **Open Source** | MIT License, public GitHub repository |

### Oxlo.ai API Usage Per Feature

| Feature | API Calls Per Use |
|---------|------------------|
| Prompt single run | 1 call |
| Prompt comparison (3 models) | 3 calls |
| Model health check | 6 calls (all models) |
| Workflow execution | 1 per AI node in graph |
| Agent conversation turn | 1-5 calls (with tool routing) |
| Content pipeline (5-stage) | 5 calls per run |
| Batch content (N topics) | N Ã— stages per batch |
| **Typical session total** | **10-25+ calls** |

---

## ðŸ“„ License

This project is licensed under the **MIT License** â€” see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Pandu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<p align="center">
  Built with ðŸ’š for the <strong>OxBuild Hackathon</strong> by Oxlo.ai
</p>

<p align="center">
  <a href="https://oxai-puce.vercel.app">Live Demo</a> â€¢
  <a href="https://oxlo.ai">Oxlo.ai</a> â€¢
  <a href="https://github.com/panzauto46-bot/OxAI">GitHub</a>
</p>


