import { useEffect, useMemo, useState } from 'react';
import {
  Play,
  GitCompare,
  Save,
  Star,
  Clock,
  Zap,
  Hash,
  Loader2,
  Trash2,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { PromptVersion, useStore } from '../../store/useStore';
import {
  callOxloAPI,
  compareModels,
  extractVariables,
  replaceVariables,
  ModelResponse,
} from '../../services/oxloApi';
import { useAvailableModels } from '../../hooks/useAvailableModels';

interface DiffRow {
  line: number;
  base: string;
  compare: string;
  changed: boolean;
}

function buildDiffRows(basePrompt: string, comparePrompt: string): DiffRow[] {
  const baseLines = basePrompt.split('\n');
  const compareLines = comparePrompt.split('\n');
  const maxLines = Math.max(baseLines.length, compareLines.length);

  return Array.from({ length: maxLines }, (_, index) => {
    const base = baseLines[index] ?? '';
    const compare = compareLines[index] ?? '';
    return {
      line: index + 1,
      base,
      compare,
      changed: base !== compare,
    };
  });
}

export function PromptStudio() {
  const { apiKey, promptVersions, addPromptVersion, updatePromptVersion, deletePromptVersion, addToast } = useStore();
  const { models: availableModels, modelOptions, defaultModelId } = useAvailableModels(apiKey);
  const modelLabelById = useMemo(
    () => new Map(availableModels.map((model) => [model.id, model.name])),
    [availableModels]
  );

  const [prompt, setPrompt] = useState('Write a {{tone}} blog post about {{topic}} in {{language}}.');
  const [variables, setVariables] = useState<Record<string, string>>({
    tone: 'professional',
    topic: 'AI technology',
    language: 'English',
  });
  const [selectedModel, setSelectedModel] = useState(defaultModelId);
  const [compareModelsSelected, setCompareModelsSelected] = useState<string[]>([]);
  const [temperature, setTemperature] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [singleResult, setSingleResult] = useState<ModelResponse | null>(null);
  const [comparisonResults, setComparisonResults] = useState<ModelResponse[]>([]);
  const [versionName, setVersionName] = useState('');
  const [diffBaseId, setDiffBaseId] = useState('');
  const [diffCompareId, setDiffCompareId] = useState('');
  const [isModelCheckLoading, setIsModelCheckLoading] = useState(false);
  const [modelCheckResults, setModelCheckResults] = useState<ModelResponse[]>([]);

  const extractedVars = useMemo(() => extractVariables(prompt), [prompt]);
  const sortedVersions = useMemo(
    () => [...promptVersions].sort((a, b) => b.timestamp - a.timestamp),
    [promptVersions]
  );

  const bestVersionByPrompt = useMemo(() => {
    const bestMap = new Map<string, PromptVersion>();
    for (const version of sortedVersions) {
      if (typeof version.rating !== 'number') continue;
      const currentBest = bestMap.get(version.prompt);
      if (
        !currentBest ||
        version.rating > (currentBest.rating ?? 0) ||
        (version.rating === currentBest.rating && version.timestamp > currentBest.timestamp)
      ) {
        bestMap.set(version.prompt, version);
      }
    }
    return bestMap;
  }, [sortedVersions]);

  const bestVersionForCurrentPrompt = useMemo(
    () => bestVersionByPrompt.get(prompt) ?? null,
    [bestVersionByPrompt, prompt]
  );

  useEffect(() => {
    if (sortedVersions.length < 2) {
      setDiffBaseId('');
      setDiffCompareId('');
      return;
    }

    const hasBase = sortedVersions.some((v) => v.id === diffBaseId);
    const hasCompare = sortedVersions.some((v) => v.id === diffCompareId);

    if (!hasBase) setDiffBaseId(sortedVersions[1].id);
    if (!hasCompare) setDiffCompareId(sortedVersions[0].id);
  }, [sortedVersions, diffBaseId, diffCompareId]);

  const diffBaseVersion = useMemo(
    () => sortedVersions.find((v) => v.id === diffBaseId) ?? null,
    [sortedVersions, diffBaseId]
  );
  const diffCompareVersion = useMemo(
    () => sortedVersions.find((v) => v.id === diffCompareId) ?? null,
    [sortedVersions, diffCompareId]
  );

  const diffRows = useMemo(() => {
    if (!diffBaseVersion || !diffCompareVersion) return [];
    return buildDiffRows(diffBaseVersion.prompt, diffCompareVersion.prompt);
  }, [diffBaseVersion, diffCompareVersion]);

  const variableDiffRows = useMemo(() => {
    if (!diffBaseVersion || !diffCompareVersion) return [];

    const keys = new Set([
      ...Object.keys(diffBaseVersion.variables || {}),
      ...Object.keys(diffCompareVersion.variables || {}),
    ]);

    return [...keys]
      .map((key) => {
        const baseValue = diffBaseVersion.variables[key] ?? '';
        const compareValue = diffCompareVersion.variables[key] ?? '';
        return {
          key,
          baseValue,
          compareValue,
          changed: baseValue !== compareValue,
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [diffBaseVersion, diffCompareVersion]);

  useEffect(() => {
    const validIds = new Set(availableModels.map((model) => model.id));
    if (availableModels.length === 0) return;

    setSelectedModel((previous) => (validIds.has(previous) ? previous : availableModels[0].id));

    setCompareModelsSelected((previous) => {
      const normalized = previous.filter((modelId) => validIds.has(modelId)).slice(0, 3);
      if (normalized.length >= 2) return normalized;

      const seeds = availableModels.slice(0, 3).map((model) => model.id);
      if (seeds.length >= 2) {
        return [...new Set([...normalized, ...seeds])].slice(0, 3);
      }
      return seeds;
    });
  }, [availableModels]);

  const handleRunSingle = async () => {
    if (!apiKey) {
      addToast({
        type: 'error',
        title: 'API key required',
        message: 'Set your Oxlo.ai API key first.',
      });
      return;
    }

    setIsLoading(true);
    setSingleResult(null);

    const finalPrompt = replaceVariables(prompt, variables);
    const result = await callOxloAPI(
      apiKey,
      selectedModel,
      [{ role: 'user', content: finalPrompt }],
      temperature
    );

    setSingleResult(result);
    setIsLoading(false);
  };

  const handleToggleCompareModel = (modelId: string) => {
    setCompareModelsSelected((previous) => {
      if (previous.includes(modelId)) {
        if (previous.length <= 2) return previous;
        return previous.filter((id) => id !== modelId);
      }
      if (previous.length >= 3) return previous;
      return [...previous, modelId];
    });
  };

  const handleCompare = async () => {
    if (!apiKey) {
      addToast({
        type: 'error',
        title: 'API key required',
        message: 'Set your Oxlo.ai API key first.',
      });
      return;
    }
    if (compareModelsSelected.length < 2) {
      addToast({
        type: 'info',
        title: 'Select models',
        message: 'Choose at least 2 models to compare.',
      });
      return;
    }

    setIsComparing(true);
    setComparisonResults([]);

    const finalPrompt = replaceVariables(prompt, variables);
    const results = await compareModels(
      apiKey,
      compareModelsSelected,
      [{ role: 'user', content: finalPrompt }],
      temperature
    );

    setComparisonResults(results);
    setIsComparing(false);
  };

  const handleModelCheck = async () => {
    if (!apiKey) {
      addToast({
        type: 'error',
        title: 'API key required',
        message: 'Set your Oxlo.ai API key first.',
      });
      return;
    }
    if (availableModels.length === 0) {
      addToast({
        type: 'error',
        title: 'No chat models found',
        message: 'Could not find available chat models from Oxlo.ai.',
      });
      return;
    }

    setIsModelCheckLoading(true);
    setModelCheckResults([]);

    const testPrompt = [{ role: 'user' as const, content: 'Reply with exactly: OK' }];
    const modelCheckCandidates = availableModels.slice(0, 12);
    const results = await Promise.all(
      modelCheckCandidates.map((model) =>
        callOxloAPI(apiKey, model.id, testPrompt, 0, 32, 20000)
      )
    );

    setModelCheckResults(results);
    setIsModelCheckLoading(false);
    const successCount = results.filter((result) => !result.error).length;
    addToast({
      type: successCount === results.length ? 'success' : 'info',
      title: 'Model check completed',
      message: `${successCount}/${results.length} models responded successfully.`,
    });
  };

  const handleSaveVersion = () => {
    if (!versionName.trim()) {
      addToast({
        type: 'info',
        title: 'Version name needed',
        message: 'Please enter a name before saving.',
      });
      return;
    }

    addPromptVersion({
      id: Date.now().toString(),
      name: versionName.trim(),
      prompt,
      variables: { ...variables },
      timestamp: Date.now(),
    });

    setVersionName('');
    addToast({
      type: 'success',
      title: 'Version saved',
      message: 'Prompt version added to history.',
    });
  };

  const handleRateVersion = (id: string, rating: number) => {
    updatePromptVersion(id, { rating });
  };

  const handleLoadVersion = (version: PromptVersion) => {
    setPrompt(version.prompt);
    setVariables(version.variables);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        void handleRunSingle();
      }
      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSaveVersion();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRunSingle, handleSaveVersion]);

  return (
    <div className="h-full flex flex-col xl:flex-row">
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Prompt Studio</h2>
            <p className="text-slate-400">Write, test, compare, and version prompts across Oxlo models.</p>
          </div>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">Prompt Editor</h3>
              <p className="text-sm text-slate-400">Use {"{{variable}}"} syntax for dynamic values</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                rows={5}
                className="font-mono"
              />

              {extractedVars.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-300">Variables</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {extractedVars.map((varName) => (
                      <Input
                        key={varName}
                        label={varName}
                        value={variables[varName] || ''}
                        onChange={(e) => setVariables({ ...variables, [varName]: e.target.value })}
                        placeholder={`Enter ${varName}...`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-end gap-4">
                <Select
                  label="Model"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  options={modelOptions}
                  className="w-48"
                />
                <div className="w-32">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Temperature: {temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <Button onClick={handleRunSingle} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run
                </Button>
              </div>
            </CardContent>
          </Card>

          {singleResult && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">Single Model Result</h3>
                  <span className="text-sm text-emerald-400">
                    {modelLabelById.get(singleResult.model) || singleResult.model}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {singleResult.latency}ms
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="w-4 h-4" /> {singleResult.tokens} tokens
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {singleResult.error ? (
                  <p className="text-red-400">{singleResult.error}</p>
                ) : (
                  <p className="text-slate-300 whitespace-pre-wrap">{singleResult.content}</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-emerald-400" />
                Model Comparison
              </h3>
              <p className="text-sm text-slate-400">Compare the same prompt on 2-3 models side by side.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleToggleCompareModel(model.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      compareModelsSelected.includes(model.id)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {model.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">Select minimum 2 and maximum 3 models</p>
              <Button onClick={handleCompare} disabled={isComparing || compareModelsSelected.length < 2}>
                {isComparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Compare Models
              </Button>

              {comparisonResults.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mt-4">
                    {comparisonResults.map((result) => (
                    <div
                      key={result.model}
                      className="bg-slate-800/50 rounded-lg border border-slate-700 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-white">
                          {modelLabelById.get(result.model) || result.model}
                        </span>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {result.latency}ms
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" /> {result.tokens}
                          </span>
                        </div>
                      </div>
                      {result.error ? (
                        <p className="text-red-400 text-sm">{result.error}</p>
                      ) : (
                        <p className="text-slate-300 text-sm whitespace-pre-wrap line-clamp-6">{result.content}</p>
                      )}
                    </div>
                  ))}
                  </div>
                )}

               {isComparing && (
                 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mt-4">
                   {compareModelsSelected.map((modelId) => (
                     <div key={modelId} className="rounded-lg border border-slate-700 p-4 bg-slate-800/30">
                       <div className="skeleton h-4 w-28 rounded mb-3" />
                       <div className="skeleton h-3 w-full rounded mb-2" />
                       <div className="skeleton h-3 w-[90%] rounded mb-2" />
                       <div className="skeleton h-3 w-[75%] rounded" />
                     </div>
                   ))}
                 </div>
               )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Model Health Check</h3>
                <p className="text-sm text-slate-400">Test all available models end-to-end with a lightweight prompt.</p>
              </div>
              <Button variant="secondary" onClick={handleModelCheck} disabled={isModelCheckLoading}>
                {isModelCheckLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Run All Models
              </Button>
            </CardHeader>
            {modelCheckResults.length > 0 && (
              <CardContent className="space-y-2">
                {modelCheckResults.map((result) => {
                  const isOk = !result.error;
                  return (
                    <div
                      key={result.model}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                        isOk ? 'bg-emerald-900/30 border-emerald-700' : 'bg-red-900/30 border-red-700'
                      }`}
                    >
                      <span className="text-sm text-white">
                        {modelLabelById.get(result.model) || result.model}
                      </span>
                      <span className={`text-xs ${isOk ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isOk ? `OK (${result.latency}ms)` : result.error}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Save className="w-5 h-5 text-emerald-400" />
                Save Version
              </h3>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="Version name (e.g., v1-professional-tone)"
                  className="flex-1"
                />
                <Button onClick={handleSaveVersion}>
                  <Save className="w-4 h-4" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">Version Diff Viewer</h3>
              <p className="text-sm text-slate-400">Compare two saved prompt versions line-by-line.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedVersions.length < 2 ? (
                <p className="text-sm text-slate-500 italic">Save at least two versions to view diffs.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="Base Version"
                      value={diffBaseId}
                      onChange={(e) => setDiffBaseId(e.target.value)}
                      options={sortedVersions.map((v) => ({ value: v.id, label: v.name }))}
                    />
                    <Select
                      label="Compare With"
                      value={diffCompareId}
                      onChange={(e) => setDiffCompareId(e.target.value)}
                      options={sortedVersions.map((v) => ({ value: v.id, label: v.name }))}
                    />
                  </div>

                  {diffBaseVersion && diffCompareVersion && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-xs font-medium text-slate-400">{diffBaseVersion.name}</div>
                        <div className="text-xs font-medium text-slate-400">{diffCompareVersion.name}</div>
                      </div>

                      <div className="space-y-1 max-h-72 overflow-y-auto">
                        {diffRows.map((row) => (
                          <div key={row.line} className="grid grid-cols-2 gap-2">
                            <div
                              className={`rounded px-2 py-1 font-mono text-xs whitespace-pre-wrap ${
                                row.changed ? 'bg-lime-900/30 text-lime-400' : 'bg-slate-900/60 text-slate-300'
                              }`}
                            >
                              {row.base || ' '}
                            </div>
                            <div
                              className={`rounded px-2 py-1 font-mono text-xs whitespace-pre-wrap ${
                                row.changed ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-900/60 text-slate-300'
                              }`}
                            >
                              {row.compare || ' '}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-400">Variable Diff</p>
                        {variableDiffRows.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">No variables found in selected versions.</p>
                        ) : (
                          variableDiffRows.map((row) => (
                            <div
                              key={row.key}
                              className={`grid grid-cols-3 gap-2 rounded px-2 py-1 text-xs ${
                                row.changed ? 'bg-emerald-600/10 border border-emerald-500/30' : 'bg-slate-900/60'
                              }`}
                            >
                              <span className="text-slate-300">{row.key}</span>
                              <span className="text-slate-400">{row.baseValue || '-'}</span>
                              <span className="text-slate-200">{row.compareValue || '-'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="w-full xl:w-80 bg-slate-900/50 border-t xl:border-t-0 xl:border-l border-slate-800 p-4 overflow-y-auto max-h-[38vh] xl:max-h-none">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Version History
        </h3>

        {bestVersionForCurrentPrompt && (
          <div className="mb-4 rounded-lg border border-emerald-700 bg-emerald-900/30 p-3">
            <p className="text-xs text-emerald-400 font-medium mb-1">Best Rated For Current Prompt</p>
            <p className="text-sm text-white">{bestVersionForCurrentPrompt.name}</p>
            <p className="text-xs text-slate-300">Rating: {bestVersionForCurrentPrompt.rating}/5</p>
          </div>
        )}

        {sortedVersions.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No saved versions yet</p>
        ) : (
          <div className="space-y-2">
            {sortedVersions.map((version) => {
              const bestForThisPrompt = bestVersionByPrompt.get(version.prompt);
              const isBest = bestForThisPrompt?.id === version.id;
              return (
                <div
                  key={version.id}
                  className="bg-slate-800/50 rounded-lg border border-slate-700 p-3 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{version.name}</span>
                      {isBest && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                          BEST
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deletePromptVersion(version.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-2">{version.prompt}</p>
                  <p className="text-[11px] text-slate-500 mb-2">{new Date(version.timestamp).toLocaleString()}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRateVersion(version.id, star)}
                          className={`${
                            (version.rating || 0) >= star ? 'text-lime-400' : 'text-slate-600'
                          } hover:text-lime-400 transition-colors`}
                        >
                          <Star className="w-3 h-3 fill-current" />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleLoadVersion(version)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      Load <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

