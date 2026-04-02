import { type ChangeEvent, useEffect, useState } from 'react';
import { 
  FileText, 
  Globe, 
  Sparkles, 
  FileOutput,
  Play,
  Loader2,
  ChevronRight,
  Download,
  Copy,
  Check,
  Upload,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useStore } from '../../store/useStore';
import { callOxloAPI, AVAILABLE_MODELS } from '../../services/oxloApi';

interface PipelineStage {
  id: string;
  name: string;
  type: 'blog-writer' | 'seo-optimizer' | 'translator' | 'tone-adjuster' | 'summarizer';
  prompt: string;
  output: string;
  isLoading: boolean;
}

interface SavedPipeline {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
    type: PipelineStage['type'];
    prompt: string;
  }>;
  timestamp: number;
}

const stageTypes = [
  { value: 'blog-writer', label: 'Blog Writer', icon: FileText, defaultPrompt: 'Write a detailed blog post about the following topic:' },
  { value: 'seo-optimizer', label: 'SEO Optimizer', icon: Globe, defaultPrompt: 'Optimize the following content for SEO. Add relevant keywords, improve headings, and enhance readability:' },
  { value: 'translator', label: 'Translator', icon: Globe, defaultPrompt: 'Translate the following content to Spanish while maintaining the original tone and meaning:' },
  { value: 'tone-adjuster', label: 'Tone Adjuster', icon: Sparkles, defaultPrompt: 'Rewrite the following content in a more professional and formal tone:' },
  { value: 'summarizer', label: 'Summarizer', icon: FileOutput, defaultPrompt: 'Summarize the following content in 3-5 key bullet points:' },
];

const pipelineTemplates = [
  {
    id: 'blog-seo',
    name: 'Blog + SEO',
    stages: [
      { type: 'blog-writer', name: 'Write Blog', prompt: 'Write a comprehensive blog post about:' },
      { type: 'seo-optimizer', name: 'SEO Optimize', prompt: 'Optimize this blog post for SEO:' },
    ],
  },
  {
    id: 'content-translate',
    name: 'Content Translation',
    stages: [
      { type: 'blog-writer', name: 'Write Content', prompt: 'Write engaging content about:' },
      { type: 'translator', name: 'Translate', prompt: 'Translate to Spanish:' },
    ],
  },
  {
    id: 'full-pipeline',
    name: 'Full Content Pipeline',
    stages: [
      { type: 'blog-writer', name: 'Write', prompt: 'Write a detailed article about:' },
      { type: 'seo-optimizer', name: 'SEO', prompt: 'Optimize for SEO:' },
      { type: 'tone-adjuster', name: 'Adjust Tone', prompt: 'Make it more engaging:' },
      { type: 'summarizer', name: 'Summarize', prompt: 'Create a summary:' },
    ],
  },
];

