import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Node, Edge } from 'reactflow';

export interface PromptVersion {
  id: string;
  name: string;
  prompt: string;
  variables: Record<string, string>;
  timestamp: number;
  rating?: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  persona: string;
  instructions: string;
  tools: string[];
  template: string;
  model?: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'error';
  title: string;
  message?: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string;
  profileUrl: string;
  email: string | null;
}

function normalizeApiKey(key: string): string {
  return key.replace(/\s+/g, '').trim();
}

interface OxAIState {
  // Navigation
  activeMode: 'quick' | 'workflow' | 'prompt' | 'agent' | 'pipeline';
  setActiveMode: (mode: 'quick' | 'workflow' | 'prompt' | 'agent' | 'pipeline') => void;
  experienceMode: 'beginner' | 'advanced';
  setExperienceMode: (mode: 'beginner' | 'advanced') => void;
  language: 'en' | 'id';
  setLanguage: (language: 'en' | 'id') => void;
  logout: () => void;

  // Auth
  githubUser: GitHubUser | null;
  setGithubUser: (user: GitHubUser | null) => void;

  // API Key
  apiKey: string;
  setApiKey: (key: string) => void;

  // Workflow Builder
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  saveWorkflow: (workflow: Workflow) => void;
  deleteWorkflow: (id: string) => void;

  // Prompt Studio
  promptVersions: PromptVersion[];
  addPromptVersion: (version: PromptVersion) => void;
  updatePromptVersion: (id: string, updates: Partial<PromptVersion>) => void;
  deletePromptVersion: (id: string) => void;

  // Agent Builder
  agents: AgentConfig[];
  currentAgent: AgentConfig | null;
  setCurrentAgent: (agent: AgentConfig | null) => void;
  saveAgent: (agent: AgentConfig) => void;
  deleteAgent: (id: string) => void;
  agentMessages: Message[];
  setAgentMessages: (messages: Message[]) => void;
  addAgentMessage: (message: Message) => void;
  clearAgentMessages: () => void;

  // Node execution results
  nodeResults: Record<string, any>;
  setNodeResult: (nodeId: string, result: any) => void;
  clearNodeResults: () => void;

  // Toasts
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useStore = create<OxAIState>()(
  persist(
    (set) => ({
      // Navigation
      activeMode: 'quick',
      setActiveMode: (mode) => set({ activeMode: mode }),
      experienceMode: 'beginner',
      setExperienceMode: (mode) => set({ experienceMode: mode }),
      language: 'en',
      setLanguage: (language) => set({ language }),
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('oxai-storage');
          localStorage.removeItem('oxai-pipelines');
          localStorage.removeItem('oxai-onboarding-dismissed');
        }
        set({
          activeMode: 'quick',
          experienceMode: 'beginner',
          language: 'en',
          githubUser: null,
          apiKey: '',
          workflows: [],
          currentWorkflow: null,
          promptVersions: [],
          agents: [],
          currentAgent: null,
          agentMessages: [],
          nodeResults: {},
          toasts: [],
        });
      },

      // Auth
      githubUser: null,
      setGithubUser: (user) => set({ githubUser: user }),

      // API Key
      apiKey: '',
      setApiKey: (key) => set({ apiKey: normalizeApiKey(key) }),

      // Workflow Builder
      workflows: [],
      currentWorkflow: null,
      setCurrentWorkflow: (workflow) => set({ currentWorkflow: workflow }),
      saveWorkflow: (workflow) => set((state) => {
        const existing = state.workflows.findIndex((w) => w.id === workflow.id);
        if (existing >= 0) {
          const newWorkflows = [...state.workflows];
          newWorkflows[existing] = workflow;
          return { workflows: newWorkflows, currentWorkflow: workflow };
        }
        return { workflows: [...state.workflows, workflow], currentWorkflow: workflow };
      }),
      deleteWorkflow: (id) => set((state) => ({
        workflows: state.workflows.filter((w) => w.id !== id),
        currentWorkflow: state.currentWorkflow?.id === id ? null : state.currentWorkflow,
      })),

      // Prompt Studio
      promptVersions: [],
      addPromptVersion: (version) => set((state) => ({
        promptVersions: [...state.promptVersions, version],
      })),
      updatePromptVersion: (id, updates) => set((state) => ({
        promptVersions: state.promptVersions.map((v) =>
          v.id === id ? { ...v, ...updates } : v
        ),
      })),
      deletePromptVersion: (id) => set((state) => ({
        promptVersions: state.promptVersions.filter((v) => v.id !== id),
      })),

      // Agent Builder
      agents: [],
      currentAgent: null,
      setCurrentAgent: (agent) => set({ currentAgent: agent }),
      saveAgent: (agent) => set((state) => {
        const existing = state.agents.findIndex((a) => a.id === agent.id);
        if (existing >= 0) {
          const newAgents = [...state.agents];
          newAgents[existing] = agent;
          return { agents: newAgents, currentAgent: agent };
        }
        return { agents: [...state.agents, agent], currentAgent: agent };
      }),
      deleteAgent: (id) => set((state) => ({
        agents: state.agents.filter((a) => a.id !== id),
        currentAgent: state.currentAgent?.id === id ? null : state.currentAgent,
      })),
      agentMessages: [],
      setAgentMessages: (messages) => set({ agentMessages: messages }),
      addAgentMessage: (message) => set((state) => ({
        agentMessages: [...state.agentMessages, message],
      })),
      clearAgentMessages: () => set({ agentMessages: [] }),

      // Node execution results
      nodeResults: {},
      setNodeResult: (nodeId, result) => set((state) => ({
        nodeResults: { ...state.nodeResults, [nodeId]: result },
      })),
      clearNodeResults: () => set({ nodeResults: {} }),

      // Toasts
      toasts: [],
      addToast: (toast) => set((state) => ({
        toasts: [
          ...state.toasts,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            ...toast,
          },
        ],
      })),
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      })),
      clearToasts: () => set({ toasts: [] }),
    }),
    {
      name: 'oxai-storage',
      partialize: (state) => ({
        activeMode: state.activeMode,
        experienceMode: state.experienceMode,
        language: state.language,
        githubUser: state.githubUser,
        apiKey: state.apiKey,
        workflows: state.workflows,
        promptVersions: state.promptVersions,
        agents: state.agents,
      }),
    }
  )
);
