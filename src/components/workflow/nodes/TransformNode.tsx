import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Wrench, AlertCircle } from 'lucide-react';
import { Select } from '../../ui/Select';
import { Input } from '../../ui/Input';

interface TransformNodeData {
  label: string;
  transformType: 'regex' | 'json' | 'uppercase' | 'lowercase' | 'trim' | 'split';
  pattern?: string;
  status?: 'idle' | 'loading' | 'success' | 'error' | 'skipped';
  isActive?: boolean;
  error?: string;
  result?: string;
  onConfigChange?: (config: { transformType: string; pattern: string }) => void;
}

const transformOptions = [
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'trim', label: 'Trim Whitespace' },
  { value: 'json', label: 'Parse JSON' },
  { value: 'regex', label: 'Regex Extract' },
  { value: 'split', label: 'Split by Delimiter' },
];

export const TransformNode = memo(({ data, selected }: NodeProps<TransformNodeData>) => {
  const transformType = data.transformType || 'uppercase';
  const pattern = data.pattern || '';

  const borderClass =
    data.status === 'error'
      ? 'border-red-500 shadow-lg shadow-red-500/20'
      : selected
      ? 'border-teal-500 shadow-lg shadow-teal-500/20'
      : data.isActive
      ? 'border-teal-400 shadow-lg shadow-teal-500/10'
      : 'border-slate-700';

  const handleConfigChange = (updates: Partial<{ transformType: string; pattern: string }>) => {
    data.onConfigChange?.({
      transformType: updates.transformType ?? transformType,
      pattern: updates.pattern ?? pattern,
    });
  };

  const needsPattern = transformType === 'regex' || transformType === 'split';

  return (
    <div className={`bg-slate-800 rounded-xl border-2 transition-all duration-200 min-w-[260px] ${borderClass}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-teal-500 !border-2 !border-slate-800"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-t-lg">
        <Wrench className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white">{data.label || 'Transform'}</span>
      </div>
      <div className="p-3 space-y-3">
        <Select
          label="Transform Type"
          value={transformType}
          onChange={(e) => handleConfigChange({ transformType: e.target.value })}
          options={transformOptions}
          className="text-sm nodrag"
        />
        {needsPattern && (
          <Input
            label={transformType === 'regex' ? 'Regex Pattern' : 'Delimiter'}
            placeholder={transformType === 'regex' ? '\\d+' : ','}
            value={pattern}
            onChange={(e) => handleConfigChange({ pattern: e.target.value })}
            className="text-sm nodrag"
          />
        )}

        {data.status === 'error' && data.error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {data.error}
          </p>
        )}

        {data.result && data.status !== 'error' && (
          <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Result:</p>
            <p className="text-sm text-slate-300 line-clamp-2">{data.result}</p>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-teal-500 !border-2 !border-slate-800"
      />
    </div>
  );
});

TransformNode.displayName = 'TransformNode';

