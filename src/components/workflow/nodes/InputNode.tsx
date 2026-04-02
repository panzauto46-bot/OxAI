import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, Upload, FileText, AlertCircle } from 'lucide-react';
import { Textarea } from '../../ui/Textarea';

interface InputNodeData {
  label: string;
  inputType: 'text' | 'file' | 'prompt';
  value: string;
  status?: 'idle' | 'loading' | 'success' | 'error' | 'skipped';
  error?: string;
  isActive?: boolean;
  onChange?: (value: string) => void;
}

export const InputNode = memo(({ data, selected }: NodeProps<InputNodeData>) => {
  const icons = {
    text: FileText,
    file: Upload,
    prompt: MessageSquare,
  };
  const Icon = icons[data.inputType] || MessageSquare;

  const borderClass =
    data.status === 'error'
      ? 'border-red-500 shadow-lg shadow-red-500/20'
      : selected
      ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
      : data.isActive
      ? 'border-emerald-400 shadow-lg shadow-emerald-500/10'
      : 'border-slate-700';

  return (
    <div className={`bg-slate-800 rounded-xl border-2 transition-all duration-200 min-w-[280px] ${borderClass}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
        <Icon className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white">{data.label || 'Input'}</span>
      </div>
      <div className="p-3 space-y-2">
        <Textarea
          placeholder="Enter your input..."
          value={data.value || ''}
          onChange={(e) => data.onChange?.(e.target.value)}
          rows={3}
          className="text-sm nodrag"
        />
        {data.status === 'error' && data.error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {data.error}
          </p>
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

InputNode.displayName = 'InputNode';
