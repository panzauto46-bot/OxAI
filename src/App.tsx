import { Suspense, lazy, useEffect, useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastViewport } from './components/common/ToastViewport';
import { OnboardingTips } from './components/common/OnboardingTips';
import { LandingPage } from './components/landing/LandingPage';
import { useStore } from './store/useStore';
import {
  beginGitHubLogin,
  canStartGitHubLogin,
  consumeAndValidateOAuthState,
  getGitHubRedirectUri,
  readOAuthParamsFromUrl,
} from './services/githubAuth';

type StudioMode = 'workflow' | 'prompt' | 'agent' | 'pipeline';

const WorkflowBuilder = lazy(() =>
  import('./components/workflow/WorkflowBuilder').then((module) => ({
    default: module.WorkflowBuilder,
  }))
);

const PromptStudio = lazy(() =>
  import('./components/prompt/PromptStudio').then((module) => ({
    default: module.PromptStudio,
  }))
);

const AgentBuilder = lazy(() =>
  import('./components/agent/AgentBuilder').then((module) => ({
    default: module.AgentBuilder,
  }))
);

const ContentPipeline = lazy(() =>
  import('./components/pipeline/ContentPipeline').then((module) => ({
    default: module.ContentPipeline,
  }))
);

function ModuleSkeleton() {
  return (
    <div className="h-full p-4 md:p-6">
      <div className="h-full rounded-2xl border border-emerald-900/50 bg-emerald-950/25 p-4 md:p-6 space-y-4">
        <div className="h-8 w-48 rounded-lg skeleton" />
        <div className="h-16 w-full rounded-lg skeleton" />
        <div className="h-16 w-full rounded-lg skeleton" />
        <div className="h-[55%] w-full rounded-xl skeleton" />
      </div>
    </div>
  );
}

function App() {
  const { activeMode, setActiveMode, setGithubUser, addToast, githubUser } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [isGitHubRedirecting, setIsGitHubRedirecting] = useState(false);

  useEffect(() => {
    const oauthParams = readOAuthParamsFromUrl();
    if (!oauthParams) return;

    if (oauthParams.error) {
      addToast({
        type: 'error',
        title: 'GitHub login canceled',
        message: oauthParams.errorDescription || oauthParams.error,
      });
      return;
    }

    if (!oauthParams.code || !consumeAndValidateOAuthState(oauthParams.state)) {
      addToast({
        type: 'error',
        title: 'GitHub login failed',
        message: 'OAuth state mismatch. Please try logging in again.',
      });
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await fetch('/api/auth/github/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: oauthParams.code,
            redirectUri: getGitHubRedirectUri(),
          }),
        });

        const payload = await response.json();
        if (!response.ok || !payload?.user) {
          throw new Error(payload?.error || 'Failed to complete GitHub OAuth exchange.');
        }

        setGithubUser(payload.user);
        setActiveMode('workflow');
        setShowLanding(false);
        window.location.hash = '#workflow';
        addToast({
          type: 'success',
          title: 'GitHub connected',
          message: `Signed in as @${payload.user.login}.`,
        });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'GitHub login failed',
          message: error instanceof Error ? error.message : 'Unable to complete GitHub login.',
        });
      }
    };

    void exchangeCode();
  }, [addToast, setActiveMode, setGithubUser]);

  useEffect(() => {
    const syncFromHash = () => {
      if (!githubUser) {
        setShowLanding(true);
        return;
      }

      const hash = window.location.hash.toLowerCase();
      const plainHash = hash.startsWith('#') ? hash.slice(1) : hash;

      if (hash.startsWith('#agent=')) {
        setActiveMode('agent');
        setShowLanding(false);
        return;
      }

      if (hash.startsWith('#workflow=')) {
        setActiveMode('workflow');
        setShowLanding(false);
        return;
      }

      if (plainHash === 'workflow' || plainHash === 'prompt' || plainHash === 'agent' || plainHash === 'pipeline') {
        setActiveMode(plainHash as StudioMode);
        setShowLanding(false);
        return;
      }

      if (plainHash === 'studio') {
        setShowLanding(false);
        return;
      }

      setShowLanding(true);
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [githubUser, setActiveMode]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleEnterStudio = (mode?: StudioMode) => {
    if (!githubUser) {
      addToast({
        type: 'info',
        title: 'Login required',
        message: 'Please login with GitHub first.',
      });
      return;
    }

    if (mode) {
      setActiveMode(mode);
      window.location.hash = `#${mode}`;
    } else {
      window.location.hash = '#studio';
    }
    setShowLanding(false);
  };

  const handleLoginWithGitHub = async () => {
    if (!canStartGitHubLogin()) {
      addToast({
        type: 'error',
        title: 'GitHub OAuth not configured',
        message: 'Set VITE_GITHUB_CLIENT_ID first, then try again.',
      });
      return;
    }

    try {
      setIsGitHubRedirecting(true);
      await beginGitHubLogin();
    } catch (error) {
      setIsGitHubRedirecting(false);
      addToast({
        type: 'error',
        title: 'GitHub login failed',
        message: error instanceof Error ? error.message : 'Failed to start GitHub OAuth.',
      });
    }
  };

  if (showLanding) {
    return (
      <>
        <LandingPage
          onEnterStudio={handleEnterStudio}
          onLoginWithGitHub={() => void handleLoginWithGitHub()}
          githubUser={githubUser}
          isGitHubRedirecting={isGitHubRedirecting}
        />
        <ToastViewport />
      </>
    );
  }

  return (
    <div className="h-screen bg-emerald-950 flex overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(20,184,166,0.14),transparent_40%)]" />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <OnboardingTips mode={activeMode} />
        <main className="flex-1 overflow-hidden animate-fade-in-up">
          <Suspense fallback={<ModuleSkeleton />}>
            {activeMode === 'workflow' && <WorkflowBuilder />}
            {activeMode === 'prompt' && <PromptStudio />}
            {activeMode === 'agent' && <AgentBuilder />}
            {activeMode === 'pipeline' && <ContentPipeline />}
          </Suspense>
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}

export default App;
