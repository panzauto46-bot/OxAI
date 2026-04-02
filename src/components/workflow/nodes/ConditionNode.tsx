import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch, AlertCircle } from 'lucide-react';
import { Select } from '../../ui/Select';
import { Input } from '../../ui/Input';

interface ConditionNodeData {
  label: string;
  conditionType: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex';
  value: string;
  status?: 'idle' | 'loading' | 'success' | 'error' | 'skipped';
  isActive?: boolean;
  error?: string;
  result?: string;
  onConfigChange?: (config: { conditionType: string; value: string }) => void;
}

const conditionOptions = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'regex', label: 'Matches Regex' },
];

export const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeData>) => {
  const conditionType = data.conditionType || 'contains';
  const value = data.value || '';

  const borderClass =
    data.status === 'error'
      ? 'border-red-500 shadow-lg shadow-red-500/20'
      : selected
      ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
      : data.isActive
      ? 'border-emerald-400 shadow-lg shadow-emerald-500/10'
      : 'border-slate-700';

  const handleConfigChange = (updates: Partial<{ conditionType: string; value: string }>) => {
    data.onConfigChange?.({
      conditionType: updates.conditionType ?? conditionType,
      value: updates.value ?? value,
    });
  };

  return (
    <div className={`bg-slate-800 rounded-xl border-2 transition-all duration-200 min-w-[260px] ${borderClass}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-800"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-t-lg">
        <GitBranch className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white">{data.label || 'Condition'}</span>
      </div>
      <div className="p-3 space-y-3">
        <Select
          label="Condition Type"
          value={conditionType}
          onChange={(e) => handleConfigChange({ conditionType: e.target.value })}
          options={conditionOptions}
          className="text-sm nodrag"
        />
        <Input
          label="Compare Value"
          placeholder="Value to check..."
          value={value}
          onChange={(e) => handleConfigChange({ value: e.target.value })}
          className="text-sm nodrag"
        />

        {data.status === 'error' && data.error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {data.error}
          </p>
        )}

        {data.result && data.status !== 'error' && (
          <div
            className={`mt-2 p-2 rounded-lg border ${
              data.result.includes('True')
                ? 'bg-emerald-900/30 border-emerald-700'
                : 'bg-red-900/30 border-red-700'
            }`}
          >
            <p
              className={`text-sm font-medium ${
                data.result.includes('True') ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              Result: {data.result}
            </p>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '40%' }}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-800"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '60%' }}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-slate-800"
      />
      <div className="absolute right-[-45px] top-[38%] text-xs text-emerald-400">True</div>
      <div className="absolute right-[-45px] top-[58%] text-xs text-red-400">False</div>
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';

