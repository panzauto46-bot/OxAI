import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Bot,
  Send,
  Settings,
  Share2,
  Check,
  MessageSquare,
  Search,
  Calculator,
  FileText,
  Code,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  Copy,
  Monitor,
  Smartphone,
  WandSparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { useStore, AgentConfig, Message } from '../../store/useStore';
import { callOxloAPI } from '../../services/oxloApi';
import { useAvailableModels } from '../../hooks/useAvailableModels';

const agentTemplates = [
  {
    id: 'app-builder',
    name: 'App Builder',
    icon: Code,
    persona: 'You are a senior software engineer and product builder.',
    instructions:
      'Build practical web/mobile app solutions. Return implementation-ready plans and code-focused answers that can be executed step-by-step.',
    tools: ['code-analyzer', 'calculator'],
  },
  {
    id: 'customer-support',
    name: 'Customer Support',
    icon: MessageSquare,
    persona: 'You are a friendly and helpful customer support agent.',
    instructions:
      'Help customers with their questions. Be polite, patient, and solution-oriented. If you cannot help, offer to escalate.',
    tools: ['summarizer', 'faq'],
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    icon: Search,
    persona:
      'You are a knowledgeable research assistant with expertise in finding and synthesizing information.',
    instructions:
      'Help users research topics thoroughly. Provide well-structured information with sources when possible.',
    tools: ['summarizer', 'web-search'],
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    icon: Code,
    persona: 'You are an experienced software engineer who reviews code for best practices, bugs, and improvements.',
    instructions:
      'Review code for bugs, security issues, performance, and best practices. Provide constructive feedback with examples.',
    tools: ['code-analyzer'],
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    icon: FileText,
    persona: 'You are a creative content writer who can write engaging content for various purposes.',
    instructions:
      'Write high-quality content that is engaging, well-structured, and tailored to the audience. Ask clarifying questions if needed.',
    tools: ['summarizer', 'tone-adjuster'],
  },
];

const availableTools = [
  { id: 'summarizer', name: 'Summarizer', icon: FileText },
  { id: 'web-search', name: 'Web Search', icon: Search },
  { id: 'calculator', name: 'Calculator', icon: Calculator },
  { id: 'code-analyzer', name: 'Code Analyzer', icon: Code },
  { id: 'tone-adjuster', name: 'Tone Adjuster', icon: Sparkles },
  { id: 'faq', name: 'FAQ Lookup', icon: MessageSquare },
];

const faqKnowledge = [
  {
    keywords: ['refund', 'money back', 'return'],
    answer: 'Refund policy: refunds are available within 14 days for unused services.',
  },
  {
    keywords: ['support', 'contact', 'help desk'],
    answer: 'Support channel: support@company.com (response SLA ~24 hours).',
  },
  {
    keywords: ['pricing', 'plan', 'subscription'],
    answer: 'Pricing summary: Starter, Pro, and Enterprise plans with monthly billing.',
  },
];

interface ToolTrace {
  tool: string;
  output: string;
}

function executeCalculatorTool(input: string): string | null {
  const normalized = input.trim();
  const expression = normalized.toLowerCase().startsWith('calc:')
    ? normalized.slice(5).trim()
    : /^[0-9+\-*/().\s]+$/.test(normalized)
    ? normalized
    : '';

  if (!expression) return null;

  try {
    const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
    if (!safeExpression) return null;
    const result = Function(`"use strict"; return (${safeExpression});`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) return null;
    return `${expression} = ${result}`;
  } catch {
    return 'Unable to evaluate expression.';
  }
}

function executeFaqTool(input: string): string | null {
  const lower = input.toLowerCase();
  for (const item of faqKnowledge) {
    if (item.keywords.some((keyword) => lower.includes(keyword))) {
      return item.answer;
    }
  }
  return null;
}

function executeSummarizerTool(input: string): string | null {
  const lower = input.toLowerCase();
  if (!lower.startsWith('summarize:')) return null;
  const content = input.slice(10).trim();
  if (!content) return null;
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.slice(0, 3).join(' ') || content;
}

function buildToolTraces(tools: string[], input: string): ToolTrace[] {
  const traces: ToolTrace[] = [];

  if (tools.includes('calculator')) {
    const output = executeCalculatorTool(input);
    if (output) traces.push({ tool: 'Calculator', output });
  }

  if (tools.includes('faq')) {
    const output = executeFaqTool(input);
    if (output) traces.push({ tool: 'FAQ Lookup', output });
  }

  if (tools.includes('summarizer')) {
    const output = executeSummarizerTool(input);
    if (output) traces.push({ tool: 'Summarizer', output });
  }

  return traces;
}

function extractCodeBlock(text: string, language: string): string {
  const pattern = new RegExp(`\`\`\`${language}\\s*([\\s\\S]*?)\`\`\``, 'i');
  const match = text.match(pattern);
  return match?.[1]?.trim() || '';
}

function extractLikelyHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (/^<!doctype html>/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return trimmed;
  if (/<(main|section|div|header|footer|nav|article|button|input|form|h1|h2|p)\b/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function buildPreviewDocument(content: string): { srcDoc: string; code: string } | null {
  const htmlBlock = extractCodeBlock(content, 'html');
  const cssBlock = extractCodeBlock(content, 'css');
  const jsBlock = extractCodeBlock(content, 'js');

  const htmlSource = htmlBlock || extractLikelyHtml(content);
  if (!htmlSource && !cssBlock && !jsBlock) return null;

  if (/<!doctype html>/i.test(htmlSource) || /<html[\s>]/i.test(htmlSource)) {
    return {
      srcDoc: htmlSource,
      code: htmlSource,
    };
  }

  const srcDoc = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f6f7f9;
      color: #111827;
    }
    ${cssBlock || ''}
  </style>
</head>
<body>
${htmlSource || '<main style="padding:24px"><p>No HTML code found.</p></main>'}
  <script>
    ${jsBlock || ''}
  </script>
</body>
</html>`;

  const codeParts = [];
  if (htmlSource) {
    codeParts.push(['```html', htmlSource, '```'].join('\n'));
  }
  if (cssBlock) {
    codeParts.push(['```css', cssBlock, '```'].join('\n'));
  }
  if (jsBlock) {
    codeParts.push(['```js', jsBlock, '```'].join('\n'));
  }

  return {
    srcDoc,
    code: codeParts.join('\n\n'),
  };
}

type DesignTarget = 'web' | 'mobile' | 'responsive';
const PREVIEW_PANEL_DEFAULT_WIDTH = 420;
const PREVIEW_PANEL_MIN_WIDTH = 320;
const PREVIEW_PANEL_MAX_WIDTH = 900;
const CHAT_PANEL_MIN_WIDTH = 420;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getDesignTargetLabel(target: DesignTarget): string {
  if (target === 'mobile') return 'mobile-first app interface';
  if (target === 'web') return 'desktop-first web interface';
  return 'responsive interface (desktop and mobile)';
}

function buildDesignSystemInstruction(designTarget: DesignTarget): string {
  return [
    'Design mode is ON. You are both a senior UI/UX designer and frontend engineer.',
    `Primary target: ${getDesignTargetLabel(designTarget)}.`,
    'Do not return plain or generic UI. The visual direction must feel intentional and premium.',
    'Never use placeholder snippets like "..." or incomplete code.',
    'Always include these sections in this order:',
    '1) Design Concept (style direction, user persona fit, UX rationale).',
    '2) Feature Breakdown (main sections/components and interaction flow).',
    '3) Implementation (full code).',
    'Implementation rules:',
    '- Always include a complete, renderable implementation.',
    '- Prefer one full HTML document in ```html``` (with <style> and optional <script>).',
    '- If you also provide separate ```css``` / ```js``` blocks, they must be complete and production-ready.',
    '- Prefer custom CSS variables for color, spacing, radius, shadows, and typography scale.',
    '- Use strong layout hierarchy, responsive behavior, and states (hover/focus/active).',
    '- Avoid default/system-looking UI. Add visual depth with gradients, elevation, and refined spacing.',
    '- Use expressive but clean styling (not boring, not noisy).',
    '- If useful, include a small ```js``` block for interactions.',
  ].join('\n');
}

function buildDesignExecutionBrief(messageInput: string, designTarget: DesignTarget): string {
  return [
    'Design Execution Brief:',
    `- User request: ${messageInput}`,
    `- Output target: ${getDesignTargetLabel(designTarget)}`,
    '- Deliver an implementation-ready UI concept with concrete structure.',
    '- Include a clear feature structure (hero, nav, sections, CTA, forms/cards if relevant).',
    '- Output must be renderable directly in preview using HTML/CSS code blocks.',
  ].join('\n');
}

function buildDesignPolishInstruction(messageInput: string, designTarget: DesignTarget): string {
  return [
    'Quality upgrade request: the previous design is too basic.',
    `Rebuild the same product request in a premium style for ${getDesignTargetLabel(designTarget)}.`,
    `Original request: ${messageInput}`,
    'Output format must still be:',
    '1) Design Concept',
    '2) Feature Breakdown',
    '3) Full implementation code',
    'Visual quality requirements:',
    '- Strong visual hierarchy and spacing rhythm',
    '- Modern color system with depth and contrast',
    '- Better typography scale and button ergonomics',
    '- Distinct interactive states and cleaner component polish',
    '- No bare default controls',
    'Return complete renderable code with no placeholders.',
  ].join('\n');
}

function countMatches(text: string, expression: RegExp): number {
  const matches = text.match(expression);
  return matches ? matches.length : 0;
}

function isLowFidelityDesign(code: string): boolean {
  const normalized = code.toLowerCase();
  const lengthScore = normalized.length > 1600 ? 1 : 0;
  const hasGradient = /(linear-gradient|radial-gradient|conic-gradient)/.test(normalized) ? 1 : 0;
  const hasShadow = /box-shadow/.test(normalized) ? 1 : 0;
  const hasRadius = /border-radius/.test(normalized) ? 1 : 0;
  const hasVariables = /:root\s*\{[\s\S]*--/.test(normalized) ? 1 : 0;
  const hasTransitions = /(transition|transform)/.test(normalized) ? 1 : 0;
  const hasLayout = /(display:\s*grid|display:\s*flex)/.test(normalized) ? 1 : 0;
  const buttonCount = countMatches(normalized, /<button/g);

  const score =
    lengthScore +
    hasGradient +
    hasShadow +
    hasRadius +
    hasVariables +
    hasTransitions +
    hasLayout +
    (buttonCount >= 8 ? 1 : 0);

  return score < 6;
}

interface AgentBlueprint {
  name: string;
  persona: string;
  instructions: string;
  tools: string[];
  designMode: boolean;
  designTarget: DesignTarget;
  templateId: string;
  templateName: string;
}

function isCalculatorRequest(input: string): boolean {
  return /(calculator|kalkulator|calc\b|hitung)/i.test(input);
}

function buildPremiumCalculatorResponse(userGoal: string, designTarget: DesignTarget): string {
  const targetLabel =
    designTarget === 'mobile'
      ? 'mobile-first'
      : designTarget === 'web'
      ? 'desktop-first'
      : 'responsive desktop-mobile';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Premium Calculator</title>
  <style>
    :root{
      --bg-1:#10002b;
      --bg-2:#3a0ca3;
      --surface:rgba(18, 14, 43, .72);
      --surface-2:rgba(34, 24, 72, .9);
      --text:#f8f7ff;
      --muted:#b6b2d4;
      --accent:#ff7b00;
      --accent-2:#ff9e00;
      --key:#5a4e87;
      --key-hover:#6a5a9c;
      --radius-xl:28px;
      --radius-lg:16px;
      --shadow-1:0 24px 60px rgba(5,2,20,.45);
      --shadow-2:inset 0 1px 0 rgba(255,255,255,.08);
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0;
      color:var(--text);
      font-family:"Poppins","Segoe UI",system-ui,-apple-system,sans-serif;
      background:
        radial-gradient(1200px 800px at 15% 10%, #4f0d9f 0%, transparent 55%),
        radial-gradient(1000px 700px at 90% 90%, #1f4ed8 0%, transparent 50%),
        linear-gradient(145deg,var(--bg-1),var(--bg-2));
      display:grid;
      place-items:center;
      padding:18px;
    }
    .app{
      width:min(420px,95vw);
      background:var(--surface);
      border:1px solid rgba(255,255,255,.14);
      border-radius:var(--radius-xl);
      box-shadow:var(--shadow-1),var(--shadow-2);
      backdrop-filter:blur(12px);
      overflow:hidden;
      animation:rise .55s ease-out both;
    }
    .top{
      padding:20px 20px 10px;
      border-bottom:1px solid rgba(255,255,255,.08);
    }
    .meta{
      display:flex;
      align-items:center;
      justify-content:space-between;
      margin-bottom:12px;
      color:var(--muted);
      font-size:.74rem;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .display{
      min-height:96px;
      border-radius:20px;
      background:linear-gradient(180deg,#2b2055,#1d163b);
      border:1px solid rgba(255,255,255,.08);
      box-shadow:inset 0 10px 30px rgba(0,0,0,.25);
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:flex-end;
      padding:12px 16px;
      gap:4px;
    }
    .history{
      min-height:20px;
      font-size:.9rem;
      color:#a8a2cb;
      opacity:.92;
      font-variant-numeric:tabular-nums;
      max-width:100%;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .result{
      font-size:clamp(2rem,5vw,2.7rem);
      font-weight:700;
      line-height:1;
      color:#fff;
      text-shadow:0 6px 18px rgba(0,0,0,.34);
      font-variant-numeric:tabular-nums;
      max-width:100%;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .keys{
      padding:16px 16px 18px;
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:12px;
      background:var(--surface-2);
    }
    button{
      border:0;
      border-radius:14px;
      background:var(--key);
      color:#fff;
      font-size:1.18rem;
      font-weight:600;
      min-height:58px;
      cursor:pointer;
      transition:transform .12s ease, filter .2s ease, background .2s ease;
      box-shadow:0 8px 18px rgba(0,0,0,.18);
    }
    button:hover{transform:translateY(-1px);background:var(--key-hover)}
    button:active{transform:translateY(1px) scale(.99)}
    .op{
      background:linear-gradient(160deg,var(--accent),var(--accent-2));
      color:#fff;
    }
    .op:hover{filter:brightness(1.08)}
    .muted{background:#6f6794;color:#f4f0ff}
    .wide{grid-column:span 2}
    .hint{
      padding:0 18px 16px;
      color:var(--muted);
      font-size:.75rem;
      text-align:center;
    }
    @keyframes rise{
      from{opacity:0;transform:translateY(18px) scale(.98)}
      to{opacity:1;transform:translateY(0) scale(1)}
    }
    @media (max-width:430px){
      .app{border-radius:22px}
      .keys{gap:10px}
      button{min-height:54px;font-size:1.06rem}
    }
  </style>
</head>
<body>
  <main class="app">
    <section class="top">
      <div class="meta">
        <span>Premium Calculator</span>
        <span>${targetLabel}</span>
      </div>
      <div class="display" aria-live="polite">
        <div class="history" id="history"></div>
        <div class="result" id="result">0</div>
      </div>
    </section>
    <section class="keys">
      <button class="muted" data-action="clear">AC</button>
      <button class="muted" data-action="delete">⌫</button>
      <button class="muted" data-value="%">%</button>
      <button class="op" data-value="/">÷</button>

      <button data-value="7">7</button>
      <button data-value="8">8</button>
      <button data-value="9">9</button>
      <button class="op" data-value="*">×</button>

      <button data-value="4">4</button>
      <button data-value="5">5</button>
      <button data-value="6">6</button>
      <button class="op" data-value="-">−</button>

      <button data-value="1">1</button>
      <button data-value="2">2</button>
      <button data-value="3">3</button>
      <button class="op" data-value="+">+</button>

      <button data-value="0" class="wide">0</button>
      <button data-value=".">.</button>
      <button class="op" data-action="equals">=</button>
    </section>
    <p class="hint">Built for smooth interaction and clean readability.</p>
  </main>

  <script>
    const historyEl = document.getElementById('history');
    const resultEl = document.getElementById('result');
    const keys = document.querySelector('.keys');
    let expression = '';

    function render() {
      if (!expression) {
        historyEl.textContent = '';
        resultEl.textContent = '0';
        return;
      }
      historyEl.textContent = expression;
      resultEl.textContent = expression;
    }

    function safeEval(exp) {
      const sanitized = exp.replace(/[^0-9+\\-*/%.()]/g, '');
      if (!sanitized) return '0';
      try {
        const value = Function('"use strict"; return (' + sanitized + ')')();
        if (!Number.isFinite(value)) return 'Error';
        return Number(value.toFixed(8)).toString();
      } catch {
        return 'Error';
      }
    }

    keys.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target) return;
      const action = target.dataset.action;
      const value = target.dataset.value;

      if (action === 'clear') {
        expression = '';
        render();
        return;
      }
      if (action === 'delete') {
        expression = expression.slice(0, -1);
        render();
        return;
      }
      if (action === 'equals') {
        const evaluated = safeEval(expression);
        historyEl.textContent = expression + ' =';
        expression = evaluated === 'Error' ? '' : evaluated;
        resultEl.textContent = evaluated;
        return;
      }
      if (value) {
        expression += value;
        render();
      }
    });
  </script>
</body>
</html>`;

  return [
    'Design Concept',
    `A premium, modern calculator UI inspired by fintech app aesthetics. It uses deep gradient backgrounds, glassmorphism surface layers, ergonomic key sizing, and high-contrast typography for fast readability.`,
    '',
    'Feature Breakdown',
    '- Target: ' + targetLabel,
    '- Layered visual depth with gradient atmosphere + blurred card container',
    '- Large keypad with clear operator separation and strong tap targets',
    '- Live expression history + result area with tabular numeric readability',
    '- Smooth hover/press states for better perceived quality',
    '',
    `User request captured: ${userGoal}`,
    '',
    'Implementation',
    '```html',
    html,
    '```',
  ].join('\n');
}

const templateKeywordMap: Record<string, string[]> = {
  'app-builder': [
    'build',
    'builder',
    'create app',
    'develop',
    'app',
    'application',
    'aplikasi',
    'website',
    'web',
    'frontend',
    'backend',
    'mobile',
    'android',
    'ios',
    'dashboard',
    'tool',
    'calculator',
    'kalkulator',
    'kode',
  ],
  'customer-support': ['support', 'customer', 'ticket', 'refund', 'help', 'cs', 'layanan'],
  'research-assistant': ['research', 'market', 'analyst', 'analysis', 'compare', 'riset'],
  'code-reviewer': ['code', 'coding', 'debug', 'developer', 'program', 'script', 'bug'],
  'content-writer': ['content', 'copywriting', 'caption', 'article', 'blog', 'marketing', 'konten'],
};

function unique<T>(list: T[]): T[] {
  return [...new Set(list)];
}

function toTitleWords(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function buildAgentName(goal: string, fallback: string): string {
  const cleaned = goal.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  const head = cleaned.split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
  return head ? `${toTitleWords(head)} Agent` : fallback;
}

function inferDesignMode(goal: string): { designMode: boolean; designTarget: DesignTarget } {
  const lower = goal.toLowerCase();
  const isDesign = /(ui|ux|web|website|landing|mobile|app|aplikasi|design|figma)/.test(lower);
  if (!isDesign) {
    return { designMode: false, designTarget: 'responsive' };
  }

  if (/(mobile|android|ios)/.test(lower) && !/(web|website|desktop)/.test(lower)) {
    return { designMode: true, designTarget: 'mobile' };
  }

  if (/(web|website|desktop|landing page)/.test(lower) && !/(mobile|android|ios)/.test(lower)) {
    return { designMode: true, designTarget: 'web' };
  }

  return { designMode: true, designTarget: 'responsive' };
}

function inferAgentBlueprint(goal: string): AgentBlueprint {
  const lower = goal.toLowerCase();
  const appBuilderTemplate = agentTemplates.find((template) => template.id === 'app-builder') || agentTemplates[0];
  const shouldForceAppBuilder = /(buat|build|create|design|ui|ux|app|aplikasi|website|landing|dashboard|calculator|kalkulator|prototype)/.test(lower);

  const selectedTemplate = shouldForceAppBuilder
    ? appBuilderTemplate
    : (() => {
        const scoredTemplates = agentTemplates.map((template) => {
          const keywords = templateKeywordMap[template.id] || [];
          const score = keywords.reduce((sum, keyword) => sum + (lower.includes(keyword) ? 1 : 0), 0);
          return { template, score };
        });
        scoredTemplates.sort((a, b) => b.score - a.score);
        return scoredTemplates[0]?.template || agentTemplates[0];
      })();

  const extraTools: string[] = [];
  if (/(hitung|calculate|math|formula)/.test(lower)) extraTools.push('calculator');
  if (/(faq|refund|pricing|subscription|support)/.test(lower)) extraTools.push('faq');
  if (/(ringkas|summarize|summary)/.test(lower)) extraTools.push('summarizer');
  if (/(search|research|riset|trend|market)/.test(lower)) extraTools.push('web-search');
  if (/(code|debug|bug|programming)/.test(lower)) extraTools.push('code-analyzer');
  if (/(tone|style|rewrite|rephrase)/.test(lower)) extraTools.push('tone-adjuster');

  const { designMode, designTarget } = inferDesignMode(goal);
  const finalTools = unique([...selectedTemplate.tools, ...extraTools]);

  const missionLine = `Primary mission: ${goal}`;
  const designLine = designMode
    ? `Design mode requirement: generate ${designTarget} UI/UX output with implementation-ready code.`
    : 'Design mode requirement: off unless explicitly requested by the user.';

  return {
    name: buildAgentName(goal, `${selectedTemplate.name} Agent`),
    persona: selectedTemplate.persona,
    instructions: [selectedTemplate.instructions, missionLine, designLine].join('\n\n'),
    tools: finalTools,
    designMode,
    designTarget,
    templateId: selectedTemplate.id,
    templateName: selectedTemplate.name,
  };
}

export function AgentBuilder() {
  const {
    apiKey,
    agents,
    currentAgent,
    setCurrentAgent,
    saveAgent,
    deleteAgent,
    agentMessages,
    addAgentMessage,
    clearAgentMessages,
    addToast,
  } = useStore();
  const { models: availableModels, modelOptions, defaultModelId } = useAvailableModels(apiKey);

  const lastAutoGoalRef = useRef('');
  const [agentName, setAgentName] = useState('');
  const [agentGoalPrompt, setAgentGoalPrompt] = useState('');
  const [autoAgentStatus, setAutoAgentStatus] = useState(
    'Describe your goal and Agent Builder will auto-configure everything.'
  );
  const [lastTemplateName, setLastTemplateName] = useState('Not selected');
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [persona, setPersona] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(defaultModelId);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolTraces, setToolTraces] = useState<ToolTrace[]>([]);
  const [designMode, setDesignMode] = useState(false);
  const [designTarget, setDesignTarget] = useState<'web' | 'mobile' | 'responsive'>('responsive');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewSrcDoc, setPreviewSrcDoc] = useState('');
  const [previewCode, setPreviewCode] = useState('');
  const [previewStatus, setPreviewStatus] = useState(
    'Enable Design Mode and ask your agent to generate UI/UX code to see live preview.'
  );
  const [previewCodeCopied, setPreviewCodeCopied] = useState(false);
  const [deployedLink, setDeployedLink] = useState('');
  const [embedSnippet, setEmbedSnippet] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [centerPanelMode, setCenterPanelMode] = useState<'chat' | 'code'>('chat');
  const [sharedImportError, setSharedImportError] = useState<string | null>(null);
  const [previewPanelWidth, setPreviewPanelWidth] = useState(PREVIEW_PANEL_DEFAULT_WIDTH);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const previewResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const generatedSystemPrompt = useMemo(() => {
    const activeTools = selectedTools
      .map((toolId) => availableTools.find((tool) => tool.id === toolId)?.name || toolId)
      .join(', ');

    const designInstruction = designMode ? buildDesignSystemInstruction(designTarget) : '';

    return [
      persona.trim() || 'You are a helpful AI assistant.',
      instructions.trim() || 'Answer clearly and directly.',
      `Enabled tools: ${activeTools || 'None'}.`,
      'If tool outputs are provided in the user message context, prioritize those outputs when answering.',
      designInstruction,
    ].join('\n\n');
  }, [persona, instructions, selectedTools, designMode, designTarget]);

  const applyGoalPrompt = useCallback(
    (goalPrompt: string, source: 'auto' | 'manual') => {
      const trimmedGoal = goalPrompt.trim();
      if (!trimmedGoal) return;

      const blueprint = inferAgentBlueprint(trimmedGoal);
      setAgentName(blueprint.name);
      setPersona(blueprint.persona);
      setInstructions(blueprint.instructions);
      setSelectedTools(blueprint.tools);
      setDesignMode(blueprint.designMode);
      setDesignTarget(blueprint.designTarget);
      setLastTemplateName(blueprint.templateName);
      lastAutoGoalRef.current = trimmedGoal;
      setAutoAgentStatus(
        source === 'auto'
          ? `Auto-configured with ${blueprint.templateName} template.`
          : `Applied ${blueprint.templateName} template from your goal prompt.`
      );

      if (source === 'manual') {
        setChatInput(trimmedGoal);
        addToast({
          type: 'success',
          title: 'Agent updated',
          message: `${blueprint.templateName} template applied. Prompt copied to chat box.`,
        });
      }
    },
    [addToast]
  );

  useEffect(() => {
    const validIds = new Set(availableModels.map((model) => model.id));
    if (availableModels.length === 0) return;
    setSelectedModel((previous) => (validIds.has(previous) ? previous : availableModels[0].id));
  }, [availableModels]);

  useEffect(() => {
    const trimmedGoal = agentGoalPrompt.trim();
    if (trimmedGoal.length < 8) {
      if (!trimmedGoal) {
        setAutoAgentStatus('Describe your goal and Agent Builder will auto-configure everything.');
      }
      return;
    }

    const timer = window.setTimeout(() => {
      if (trimmedGoal === lastAutoGoalRef.current) return;
      applyGoalPrompt(trimmedGoal, 'auto');
    }, 900);

    return () => window.clearTimeout(timer);
  }, [agentGoalPrompt, applyGoalPrompt]);

  useEffect(() => {
    if (!designMode) {
      setPreviewStatus('Design mode is off. Turn it on to generate and preview UI/UX layouts.');
      return;
    }

    setPreviewStatus(
      `Design mode is on (${designTarget}). The agent now outputs concept + feature plan + HTML/CSS implementation automatically.`
    );
  }, [designMode, designTarget]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  useEffect(() => {
    if (!previewCode.trim()) return;
    setCenterPanelMode('code');
  }, [previewCode]);

  useEffect(() => {
    const adjustWidthWithinViewport = () => {
      const viewportLimit = Math.max(
        PREVIEW_PANEL_MIN_WIDTH,
        window.innerWidth - CHAT_PANEL_MIN_WIDTH - 100
      );
      const maxWidth = Math.min(PREVIEW_PANEL_MAX_WIDTH, viewportLimit);
      setPreviewPanelWidth((previous) => clampNumber(previous, PREVIEW_PANEL_MIN_WIDTH, maxWidth));
    };

    adjustWidthWithinViewport();
    window.addEventListener('resize', adjustWidthWithinViewport);
    return () => window.removeEventListener('resize', adjustWidthWithinViewport);
  }, []);

  useEffect(() => {
    if (!isResizingPreview) return;

    const onPointerMove = (event: PointerEvent) => {
      const state = previewResizeRef.current;
      if (!state) return;

      const viewportLimit = Math.max(
        PREVIEW_PANEL_MIN_WIDTH,
        window.innerWidth - CHAT_PANEL_MIN_WIDTH - 100
      );
      const maxWidth = Math.min(PREVIEW_PANEL_MAX_WIDTH, viewportLimit);
      const deltaX = event.clientX - state.startX;
      const nextWidth = clampNumber(
        state.startWidth - deltaX,
        PREVIEW_PANEL_MIN_WIDTH,
        maxWidth
      );
      setPreviewPanelWidth(nextWidth);
    };

    const stopResize = () => {
      previewResizeRef.current = null;
      setIsResizingPreview(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizingPreview]);

  const handleStartPreviewResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.innerWidth < 1280) return;
    previewResizeRef.current = {
      startX: event.clientX,
      startWidth: previewPanelWidth,
    };
    setIsResizingPreview(true);
    event.preventDefault();
  };

  const handlePreviewResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (window.innerWidth < 1280) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' ? 28 : -28;
    const viewportLimit = Math.max(
      PREVIEW_PANEL_MIN_WIDTH,
      window.innerWidth - CHAT_PANEL_MIN_WIDTH - 100
    );
    const maxWidth = Math.min(PREVIEW_PANEL_MAX_WIDTH, viewportLimit);
    setPreviewPanelWidth((previous) =>
      clampNumber(previous + delta, PREVIEW_PANEL_MIN_WIDTH, maxWidth)
    );
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#agent=')) return;

    try {
      const encoded = hash.replace('#agent=', '');
      const decoded = decodeURIComponent(atob(encoded));
      const sharedAgent = JSON.parse(decoded) as Partial<AgentConfig>;

      setCurrentAgent(null);
      setAgentName(sharedAgent.name || 'Shared Agent');
      setPersona(sharedAgent.persona || 'You are a helpful AI assistant.');
      setInstructions(sharedAgent.instructions || '');
      setSelectedTools(Array.isArray(sharedAgent.tools) ? sharedAgent.tools : []);
      setSelectedModel(sharedAgent.model || defaultModelId);
      clearAgentMessages();
      setSharedImportError(null);
      setLastTemplateName('Shared');
      setAutoAgentStatus('Loaded shared agent config from link.');
    } catch {
      setSharedImportError('Unable to load shared agent from link.');
    }
  }, [clearAgentMessages, defaultModelId, setCurrentAgent]);

  const handleSelectTemplate = (template: (typeof agentTemplates)[0]) => {
    setAgentName(template.name);
    setPersona(template.persona);
    setInstructions(template.instructions);
    setSelectedTools(template.tools);
    setLastTemplateName(template.name);
    setAutoAgentStatus(`${template.name} template applied.`);
  };

  const handleToggleTool = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter((candidate) => candidate !== toolId));
    } else {
      setSelectedTools([...selectedTools, toolId]);
    }
  };

  const handleSaveAgent = () => {
    const agent: AgentConfig = {
      id: currentAgent?.id || Date.now().toString(),
      name: agentName || 'Untitled Agent',
      persona,
      instructions,
      tools: selectedTools,
      template: '',
      model: selectedModel,
    };
    saveAgent(agent);
    clearAgentMessages();
    addToast({
      type: 'success',
      title: 'Agent saved',
      message: `${agent.name} is ready to use.`,
    });
  };

  const handleLoadAgent = (agent: AgentConfig) => {
    setCurrentAgent(agent);
    setAgentName(agent.name);
    setPersona(agent.persona);
    setInstructions(agent.instructions);
    setSelectedTools(agent.tools);
    setSelectedModel(agent.model || defaultModelId);
    clearAgentMessages();
    setLastTemplateName('Custom');
    setAutoAgentStatus('Loaded saved agent. Edit goal prompt anytime to auto-reconfigure.');
  };

  const handleDeleteAgent = (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    deleteAgent(id);
    if (currentAgent?.id === id) {
      setCurrentAgent(null);
    }
    addToast({
      type: 'info',
      title: 'Agent deleted',
    });
  };

  const handleNewAgent = () => {
    setCurrentAgent(null);
    setAgentName('');
    setAgentGoalPrompt('');
    setAutoAgentStatus('Describe your goal and Agent Builder will auto-configure everything.');
    setLastTemplateName('Not selected');
    setShowAdvancedConfig(false);
    setPersona('');
    setInstructions('');
    setSelectedTools([]);
    setSelectedModel(defaultModelId);
    setDesignMode(false);
    setDesignTarget('responsive');
    setPreviewDevice('desktop');
    setPreviewSrcDoc('');
    setPreviewCode('');
    setPreviewStatus('Enable Design Mode and ask your agent to generate UI/UX code to see live preview.');
    clearAgentMessages();
    setDeployedLink('');
    setEmbedSnippet('');
    setToolTraces([]);
    lastAutoGoalRef.current = '';
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    if (!apiKey) {
      addToast({
        type: 'error',
        title: 'API key required',
        message: 'Set your Oxlo.ai API key first.',
      });
      return;
    }

    const messageInput = chatInput.trim();
    const userMessage: Message = { role: 'user', content: messageInput };
    addAgentMessage(userMessage);
    setChatInput('');
    setIsLoading(true);

    const traces = buildToolTraces(selectedTools, messageInput);
    setToolTraces(traces);

    const toolContext = traces
      .map((trace) => `[Tool: ${trace.tool}] ${trace.output}`)
      .join('\n');

    const baseMessageForModel = toolContext
      ? `${messageInput}\n\nTool Outputs:\n${toolContext}`
      : messageInput;

    const messageForModel = designMode
      ? `${baseMessageForModel}\n\n${buildDesignExecutionBrief(messageInput, designTarget)}`
      : baseMessageForModel;

    const messages = [
      { role: 'system' as const, content: generatedSystemPrompt },
      ...agentMessages.map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })),
      { role: 'user' as const, content: messageForModel },
    ];

    const response = await callOxloAPI(
      apiKey,
      selectedModel,
      messages,
      designMode ? 0.85 : 0.7,
      designMode ? 3200 : 2000
    );

    if (response.error) {
      addAgentMessage({ role: 'assistant', content: `Error: ${response.error}` });
      addToast({
        type: 'error',
        title: 'Agent response failed',
        message: response.error,
      });
      if (designMode) {
        setPreviewStatus('Design preview failed to update because the latest response returned an error.');
      }
    } else {
      let assistantContent = response.content;
      let preview = designMode ? buildPreviewDocument(response.content) : null;

      if (designMode && !preview) {
        const repairInstruction = [
          'Reformat your previous answer into renderable code now.',
          'Return in this exact order:',
          '1) Design Concept (short).',
          '2) Feature Breakdown (short).',
          '3) Implementation with full ```html``` and ```css``` blocks (required).',
          'Keep the output practical and visually strong, not generic.',
        ].join('\n');

        const repaired = await callOxloAPI(
          apiKey,
          selectedModel,
          [
            ...messages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: repairInstruction },
          ],
          0.7,
          3200
        );

        if (!repaired.error && repaired.content.trim()) {
          const repairedPreview = buildPreviewDocument(repaired.content);
          if (repairedPreview) {
            assistantContent = repaired.content;
            preview = repairedPreview;
            setPreviewStatus('Preview auto-enhanced from structured design output.');
          }
        }
      }

      if (designMode && preview && isLowFidelityDesign(preview.code)) {
        const polishInstruction = buildDesignPolishInstruction(messageInput, designTarget);
        const polished = await callOxloAPI(
          apiKey,
          selectedModel,
          [
            ...messages,
            { role: 'assistant', content: assistantContent },
            { role: 'user', content: polishInstruction },
          ],
          0.88,
          3600
        );

        if (!polished.error && polished.content.trim()) {
          const polishedPreview = buildPreviewDocument(polished.content);
          if (polishedPreview) {
            const improved =
              !isLowFidelityDesign(polishedPreview.code) ||
              polishedPreview.code.length > preview.code.length + 160;

            if (improved) {
              assistantContent = polished.content;
              preview = polishedPreview;
              setPreviewStatus('Preview upgraded to a higher-fidelity UI/UX design.');
            }
          }
        }
      }

      if (designMode && isCalculatorRequest(messageInput)) {
        const calculatorNeedsUpgrade = !preview || isLowFidelityDesign(preview.code);
        if (calculatorNeedsUpgrade) {
          const premiumCalculatorResponse = buildPremiumCalculatorResponse(messageInput, designTarget);
          const premiumPreview = buildPreviewDocument(premiumCalculatorResponse);
          if (premiumPreview) {
            assistantContent = premiumCalculatorResponse;
            preview = premiumPreview;
            setPreviewStatus('Preview upgraded with premium calculator blueprint.');
          }
        }
      }

      addAgentMessage({ role: 'assistant', content: assistantContent });

      if (designMode) {
        if (preview) {
          setPreviewSrcDoc(preview.srcDoc);
          setPreviewCode(preview.code);
          setPreviewStatus('Preview updated from latest assistant response.');
        } else {
          setPreviewStatus(
            'No renderable HTML/CSS detected yet. Ask: "Generate full HTML and CSS for this UI now."'
          );
        }
      }
    }

    setIsLoading(false);
  };

  const handleDeployAgent = async () => {
    const payload: Partial<AgentConfig> = {
      name: agentName || 'Shared Agent',
      persona,
      instructions,
      tools: selectedTools,
      model: selectedModel,
    };

    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
      const shareLink = `${window.location.origin}${window.location.pathname}#agent=${encoded}`;
      const snippet = `<iframe src="${shareLink}" width="420" height="640" style="border:1px solid #334155;border-radius:12px;"></iframe>`;

      setDeployedLink(shareLink);
      setEmbedSnippet(snippet);
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      addToast({
        type: 'success',
        title: 'Agent deployed',
        message: 'Share link copied to clipboard.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Deploy failed',
        message: 'Unable to generate share link.',
      });
    }
  };

  const handleCopyLink = async () => {
    if (!deployedLink) return;
    await navigator.clipboard.writeText(deployedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    addToast({
      type: 'success',
      title: 'Link copied',
    });
  };

  const handleCopySnippet = async () => {
    if (!embedSnippet) return;
    await navigator.clipboard.writeText(embedSnippet);
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
    addToast({
      type: 'success',
      title: 'Embed snippet copied',
    });
  };

  const handleCopyPreviewCode = async () => {
    if (!previewCode) return;
    await navigator.clipboard.writeText(previewCode);
    setPreviewCodeCopied(true);
    setTimeout(() => setPreviewCodeCopied(false), 2000);
    addToast({
      type: 'success',
      title: 'Preview code copied',
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        void handleSendMessage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSendMessage]);

  return (
    <div className="h-full flex flex-col xl:flex-row">
      <div className="hidden w-full xl:w-64 bg-slate-900/50 border-r border-b xl:border-b-0 border-slate-800 p-4 flex-col max-h-[38vh] xl:max-h-none">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300">My Agents</h3>
          <Button size="icon" variant="ghost" onClick={handleNewAgent}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-4">
          <details className="rounded-lg border border-slate-700 bg-slate-900/40 p-2">
            <summary className="cursor-pointer text-xs text-slate-400 font-medium">Templates (Optional)</summary>
            <div className="space-y-1 mt-2">
              {agentTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
                  >
                    <Icon className="w-4 h-4" />
                    {template.name}
                  </button>
                );
              })}
            </div>
          </details>
        </div>

        <div className="flex-1 overflow-y-auto">
          <p className="text-xs text-slate-500 mb-2">Saved Agents</p>
          {agents.length === 0 ? (
            <p className="text-xs text-slate-600 italic">No agents saved</p>
          ) : (
            <div className="space-y-1">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all group ${
                    currentAgent?.id === agent.id
                      ? 'bg-emerald-600/20 border border-emerald-500/30'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <button
                    onClick={() => handleLoadAgent(agent)}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                  >
                    <Bot className="w-4 h-4" />
                    {agent.name}
                  </button>
                  <button
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col 2xl:flex-row min-h-0">
        <div className="hidden w-full 2xl:w-[430px] border-r border-b 2xl:border-b-0 border-slate-800 p-4 md:p-6 overflow-y-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Agent Builder</h2>
              <p className="text-sm text-slate-400">Configure your AI agent</p>
            </div>
          </div>

          {sharedImportError && (
            <div className="mb-4 rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-400">
              {sharedImportError}
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/20 p-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-200 flex items-center gap-2">
                      <WandSparkles className="w-4 h-4" />
                      Prompt-to-Agent Auto Setup
                    </p>
                    <p className="text-xs text-emerald-300/80 mt-1">
                      Type what you want. Agent config is built automatically.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => applyGoalPrompt(agentGoalPrompt, 'manual')}
                    disabled={agentGoalPrompt.trim().length < 3}
                  >
                    <WandSparkles className="w-4 h-4" />
                    Apply Setup
                  </Button>
                </div>
                <Textarea
                  value={agentGoalPrompt}
                  onChange={(e) => setAgentGoalPrompt(e.target.value)}
                  rows={3}
                  placeholder="Example: Build a responsive UI/UX agent that designs ecommerce landing pages and writes conversion-focused copy."
                />
                <div className="rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2">
                  <p className="text-xs text-slate-300">{autoAgentStatus}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Template: {lastTemplateName}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    After apply, prompt is moved to chat input. Click Send to run the agent.
                  </p>
                </div>
              </div>
            </div>

            <Input
              label="Agent Name"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="My Agent"
            />

            <Select
              label="AI Model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              options={modelOptions}
            />

            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">UI/UX Design Mode</p>
                  <p className="text-xs text-slate-400">Auto-on when your goal asks for web/mobile design.</p>
                </div>
                <Button
                  size="sm"
                  variant={designMode ? 'primary' : 'secondary'}
                  onClick={() => setDesignMode((previous) => !previous)}
                >
                  {designMode ? 'On' : 'Off'}
                </Button>
              </div>

              {designMode && (
                <div className="mt-3">
                  <Select
                    label="Design Target"
                    value={designTarget}
                    onChange={(e) => setDesignTarget(e.target.value as 'web' | 'mobile' | 'responsive')}
                    options={[
                      { value: 'web', label: 'Web UI' },
                      { value: 'mobile', label: 'Mobile UI' },
                      { value: 'responsive', label: 'Responsive UI' },
                    ]}
                  />
                </div>
              )}
            </div>

            <Button
              variant="secondary"
              onClick={() => setShowAdvancedConfig((previous) => !previous)}
              className="w-full"
            >
              <Settings className="w-4 h-4" />
              {showAdvancedConfig ? 'Hide Advanced Config' : 'Show Advanced Config'}
            </Button>

            {showAdvancedConfig && (
              <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/30 p-3">
                <Textarea
                  label="Persona"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  placeholder="Define your agent's personality..."
                  rows={3}
                />

                <Textarea
                  label="Instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Specific instructions for the agent..."
                  rows={4}
                />

                <Textarea
                  label="Generated System Prompt (Auto)"
                  value={generatedSystemPrompt}
                  rows={5}
                  readOnly
                  className="text-xs"
                />

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tools</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableTools.map((tool) => {
                      const Icon = tool.icon;
                      const isSelected = selectedTools.includes(tool.id);
                      return (
                        <button
                          key={tool.id}
                          onClick={() => handleToggleTool(tool.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                            isSelected
                              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {tool.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveAgent} className="flex-1">
                <Settings className="w-4 h-4" />
                Save Agent
              </Button>
              <Button variant="secondary" onClick={handleDeployAgent} className="flex-1">
                <Share2 className="w-4 h-4" />
                Deploy
              </Button>
            </div>

            {deployedLink && (
              <div className="space-y-2 pt-2">
                <Input label="Shareable Link" value={deployedLink} readOnly />
                <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {linkCopied ? 'Link Copied' : 'Copy Link'}
                </Button>

                <Textarea label="Embeddable Widget Snippet" value={embedSnippet} rows={4} readOnly className="text-xs" />
                <Button variant="secondary" size="sm" onClick={handleCopySnippet}>
                  {snippetCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {snippetCopied ? 'Snippet Copied' : 'Copy Snippet'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col xl:flex-row bg-slate-950/50">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                    Test Agent
                  </h3>
                  <p className="text-sm text-slate-400">
                    {centerPanelMode === 'chat'
                      ? 'Try your agent in a live chat'
                      : 'Live generated code from your latest build prompt'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={centerPanelMode === 'chat' ? 'primary' : 'secondary'}
                    onClick={() => setCenterPanelMode('chat')}
                  >
                    Chat
                  </Button>
                  <Button
                    size="sm"
                    variant={centerPanelMode === 'code' ? 'primary' : 'secondary'}
                    onClick={() => setCenterPanelMode('code')}
                  >
                    Code
                  </Button>
                </div>
              </div>
              {toolTraces.length > 0 && (
                <div className="mt-3 space-y-1">
                  {toolTraces.map((trace, index) => (
                    <div key={`${trace.tool}-${index}`} className="text-xs rounded bg-slate-800/70 border border-slate-700 px-2 py-1">
                      <span className="text-emerald-300">{trace.tool}:</span>{' '}
                      <span className="text-slate-300">{trace.output}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {centerPanelMode === 'code' ? (
                previewCode.trim() ? (
                  <div className="h-full rounded-xl border border-slate-700 bg-slate-950/80 overflow-hidden flex flex-col">
                    <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-300">Live Code</span>
                      <Button size="sm" variant="secondary" onClick={handleCopyPreviewCode}>
                        {previewCodeCopied ? 'Copied' : 'Copy Code'}
                      </Button>
                    </div>
                    <pre className="flex-1 overflow-auto p-4 text-xs leading-6 text-emerald-100 font-mono whitespace-pre-wrap">
                      {previewCode}
                    </pre>
                  </div>
                ) : (
                  <div className="h-full min-h-[260px] rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
                    Send a build prompt first. Generated code will appear here automatically.
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {agentMessages.length === 0 && (
                    <div className="text-center py-12">
                      <Bot className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                      <p className="text-slate-500">Start a conversation with your agent</p>
                    </div>
                  )}
                  {agentMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-br-md'
                            : 'bg-slate-800 text-slate-200 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-md">
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message... (use `calc:` or `summarize:` for tool routing)"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={isLoading}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div
            className={`hidden xl:flex w-2 items-center justify-center border-l border-slate-800/70 cursor-col-resize transition-colors ${
              isResizingPreview ? 'bg-emerald-500/20' : 'bg-slate-900/20 hover:bg-emerald-500/10'
            }`}
            onPointerDown={handleStartPreviewResize}
            onKeyDown={handlePreviewResizeKeyDown}
            onDoubleClick={() => setPreviewPanelWidth(PREVIEW_PANEL_DEFAULT_WIDTH)}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize preview panel"
            tabIndex={0}
            title="Drag to resize preview panel"
          >
            <span className="h-14 w-[3px] rounded-full bg-slate-600/80" />
          </div>

          <aside
            className="w-full xl:w-[var(--preview-panel-width)] xl:min-w-[320px] xl:max-w-[900px] border-t xl:border-t-0 xl:border-l border-slate-800 flex flex-col bg-slate-900/50"
            style={{ ['--preview-panel-width' as any]: `${previewPanelWidth}px` }}
          >
            <div className="p-4 border-b border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">Live Preview</h3>
                  <p className="text-xs text-slate-400">Preview generated UI while agent is building.</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyPreviewCode}
                  disabled={!previewCode}
                >
                  <Copy className="w-4 h-4" />
                  {previewCodeCopied ? 'Copied' : 'Copy Code'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={previewDevice === 'desktop' ? 'primary' : 'secondary'}
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <Monitor className="w-4 h-4" />
                  Desktop
                </Button>
                <Button
                  size="sm"
                  variant={previewDevice === 'mobile' ? 'primary' : 'secondary'}
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <Smartphone className="w-4 h-4" />
                  Mobile
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-[320px] p-4 overflow-auto">
              {previewSrcDoc ? (
                <div
                  className={`mx-auto rounded-xl border border-slate-700 bg-white overflow-hidden shadow-xl ${
                    previewDevice === 'mobile' ? 'w-[360px] max-w-full min-h-[640px]' : 'w-full min-h-[640px]'
                  }`}
                >
                  <iframe
                    title="Agent Design Preview"
                    srcDoc={previewSrcDoc}
                    sandbox="allow-scripts"
                    className="w-full h-full min-h-[640px] bg-white"
                  />
                </div>
              ) : (
                <div className="h-full min-h-[260px] rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
                  Turn on Design Mode and ask agent to generate a UI layout. Preview will appear here automatically.
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
              {previewStatus}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