export function ContentPipeline() {
  const { apiKey, addToast } = useStore();
  const [pipelineName, setPipelineName] = useState('My Pipeline');
  const [currentPipelineId, setCurrentPipelineId] = useState<string | null>(null);
  const [savedPipelines, setSavedPipelines] = useState<SavedPipeline[]>([]);
  const [input, setInput] = useState('');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchInputs, setBatchInputs] = useState<string[]>(['']);
  const [batchResults, setBatchResults] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('oxai-pipelines');
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedPipeline[];
      if (Array.isArray(parsed)) {
        setSavedPipelines(parsed);
      }
    } catch {
      // ignore malformed local data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('oxai-pipelines', JSON.stringify(savedPipelines));
  }, [savedPipelines]);

  const handleLoadTemplate = (template: typeof pipelineTemplates[0]) => {
    setPipelineName(template.name);
    setCurrentPipelineId(null);
    setStages(template.stages.map((s, i) => ({
      id: `${Date.now()}-${i}`,
      name: s.name,
      type: s.type as PipelineStage['type'],
      prompt: s.prompt,
      output: '',
      isLoading: false,
    })));
  };

  const handleAddStage = () => {
    const stageType = stageTypes[0];
    setStages([...stages, {
      id: Date.now().toString(),
      name: stageType.label,
      type: stageType.value as PipelineStage['type'],
      prompt: stageType.defaultPrompt,
      output: '',
      isLoading: false,
    }]);
  };

  const handleRemoveStage = (id: string) => {
    setStages(stages.filter((s) => s.id !== id));
  };

  const handleUpdateStage = (id: string, updates: Partial<PipelineStage>) => {
    setStages(stages.map((s) => s.id === id ? { ...s, ...updates } : s));
  };

  const handleChangeStageType = (id: string, type: string) => {
    const stageType = stageTypes.find((t) => t.value === type);
    if (stageType) {
      handleUpdateStage(id, {
        type: type as PipelineStage['type'],
        name: stageType.label,
        prompt: stageType.defaultPrompt,
      });
    }
  };

  const handleSavePipeline = () => {
    if (!pipelineName.trim()) {
      addToast({
        type: 'info',
        title: 'Pipeline name needed',
        message: 'Please enter a pipeline name.',
      });
      return;
    }
    if (stages.length === 0) {
      addToast({
        type: 'info',
        title: 'No stages yet',
        message: 'Add at least one stage before saving.',
      });
      return;
    }

    const pipelineId = currentPipelineId || Date.now().toString();
    const payload: SavedPipeline = {
      id: pipelineId,
      name: pipelineName.trim(),
      stages: stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        type: stage.type,
        prompt: stage.prompt,
      })),
      timestamp: Date.now(),
    };

    setSavedPipelines((previous) => {
      const existingIndex = previous.findIndex((candidate) => candidate.id === pipelineId);
      if (existingIndex >= 0) {
        const updated = [...previous];
        updated[existingIndex] = payload;
        return updated;
      }
      return [payload, ...previous];
    });
    setCurrentPipelineId(pipelineId);
    addToast({
      type: 'success',
      title: 'Pipeline saved',
      message: `${payload.name} saved locally.`,
    });
  };

  const handleLoadPipeline = (pipeline: SavedPipeline) => {
    setCurrentPipelineId(pipeline.id);
    setPipelineName(pipeline.name);
    setStages(
      pipeline.stages.map((stage) => ({
        ...stage,
        output: '',
        isLoading: false,
      }))
    );
  };

  const handleDeletePipeline = (id: string) => {
    setSavedPipelines((previous) => previous.filter((pipeline) => pipeline.id !== id));
    if (currentPipelineId === id) {
      setCurrentPipelineId(null);
      setPipelineName('My Pipeline');
    }
    addToast({
      type: 'info',
      title: 'Pipeline deleted',
    });
  };

  const handleUploadCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);

    const values = rows.map((row) => {
      const firstColumn = row.split(',')[0] || '';
      return firstColumn.replace(/^"|"$/g, '').trim();
    }).filter(Boolean);

    const normalizedValues =
      values[0]?.toLowerCase() === 'topic' || values[0]?.toLowerCase() === 'title'
        ? values.slice(1)
        : values;

    if (normalizedValues.length === 0) {
      addToast({
        type: 'error',
        title: 'CSV import failed',
        message: 'No valid topics found in CSV.',
      });
      return;
    }

    setBatchInputs(normalizedValues);
    event.target.value = '';
    addToast({
      type: 'success',
      title: 'CSV imported',
      message: `${normalizedValues.length} topics loaded.`,
    });
  };

  const runPipeline = async () => {
    if (!apiKey) {
      addToast({
        type: 'error',
        title: 'API key required',
        message: 'Set your Oxlo.ai API key first.',
      });
      return;
    }
    if (!input.trim()) {
      addToast({
        type: 'info',
        title: 'Input required',
        message: 'Please enter a topic or starting content.',
      });
      return;
    }
    if (stages.length === 0) {
      addToast({
        type: 'info',
        title: 'No stages yet',
        message: 'Add at least one stage before running.',
      });
      return;
    }

    setIsRunning(true);
    let currentInput = input;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      
      // Set loading state
      setStages((prev) => prev.map((s) => 
        s.id === stage.id ? { ...s, isLoading: true, output: '' } : s
      ));

      const response = await callOxloAPI(
        apiKey,
        selectedModel,
        [
          { role: 'system', content: 'You are a professional content creator and editor.' },
          { role: 'user', content: `${stage.prompt}\n\n${currentInput}` },
        ],
        0.7
      );

      const output = response.error || response.content;
      
      // Update stage with result
      setStages((prev) => prev.map((s) => 
        s.id === stage.id ? { ...s, isLoading: false, output } : s
      ));

      currentInput = output;
    }

    setIsRunning(false);
    addToast({
      type: 'success',
      title: 'Pipeline finished',
      message: `Processed ${stages.length} stage(s).`,
    });
  };

  const runBatchPipeline = async () => {
    if (!apiKey) {
      addToast({
        type: 'error',
        title: 'API key required',
        message: 'Set your Oxlo.ai API key first.',
      });
      return;
    }
    if (batchInputs.filter((i) => i.trim()).length === 0) {
      addToast({
        type: 'info',
        title: 'Batch input empty',
        message: 'Add at least one topic for batch mode.',
      });
      return;
    }
    if (stages.length === 0) {
      addToast({
        type: 'info',
        title: 'No stages yet',
        message: 'Add at least one stage before running.',
      });
      return;
    }

    setIsRunning(true);
    const results: string[] = [];

    for (const topic of batchInputs.filter((i) => i.trim())) {
      let currentInput = topic;

      for (const stage of stages) {
        const response = await callOxloAPI(
          apiKey,
          selectedModel,
          [
            { role: 'system', content: 'You are a professional content creator and editor.' },
            { role: 'user', content: `${stage.prompt}\n\n${currentInput}` },
          ],
          0.7
        );
        currentInput = response.error || response.content;
      }

      results.push(currentInput);
    }

    setBatchResults(results);
    setIsRunning(false);
    addToast({
      type: 'success',
      title: 'Batch pipeline finished',
      message: `${results.length} topic(s) processed.`,
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    addToast({
      type: 'success',
      title: 'Copied to clipboard',
    });
  };

  const handleExport = (format: 'markdown' | 'json' | 'text') => {
    const finalOutput = stages[stages.length - 1]?.output || '';
    let content = '';
    let filename = '';
    let type = '';

    if (format === 'markdown') {
      content = `# Generated Content\n\n${finalOutput}`;
      filename = 'content.md';
      type = 'text/markdown';
    } else if (format === 'json') {
      content = JSON.stringify({
        input,
        stages: stages.map((s) => ({ name: s.name, output: s.output })),
        finalOutput,
      }, null, 2);
      filename = 'content.json';
      type = 'application/json';
    } else {
      content = finalOutput;
      filename = 'content.txt';
      type = 'text/plain';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      type: 'success',
      title: 'Export complete',
      message: `${filename} downloaded.`,
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSavePipeline();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        void (batchMode ? runBatchPipeline() : runPipeline());
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [batchMode, handleSavePipeline, runBatchPipeline, runPipeline]);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Content Pipeline</h2>
            <p className="text-slate-400">Build multi-stage content generation workflows</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={batchMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setBatchMode(!batchMode)}
            >
              <Upload className="w-4 h-4" />
              Batch Mode
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="py-3 space-y-3">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <Input
                label="Pipeline Name"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="My Pipeline"
                className="flex-1"
              />
              <Button onClick={handleSavePipeline}>
                <Save className="w-4 h-4" />
                Save Pipeline
              </Button>
            </div>

            {savedPipelines.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Saved Pipelines</p>
                <div className="flex flex-wrap gap-2">
                  {savedPipelines.map((pipeline) => (
                    <div
                      key={pipeline.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        currentPipelineId === pipeline.id
                          ? 'bg-emerald-600/20 border-emerald-500/40'
                          : 'bg-slate-800/40 border-slate-700'
                      }`}
                    >
                      <button
                        onClick={() => handleLoadPipeline(pipeline)}
                        className="text-sm text-slate-200 hover:text-white"
                      >
                        {pipeline.name}
                      </button>
                      <button
                        onClick={() => handleDeletePipeline(pipeline.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">Quick Start Templates</h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3">
              {pipelineTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleLoadTemplate(template)}
                  className="px-4 py-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-emerald-500/50 transition-all"
                >
                  <p className="text-sm font-medium text-white">{template.name}</p>
                  <p className="text-xs text-slate-400">{template.stages.length} stages</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Model Selection */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-4">
              <Select
                label="AI Model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                options={AVAILABLE_MODELS.map((m) => ({ value: m.id, label: m.name }))}
                className="w-full md:w-64"
              />
            </div>
          </CardContent>
        </Card>

        {/* Input */}
        {!batchMode ? (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">Input</h3>
            </CardHeader>
            <CardContent>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your topic or initial content..."
                rows={3}
              />
            </CardContent>
          </Card>
        ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    Batch Inputs
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleUploadCsv}
                        className="hidden"
                      />
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-slate-800 text-slate-300 hover:text-white cursor-pointer border border-slate-700">
                        <Upload className="w-4 h-4" />
                        Upload CSV
                      </span>
                    </label>
                    <Button size="sm" variant="ghost" onClick={() => setBatchInputs([...batchInputs, ''])}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            <CardContent className="space-y-2">
              {batchInputs.map((inp, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={inp}
                    onChange={(e) => {
                      const newInputs = [...batchInputs];
                      newInputs[idx] = e.target.value;
                      setBatchInputs(newInputs);
                    }}
                    placeholder={`Topic ${idx + 1}`}
                    className="flex-1"
                  />
                  {batchInputs.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setBatchInputs(batchInputs.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pipeline Stages */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Pipeline Stages</h3>
            <Button size="sm" variant="secondary" onClick={handleAddStage}>
              <Plus className="w-4 h-4" />
              Add Stage
            </Button>
          </CardHeader>
          <CardContent>
            {stages.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No stages added. Use a template or add stages manually.</p>
            ) : (
              <div className="space-y-4">
                {stages.map((stage, idx) => {
                  const StageIcon = stageTypes.find((t) => t.value === stage.type)?.icon || FileText;
                  return (
                    <div key={stage.id} className="relative">
                      {idx > 0 && (
                        <div className="absolute left-6 -top-4 h-4 w-px bg-emerald-500/30" />
                      )}
                      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                            <StageIcon className="w-4 h-4 text-emerald-400" />
                          </div>
                          <span className="text-sm font-medium text-white">{stage.name}</span>
                          <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
                          <Select
                            value={stage.type}
                            onChange={(e) => handleChangeStageType(stage.id, e.target.value)}
                            options={stageTypes.map((t) => ({ value: t.value, label: t.label }))}
                            className="w-full sm:w-40 text-sm"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveStage(stage.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                        <Textarea
                          value={stage.prompt}
                          onChange={(e) => handleUpdateStage(stage.id, { prompt: e.target.value })}
                          placeholder="Stage prompt..."
                          rows={2}
                          className="text-sm mb-3"
                        />
                        {stage.isLoading && (
                          <div className="flex items-center gap-2 text-emerald-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Processing...</span>
                          </div>
                        )}
                        {stage.output && (
                          <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-3 mt-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-slate-400">Output</span>
                              <button
                                onClick={() => handleCopy(stage.output, stage.id)}
                                className="text-slate-400 hover:text-white transition-colors"
                              >
                                {copied === stage.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap line-clamp-4">{stage.output}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={batchMode ? runBatchPipeline : runPipeline}
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunning ? 'Running Pipeline...' : 'Run Pipeline'}
          </Button>
          {stages.some((s) => s.output) && (
            <>
              <Button variant="secondary" onClick={() => handleExport('markdown')}>
                <Download className="w-4 h-4" />
                Markdown
              </Button>
              <Button variant="secondary" onClick={() => handleExport('json')}>
                <Download className="w-4 h-4" />
                JSON
              </Button>
              <Button variant="secondary" onClick={() => handleExport('text')}>
                <Download className="w-4 h-4" />
                Text
              </Button>
            </>
          )}
        </div>

        {/* Batch Results */}
        {batchMode && batchResults.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">Batch Results</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {batchResults.map((result, idx) => (
                <div key={idx} className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">Result {idx + 1}</span>
                    <button
                      onClick={() => handleCopy(result, `batch-${idx}`)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {copied === `batch-${idx}` ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap line-clamp-4">{result}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

