import { useState } from 'react';
import { Key, ExternalLink, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useStore } from '../../store/useStore';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const { apiKey, setApiKey } = useStore();
  const [tempKey, setTempKey] = useState(apiKey);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(tempKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
            <Key className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">API Key Setup</h2>
            <p className="text-sm text-slate-400">Connect to Oxlo.ai</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Input
              type="password"
              label="Oxlo.ai API Key"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="Enter your API key..."
            />
            <p className="mt-2 text-xs text-slate-500">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>

          <a
            href="https://oxlo.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Get your API key from Oxlo.ai <ExternalLink className="w-4 h-4" />
          </a>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Key
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

