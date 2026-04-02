import { useState } from 'react';
import { Key, X, Check, ExternalLink, PanelLeftOpen } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { apiKey, setApiKey, addToast, githubUser } = useStore();
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  const handleSaveKey = () => {
    const normalizedKey = tempKey.replace(/\s+/g, '').trim();
    setApiKey(normalizedKey);
    setShowKeyInput(false);
    addToast({
      type: 'success',
      title: 'API key updated',
      message: normalizedKey ? 'Oxlo.ai API key saved locally.' : 'API key cleared.',
    });
  };

  return (
    <header className="h-14 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-3 md:px-4">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="md:hidden text-slate-400 hover:text-white transition-colors"
          aria-label="Open sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
        <h2 className="text-xs md:text-sm font-medium text-slate-400 truncate">
          Powered by <span className="text-emerald-400 font-semibold">Oxlo.ai</span>
        </h2>
        <a
          href="https://oxlo.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex text-xs text-slate-500 hover:text-emerald-400 items-center gap-1 transition-colors"
        >
          Visit Oxlo.ai <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {githubUser && (
          <a
            href={githubUser.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-900/25 px-2 py-1 hover:border-emerald-500/60 transition-colors"
            title={`Signed in as @${githubUser.login}`}
          >
            <img
              src={githubUser.avatarUrl}
              alt={githubUser.login}
              className="w-6 h-6 rounded-full border border-emerald-600/40"
            />
            <span className="text-xs text-emerald-100 max-w-[140px] truncate">
              {githubUser.name || `@${githubUser.login}`}
            </span>
          </a>
        )}

        {showKeyInput ? (
          <div className="flex items-center gap-2">
            <Input
              type="password"
              placeholder="Enter Oxlo.ai key"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="w-40 sm:w-64 md:w-72 py-1.5 text-sm"
            />
            <Button size="icon" onClick={handleSaveKey}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setShowKeyInput(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant={apiKey ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setShowKeyInput(true)}
          >
            <Key className="w-4 h-4" />
            <span className="hidden sm:inline">{apiKey ? 'API Key Set' : 'Set API Key'}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
