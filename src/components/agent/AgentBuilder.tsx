import { useState, useRef, useEffect, useMemo } from 'react';
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

  const [agentName, setAgentName] = useState('');
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
  const [sharedImportError, setSharedImportError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const generatedSystemPrompt = useMemo(() => {
    const activeTools = selectedTools
      .map((toolId) => availableTools.find((tool) => tool.id === toolId)?.name || toolId)
      .join(', ');

    const designInstruction = designMode
      ? [
          'Design mode is ON. Act as a senior UI/UX designer and frontend engineer.',
          `Primary design target: ${designTarget}.`,
          'Return implementation in code blocks: ```html```, and include ```css``` / ```js``` when needed.',
          'Prioritize modern visual hierarchy, responsive behavior, and production-ready component structure.',
        ].join('\n')
      : '';

    return [
      persona.trim() || 'You are a helpful AI assistant.',
      instructions.trim() || 'Answer clearly and directly.',
      `Enabled tools: ${activeTools || 'None'}.`,
      'If tool outputs are provided in the user message context, prioritize those outputs when answering.',
      designInstruction,
    ].join('\n\n');
  }, [persona, instructions, selectedTools, designMode, designTarget]);

  useEffect(() => {
    const validIds = new Set(availableModels.map((model) => model.id));
    if (availableModels.length === 0) return;
    setSelectedModel((previous) => (validIds.has(previous) ? previous : availableModels[0].id));
  }, [availableModels]);

  useEffect(() => {
    if (!designMode) {
      setPreviewStatus('Design mode is off. Turn it on to generate and preview UI/UX layouts.');
      return;
    }

    setPreviewStatus(
      `Design mode is on (${designTarget}). Ask your agent to return HTML/CSS code and preview will auto-render.`
    );
  }, [designMode, designTarget]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

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
    } catch {
      setSharedImportError('Unable to load shared agent from link.');
    }
  }, [clearAgentMessages, defaultModelId, setCurrentAgent]);

  const handleSelectTemplate = (template: (typeof agentTemplates)[0]) => {
    setAgentName(template.name);
    setPersona(template.persona);
    setInstructions(template.instructions);
    setSelectedTools(template.tools);
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

    const messageForModel = toolContext
      ? `${messageInput}\n\nTool Outputs:\n${toolContext}`
      : messageInput;

    const messages = [
      { role: 'system' as const, content: generatedSystemPrompt },
      ...agentMessages.map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })),
      { role: 'user' as const, content: messageForModel },
    ];

    const response = await callOxloAPI(apiKey, selectedModel, messages, 0.7);

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
      addAgentMessage({ role: 'assistant', content: response.content });
      if (designMode) {
        const preview = buildPreviewDocument(response.content);
        if (preview) {
          setPreviewSrcDoc(preview.srcDoc);
          setPreviewCode(preview.code);
          setPreviewStatus('Preview updated from latest assistant response.');
        } else {
          setPreviewStatus('No HTML/CSS code detected. Ask the agent to return code blocks for preview.');
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
      <div className="w-full xl:w-64 bg-slate-900/50 border-r border-b xl:border-b-0 border-slate-800 p-4 flex flex-col max-h-[38vh] xl:max-h-none">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300">My Agents</h3>
          <Button size="icon" variant="ghost" onClick={handleNewAgent}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Templates</p>
          <div className="space-y-1">
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
        <div className="w-full 2xl:w-[430px] border-r border-b 2xl:border-b-0 border-slate-800 p-4 md:p-6 overflow-y-auto">
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
                  <p className="text-xs text-slate-400">Generate web/mobile UI code and render live preview.</p>
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
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                Test Agent
              </h3>
              <p className="text-sm text-slate-400">Try your agent in a live chat</p>
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

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

          <aside className="w-full xl:w-[420px] border-t xl:border-t-0 xl:border-l border-slate-800 flex flex-col bg-slate-900/50">
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

