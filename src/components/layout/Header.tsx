import { useState } from 'react';
import { Key, X, Check, PanelLeftOpen } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const {
    apiKey,
    setApiKey,
    addToast,
    githubUser,
    language,
    setLanguage,
  } = useStore();
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  const text = language === 'id'
    ? {
        placeholder: 'Masukkan API key provider',
        keyUpdatedTitle: 'API key diperbarui',
        keyUpdatedSaved: 'API key provider disimpan lokal.',
        keyUpdatedCleared: 'API key dihapus.',
        apiKeySet: 'API Key Terset',
        setApiKey: 'Set API Key',
      }
    : {
        placeholder: 'Enter provider API key',
        keyUpdatedTitle: 'API key updated',
        keyUpdatedSaved: 'Provider API key saved locally.',
        keyUpdatedCleared: 'API key cleared.',
        apiKeySet: 'API Key Set',
        setApiKey: 'Set API Key',
      };

  const handleSaveKey = () => {
    const normalizedKey = tempKey.replace(/\s+/g, '').trim();
    setApiKey(normalizedKey);
    setShowKeyInput(false);
    addToast({
      type: 'success',
      title: text.keyUpdatedTitle,
      message: normalizedKey ? text.keyUpdatedSaved : text.keyUpdatedCleared,
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
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as 'en' | 'id')}
          className="h-8 rounded-lg border border-slate-700 bg-slate-800/70 px-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Language"
        >
          <option value="en">English</option>
          <option value="id">Indonesia</option>
        </select>

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
              placeholder={text.placeholder}
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
            <span className="hidden sm:inline">{apiKey ? text.apiKeySet : text.setApiKey}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
