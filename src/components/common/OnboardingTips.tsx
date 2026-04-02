import { useEffect, useMemo, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

type Mode = 'quick' | 'workflow' | 'prompt' | 'agent' | 'pipeline';

const tipsByMode: Record<Mode, { title: string; tip: string }> = {
  quick: {
    title: 'Quick Builder Tip',
    tip: 'Use natural language, then click Generate Preview for a fast result.',
  },
  workflow: {
    title: 'Workflow Builder Tip',
    tip: 'Use Ctrl+S to save workflow and Ctrl+Enter to run execution quickly.',
  },
  prompt: {
    title: 'Prompt Studio Tip',
    tip: 'Use Ctrl+Enter to run the prompt and Ctrl+S to save the current version.',
  },
  agent: {
    title: 'Agent Builder Tip',
    tip: 'Use Ctrl+Enter to send a chat message without clicking the send button.',
  },
  pipeline: {
    title: 'Content Pipeline Tip',
    tip: 'Use Ctrl+S to save pipeline and Ctrl+Enter to run the current pipeline.',
  },
};

const tipsByModeId: Record<Mode, { title: string; tip: string }> = {
  quick: {
    title: 'Tips Quick Builder',
    tip: 'Isi kebutuhan dengan bahasa biasa lalu klik Generate Preview untuk hasil cepat.',
  },
  workflow: {
    title: 'Tips Workflow Builder',
    tip: 'Gunakan Ctrl+S untuk simpan workflow dan Ctrl+Enter untuk run lebih cepat.',
  },
  prompt: {
    title: 'Tips Prompt Studio',
    tip: 'Gunakan Ctrl+Enter untuk run prompt dan Ctrl+S untuk simpan versi.',
  },
  agent: {
    title: 'Tips Agent Builder',
    tip: 'Gunakan Ctrl+Enter untuk kirim chat tanpa klik tombol send.',
  },
  pipeline: {
    title: 'Tips Content Pipeline',
    tip: 'Gunakan Ctrl+S untuk simpan pipeline dan Ctrl+Enter untuk menjalankan pipeline.',
  },
};

const STORAGE_KEY = 'oxai-onboarding-dismissed';

interface OnboardingTipsProps {
  mode: Mode;
}

export function OnboardingTips({ mode }: OnboardingTipsProps) {
  const language = useStore((state) => state.language);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === '1');
  }, []);

  const content = useMemo(
    () => (language === 'id' ? tipsByModeId[mode] : tipsByMode[mode]),
    [language, mode]
  );

  if (dismissed) return null;

  return (
    <div className="mx-3 mt-3 rounded-xl border border-emerald-500/30 bg-emerald-900/20 backdrop-blur-sm px-3 py-2 animate-fade-in-up">
      <div className="flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-emerald-300 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-200">{content.title}</p>
          <p className="text-xs text-slate-200 mt-0.5">{content.tip}</p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, '1');
            setDismissed(true);
          }}
          className="text-emerald-300/70 hover:text-white transition-colors"
          aria-label="Dismiss onboarding tips"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
