import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Brain, Loader2, AlertCircle } from 'lucide-react';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../../../services/oxloApi';

interface AIModelNodeData {
  label: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  modelOptions?: { value: string; label: string }[];
  status?: 'idle' | 'loading' | 'success' | 'error' | 'skipped';
  isLoading?: boolean;
  isActive?: boolean;
  error?: string;
  result?: string;
  onConfigChange?: (config: { model: string; systemPrompt: string; temperature: number }) => void;
}

export const AIModelNode = memo(({ data, selected }: NodeProps<AIModelNodeData>) => {
  const fallbackOptions = AVAILABLE_MODELS.map((m) => ({ value: m.id, label: `${m.name} (${m.provider})` }));
  const selectOptions = data.modelOptions && data.modelOptions.length > 0 ? data.modelOptions : fallbackOptions;
  const model = data.model || selectOptions[0]?.value || DEFAULT_MODEL_ID;
  const systemPrompt = data.systemPrompt || 'You are a helpful assistant.';
  const temperature = data.temperature ?? 0.7;

  const borderClass =
    data.status === 'error'
      ? 'border-red-500 shadow-lg shadow-red-500/20'
      : selected
      ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
      : data.isActive
      ? 'border-emerald-400 shadow-lg shadow-emerald-500/10'
      : 'border-slate-700';

  const handleConfigChange = (updates: Partial<{ model: string; systemPrompt: string; temperature: number }>) => {
    data.onConfigChange?.({
      model: updates.model ?? model,
      systemPrompt: updates.systemPrompt ?? systemPrompt,
      temperature: updates.temperature ?? temperature,
    });
  };

  return (
    <div className={`bg-slate-800 rounded-xl border-2 transition-all duration-200 min-w-[300px] ${borderClass}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-800"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-t-lg">
        <Brain className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white">{data.label || 'AI Model'}</span>
        {(data.isLoading || data.isActive) && <Loader2 className="w-4 h-4 text-white animate-spin ml-auto" />}
      </div>
      <div className="p-3 space-y-3">
        <Select
          label="Model"
          value={model}
          onChange={(e) => handleConfigChange({ model: e.target.value })}
          options={selectOptions}
          className="text-sm nodrag"
        />
        <Textarea
          label="System Prompt"
          placeholder="System instructions..."
          value={systemPrompt}
          onChange={(e) => handleConfigChange({ systemPrompt: e.target.value })}
          rows={2}
          className="text-sm nodrag"
        />
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Temperature: {temperature}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => handleConfigChange({ temperature: parseFloat(e.target.value) })}
            className="w-full nodrag"
          />
        </div>

        {data.status === 'error' && data.error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {data.error}
          </p>
        )}

        {data.result && data.status !== 'error' && (
          <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Output:</p>
            <p className="text-sm text-slate-300 line-clamp-3">{data.result}</p>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-800"
      />
    </div>
  );
});

AIModelNode.displayName = 'AIModelNode';

