import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MonitorPlay, Copy, Download, Check, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/Button';

interface OutputNodeData {
  label: string;
  result?: string;
  status?: 'idle' | 'loading' | 'success' | 'error' | 'skipped';
  isActive?: boolean;
  error?: string;
}

export const OutputNode = memo(({ data, selected }: NodeProps<OutputNodeData>) => {
  const [copied, setCopied] = useState(false);

  const borderClass =
    data.status === 'error'
      ? 'border-red-500 shadow-lg shadow-red-500/20'
      : selected
      ? 'border-lime-500 shadow-lg shadow-lime-500/20'
      : data.isActive
      ? 'border-lime-400 shadow-lg shadow-lime-500/10'
      : 'border-slate-700';

  const handleCopy = () => {
    if (!data.result) return;
    navigator.clipboard.writeText(data.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!data.result) return;
    const blob = new Blob([data.result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-slate-800 rounded-xl border-2 transition-all duration-200 min-w-[300px] ${borderClass}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-lime-500 !border-2 !border-slate-800"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-lime-600 to-emerald-600 rounded-t-lg">
        <MonitorPlay className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white">{data.label || 'Output'}</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="bg-slate-900/50 rounded-lg border border-slate-700 min-h-[100px] max-h-[200px] overflow-y-auto p-3">
          {data.status === 'error' && data.error ? (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {data.error}
            </p>
          ) : data.result ? (
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{data.result}</p>
          ) : data.status === 'skipped' ? (
            <p className="text-sm text-slate-500 italic">Skipped due to inactive branch.</p>
          ) : (
            <p className="text-sm text-slate-500 italic">Waiting for output...</p>
          )}
        </div>

        {data.result && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleCopy} className="flex-1 nodrag">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleDownload} className="flex-1 nodrag">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

OutputNode.displayName = 'OutputNode';

