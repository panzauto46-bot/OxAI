import {
  ArrowRight,
  Bot,
  FileText,
  LogIn,
  Loader2,
  PlayCircle,
  Sparkles,
  Wand2,
  Workflow,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { GitHubUser } from '../../store/useStore';

type StudioMode = 'quick' | 'workflow' | 'prompt' | 'agent' | 'pipeline';

interface LandingPageProps {
  onEnterStudio: (mode?: StudioMode) => void;
  onLoginWithGitHub: () => void;
  githubUser: GitHubUser | null;
  isGitHubRedirecting: boolean;
}

interface ModuleCard {
  mode: StudioMode;
  title: string;
  description: string;
  icon: LucideIcon;
}

const modules: ModuleCard[] = [
  {
    mode: 'quick',
    title: 'Quick Builder',
    description: '3-step AI assistant for beginners',
    icon: Rocket,
  },
  {
    mode: 'workflow',
    title: 'Workflow Builder',
    description: 'Visual automation graph',
    icon: Workflow,
  },
  {
    mode: 'prompt',
    title: 'Prompt Studio',
    description: 'Multi-model prompt lab',
    icon: Wand2,
  },
  {
    mode: 'agent',
    title: 'Agent Builder',
    description: 'Persona and tool routing',
    icon: Bot,
  },
  {
    mode: 'pipeline',
    title: 'Content Pipeline',
    description: 'Batch content generation',
    icon: FileText,
  },
];

const tickerItems = [
  'Prompt Engineering',
  'Workflow Orchestration',
  'AI Agent Ops',
  'Content Pipeline',
  'Multi-Model Routing',
  'Production Ready',
];

export function LandingPage({
  onEnterStudio,
  onLoginWithGitHub,
  githubUser,
  isGitHubRedirecting,
}: LandingPageProps) {
  return (
    <section className="relative h-screen overflow-hidden bg-emerald-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.25),transparent_36%),radial-gradient(circle_at_85%_10%,rgba(20,184,166,0.2),transparent_42%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.18),transparent_45%)]" />
      <div className="landing-grid-overlay pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1360px] flex-col px-4 pb-4 pt-3 sm:px-6 lg:px-10">
        <header className="flex h-14 items-center justify-between rounded-2xl border border-emerald-900/60 bg-emerald-950/45 px-3 backdrop-blur-xl sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">OxAI</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300/80">
                Visual AI Studio
              </p>
            </div>
          </div>
          {githubUser ? (
            <Button size="sm" onClick={() => onEnterStudio('quick')}>
              Enter Studio
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={onLoginWithGitHub} disabled={isGitHubRedirecting}>
              {isGitHubRedirecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              <span>{isGitHubRedirecting ? 'Redirecting...' : 'Login GitHub'}</span>
            </Button>
          )}
        </header>

        <main className="grid h-[calc(100%-3.5rem)] items-center gap-5 pb-12 pt-4 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8 lg:pt-5">
          <div className="space-y-4 lg:space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/50 bg-emerald-900/35 px-3 py-1 text-xs font-medium text-emerald-200">
              <PlayCircle className="h-3.5 w-3.5" />
              One screen. No-code AI production cockpit.
            </div>

            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Build, compare, and launch AI systems from one professional workspace.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-emerald-100/75 sm:text-base">
                OxAI gives your team a single operational layer for prompt experiments, agent
                testing, automation workflows, and production-grade content pipelines.
              </p>
              {!githubUser && (
                <p className="text-xs text-emerald-200/85">
                  Login with GitHub first, then you will automatically enter the studio.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {githubUser ? (
                <>
                  <Button size="lg" onClick={() => onEnterStudio('quick')}>
                    Start Building
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="secondary" onClick={() => onEnterStudio('prompt')}>
                    Explore Prompt Studio
                  </Button>
                </>
              ) : (
                <Button size="lg" onClick={onLoginWithGitHub} disabled={isGitHubRedirecting}>
                  {isGitHubRedirecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  <span>{isGitHubRedirecting ? 'Redirecting...' : 'Login with GitHub'}</span>
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 sm:hidden">
              {modules.map((module) => (
                <button
                  type="button"
                  key={module.mode}
                  onClick={() => (githubUser ? onEnterStudio(module.mode) : onLoginWithGitHub())}
                  className="rounded-full border border-emerald-700/60 bg-emerald-900/35 px-3 py-1 text-[11px] font-medium text-emerald-100"
                >
                  {module.title}
                </button>
              ))}
            </div>

            <div className="hidden grid-cols-2 gap-2.5 sm:grid sm:gap-3">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <button
                    type="button"
                    key={module.mode}
                    onClick={() => (githubUser ? onEnterStudio(module.mode) : onLoginWithGitHub())}
                    className={cn(
                      'group rounded-xl border border-emerald-900/70 bg-emerald-950/55 p-3 text-left transition-all duration-300',
                      'hover:border-emerald-500/60 hover:bg-emerald-900/40 hover:-translate-y-0.5'
                    )}
                  >
                    <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700/25 text-emerald-300 transition-colors group-hover:bg-emerald-600/35 group-hover:text-emerald-100">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-white">{module.title}</p>
                    <p className="mt-1 text-xs text-emerald-100/65">{module.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden h-full grid-rows-[minmax(0,1fr)_auto] gap-3 md:grid">
            <div className="landing-orb-scene relative min-h-[220px] rounded-2xl border border-emerald-900/60 bg-emerald-950/55 p-4 backdrop-blur-xl">
              <div className="landing-orb-shadow" />
              <div className="landing-orb">
                <div className="landing-orb-core" />
                <div className="landing-orb-ring landing-orb-ring-a" />
                <div className="landing-orb-ring landing-orb-ring-b" />
                <div className="landing-orb-ring landing-orb-ring-c" />
                <div className="landing-chip landing-chip-a">Prompt Ops</div>
                <div className="landing-chip landing-chip-b">Agent Runtime</div>
                <div className="landing-chip landing-chip-c">Flow Engine</div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/45 p-3 backdrop-blur-xl sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Live Flow Animation</p>
                <span className="rounded-full border border-emerald-600/60 bg-emerald-700/20 px-2 py-0.5 text-[11px] text-emerald-200">
                  Running
                </span>
              </div>

              <svg className="h-24 w-full sm:h-28" viewBox="0 0 440 120" role="img" aria-label="AI flow animation">
                <defs>
                  <linearGradient id="landingFlowStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="45%" stopColor="#34d399" stopOpacity="1" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <path
                  className="landing-flow-path"
                  d="M10 84 C70 18, 150 18, 210 72 S346 126, 430 60"
                  stroke="url(#landingFlowStroke)"
                />
                <path
                  className="landing-flow-path landing-flow-path-delay"
                  d="M10 94 C74 136, 154 136, 226 92 S352 36, 430 90"
                  stroke="url(#landingFlowStroke)"
                />
                <circle r="4.5" fill="#34d399">
                  <animateMotion dur="4.2s" repeatCount="indefinite" path="M10 84 C70 18, 150 18, 210 72 S346 126, 430 60" />
                </circle>
                <circle r="3.8" fill="#5eead4">
                  <animateMotion dur="5.4s" repeatCount="indefinite" path="M10 94 C74 136, 154 136, 226 92 S352 36, 430 90" />
                </circle>
              </svg>
            </div>
          </div>
        </main>
      </div>

      <div className="landing-marquee absolute inset-x-0 bottom-0 z-20">
        <div className="landing-marquee-track">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <span key={`${item}-${index}`} className="landing-marquee-item">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
