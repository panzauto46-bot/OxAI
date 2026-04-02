import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Play,
  Save,
  Trash2,
  MessageSquare,
  Brain,
  MonitorPlay,
  Wrench,
  GitBranch,
  Loader2,
  Copy,
  Download,
  Link2,
  FolderOpen,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { InputNode } from './nodes/InputNode';
import { AIModelNode } from './nodes/AIModelNode';
import { OutputNode } from './nodes/OutputNode';
import { TransformNode } from './nodes/TransformNode';
import { ConditionNode } from './nodes/ConditionNode';
import { useStore, Workflow } from '../../store/useStore';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID, callOxloAPI } from '../../services/oxloApi';
import { useAvailableModels } from '../../hooks/useAvailableModels';

type NodeData = Record<string, unknown>;

const nodeTypes = {
  inputNode: InputNode,
  aiModel: AIModelNode,
  outputNode: OutputNode,
  transformNode: TransformNode,
  conditionNode: ConditionNode,
};

const nodeTemplates = [
  {
    type: 'inputNode',
    label: 'Input',
    icon: MessageSquare,
    hoverClass: 'hover:border-emerald-500/50',
    iconClass: 'text-emerald-400',
  },
  {
    type: 'aiModel',
    label: 'AI Model',
    icon: Brain,
    hoverClass: 'hover:border-emerald-500/50',
    iconClass: 'text-emerald-400',
  },
  {
    type: 'transformNode',
    label: 'Transform',
    icon: Wrench,
    hoverClass: 'hover:border-teal-500/50',
    iconClass: 'text-teal-400',
  },
  {
    type: 'conditionNode',
    label: 'Condition',
    icon: GitBranch,
    hoverClass: 'hover:border-emerald-500/50',
    iconClass: 'text-emerald-400',
  },
  {
    type: 'outputNode',
    label: 'Output',
    icon: MonitorPlay,
    hoverClass: 'hover:border-lime-500/50',
    iconClass: 'text-lime-400',
  },
] as const;

function buildModelOptions(models: { id: string; name: string; provider: string }[]): {
  value: string;
  label: string;
}[] {
  return models.map((model) => ({
    value: model.id,
    label: `${model.name} (${model.provider})`,
  }));
}

const fallbackModelOptions = buildModelOptions(AVAILABLE_MODELS);

function createInitialNodes(defaultModel: string = DEFAULT_MODEL_ID): Node[] {
  return [
    {
      id: '1',
      type: 'inputNode',
      position: { x: 50, y: 150 },
      data: { label: 'User Input', inputType: 'text', value: '' },
    },
    {
      id: '2',
      type: 'aiModel',
      position: { x: 400, y: 100 },
      data: {
        label: 'AI Model',
        model: defaultModel,
        modelOptions: fallbackModelOptions,
        systemPrompt: 'You are a helpful assistant.',
        temperature: 0.7,
      },
    },
    {
      id: '3',
      type: 'outputNode',
      position: { x: 800, y: 150 },
      data: { label: 'Output' },
    },
  ];
}

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10b981' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#10b981' } },
];

function toNodeData(data: unknown): NodeData {
  if (data && typeof data === 'object') return data as NodeData;
  return {};
}

function hydrateRuntimeNode(node: Node): Node {
  const data = toNodeData(node.data);
  return {
    ...node,
    data: {
      ...data,
      status: data.status ?? 'idle',
      isActive: false,
      isLoading: false,
      error: undefined,
    },
  };
}

function stripRuntimeNodeData(node: Node): Node {
  const data = toNodeData(node.data);
  const {
    onChange,
    onConfigChange,
    modelOptions,
    isActive,
    isLoading,
    status,
    error,
    ...persistable
  } = data;
  return {
    ...node,
    data: persistable,
  };
}

function applyTransform(input: string, transformType: string, pattern: string): string {
  switch (transformType) {
    case 'uppercase':
      return input.toUpperCase();
    case 'lowercase':
      return input.toLowerCase();
    case 'trim':
      return input.trim();
    case 'json': {
      const parsed = JSON.parse(input);
      return JSON.stringify(parsed, null, 2);
    }
    case 'regex': {
      const match = input.match(new RegExp(pattern, 'g'));
      return match ? match.join(', ') : 'No match';
    }
    case 'split':
      return input.split(pattern).join('\n');
    default:
      return input;
  }
}

function evaluateCondition(input: string, conditionType: string, value: string): boolean {
  switch (conditionType) {
    case 'contains':
      return input.includes(value);
    case 'equals':
      return input === value;
    case 'startsWith':
      return input.startsWith(value);
    case 'endsWith':
      return input.endsWith(value);
    case 'regex':
      return new RegExp(value).test(input);
    default:
      return false;
  }
}

function WorkflowBuilderInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const handlersHydratedRef = useRef(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes().map(hydrateRuntimeNode));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [isRunning, setIsRunning] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const {
    apiKey,
    workflows,
    currentWorkflow,
    setCurrentWorkflow,
    saveWorkflow,
    deleteWorkflow,
    setNodeResult,
    clearNodeResults,
    addToast,
  } = useStore();
  const { modelOptions, defaultModelId } = useAvailableModels(apiKey);

  const updateNodeData = useCallback(
    (nodeId: string, updates: NodeData) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...toNodeData(node.data), ...updates } }
            : node
        )
      );
    },
    [setNodes]
  );

  const wireNodeHandlers = useCallback(
    (node: Node): Node => {
      const data = toNodeData(node.data);

      if (node.type === 'inputNode') {
        return {
          ...node,
          data: {
            ...data,
            onChange: (value: string) => {
              setNodes((currentNodes) =>
                currentNodes.map((candidate) =>
                  candidate.id === node.id
                    ? { ...candidate, data: { ...toNodeData(candidate.data), value } }
                    : candidate
                )
              );
            },
          },
        };
      }

      if (node.type === 'aiModel') {
        const activeModelOptions = modelOptions.length > 0 ? modelOptions : fallbackModelOptions;
        const currentModel =
          typeof data.model === 'string' &&
          activeModelOptions.some((option) => option.value === data.model)
            ? data.model
            : activeModelOptions[0]?.value || defaultModelId;

        return {
          ...node,
          data: {
            ...data,
            model: currentModel,
            modelOptions: activeModelOptions,
            onConfigChange: (config: { model: string; systemPrompt: string; temperature: number }) => {
              setNodes((currentNodes) =>
                currentNodes.map((candidate) =>
                  candidate.id === node.id
                    ? {
                        ...candidate,
                        data: {
                          ...toNodeData(candidate.data),
                          model: config.model,
                          systemPrompt: config.systemPrompt,
                          temperature: config.temperature,
                        },
                      }
                    : candidate
                )
              );
            },
          },
        };
      }

      if (node.type === 'transformNode') {
        return {
          ...node,
          data: {
            ...data,
            onConfigChange: (config: { transformType: string; pattern: string }) => {
              setNodes((currentNodes) =>
                currentNodes.map((candidate) =>
                  candidate.id === node.id
                    ? {
                        ...candidate,
                        data: {
                          ...toNodeData(candidate.data),
                          transformType: config.transformType,
                          pattern: config.pattern,
                        },
                      }
                    : candidate
                )
              );
            },
          },
        };
      }

      if (node.type === 'conditionNode') {
        return {
          ...node,
          data: {
            ...data,
            onConfigChange: (config: { conditionType: string; value: string }) => {
              setNodes((currentNodes) =>
                currentNodes.map((candidate) =>
                  candidate.id === node.id
                    ? {
                        ...candidate,
                        data: {
                          ...toNodeData(candidate.data),
                          conditionType: config.conditionType,
                          value: config.value,
                        },
                      }
                    : candidate
                )
              );
            },
          },
        };
      }

      return node;
    },
    [defaultModelId, modelOptions, setNodes]
  );

  const hydrateNodesForCanvas = useCallback(
    (workflowNodes: Node[]) => workflowNodes.map((node) => wireNodeHandlers(hydrateRuntimeNode(node))),
    [wireNodeHandlers]
  );

  useEffect(() => {
    if (handlersHydratedRef.current) return;
    setNodes((currentNodes) => currentNodes.map((node) => wireNodeHandlers(node)));
    handlersHydratedRef.current = true;
  }, [setNodes, wireNodeHandlers]);

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => (node.type === 'aiModel' ? wireNodeHandlers(node) : node))
    );
  }, [setNodes, wireNodeHandlers]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#workflow=')) return;

    try {
      const encoded = hash.replace('#workflow=', '');
      const decoded = decodeURIComponent(atob(encoded));
      const parsed = JSON.parse(decoded) as Workflow;

      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error('Invalid workflow payload');
      }

      setNodes(hydrateNodesForCanvas(parsed.nodes));
      setEdges(parsed.edges);
      setWorkflowName(parsed.name || 'Imported Workflow');
      setCurrentWorkflow(null);
      clearNodeResults();
      setImportError(null);
    } catch {
      setImportError('Failed to import workflow from link. The link may be invalid.');
    }
  }, [clearNodeResults, hydrateNodesForCanvas, setCurrentWorkflow, setEdges, setNodes]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((currentEdges) =>
        addEdge({ ...params, animated: true, style: { stroke: '#10b981' } }, currentEdges)
      ),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const template = nodeTemplates.find((candidate) => candidate.type === type);
      const newNode: Node = {
        id: `${Date.now()}`,
        type,
        position,
        data: {
          label: template?.label || 'Node',
          ...(type === 'inputNode' && { inputType: 'text', value: '' }),
          ...(type === 'aiModel' && {
            model: modelOptions[0]?.value || defaultModelId,
            modelOptions: modelOptions.length > 0 ? modelOptions : fallbackModelOptions,
            systemPrompt: 'You are a helpful assistant.',
            temperature: 0.7,
          }),
          ...(type === 'transformNode' && { transformType: 'uppercase', pattern: '' }),
          ...(type === 'conditionNode' && { conditionType: 'contains', value: '' }),
          status: 'idle',
        },
      };

      setNodes((currentNodes) => [...currentNodes, wireNodeHandlers(newNode)]);
    },
    [defaultModelId, modelOptions, reactFlowInstance, setNodes, wireNodeHandlers]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const createWorkflowSnapshot = useCallback(
    (id: string): Workflow => ({
      id,
      name: workflowName.trim() || 'Untitled Workflow',
      nodes: nodes.map((node) => stripRuntimeNodeData(node)),
      edges,
      timestamp: Date.now(),
    }),
    [nodes, edges, workflowName]
  );

  const handleSaveWorkflow = () => {
    const workflowId = currentWorkflow?.id || Date.now().toString();
    const workflow = createWorkflowSnapshot(workflowId);
    saveWorkflow(workflow);
    setCurrentWorkflow(workflow);
    setWorkflowName(workflow.name);
    addToast({
      type: 'success',
      title: 'Workflow saved',
      message: `${workflow.name} has been saved.`,
    });
  };

  const handleLoadWorkflow = (workflow: Workflow) => {
    setNodes(hydrateNodesForCanvas(workflow.nodes));
    setEdges(workflow.edges);
    setWorkflowName(workflow.name);
    setCurrentWorkflow(workflow);
    clearNodeResults();
    setImportError(null);
  };

  const handleDeleteWorkflow = (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    deleteWorkflow(id);
    if (currentWorkflow?.id === id) {
      setCurrentWorkflow(null);
      setWorkflowName('My Workflow');
    }
    addToast({
      type: 'info',
      title: 'Workflow deleted',
    });
  };

  const handleDuplicateWorkflow = (workflow: Workflow) => {
    const duplicate: Workflow = {
      ...workflow,
      id: Date.now().toString(),
      name: `${workflow.name} (Copy)`,
      timestamp: Date.now(),
    };
    saveWorkflow(duplicate);
    addToast({
      type: 'success',
      title: 'Workflow duplicated',
      message: `${duplicate.name} created.`,
    });
  };

  const handleExportWorkflow = (workflow?: Workflow) => {
    const payload = workflow || createWorkflowSnapshot(currentWorkflow?.id || Date.now().toString());
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payload.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      type: 'success',
      title: 'Workflow exported',
      message: `${payload.name}.json downloaded.`,
    });
  };

  const handleShareWorkflow = async () => {
    try {
      const payload = createWorkflowSnapshot(currentWorkflow?.id || Date.now().toString());
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
      const shareLink = `${window.location.origin}${window.location.pathname}#workflow=${encoded}`;
      await navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      addToast({
        type: 'success',
        title: 'Share link copied',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Share failed',
        message: 'Unable to generate workflow share link.',
      });
    }
  };

  const executeWorkflow = async () => {
    if (!apiKey) {
      addToast({
        type: 'error',
        title: 'API key required',
        message: 'Set your Oxlo.ai API key first.',
      });
      return;
    }
    if (nodes.length === 0) {
      addToast({
        type: 'info',
        title: 'No nodes to run',
        message: 'Add at least one node before running workflow.',
      });
      return;
    }

    setIsRunning(true);
    clearNodeResults();

    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...toNodeData(node.data),
          isActive: false,
          isLoading: false,
          status: 'idle',
          error: undefined,
          ...(node.type !== 'inputNode' && { result: '' }),
        },
      }))
    );

    const executionNodes = nodes.map((node) => stripRuntimeNodeData(node));
    const unresolved = new Set(executionNodes.map((node) => node.id));
    const blockedEdges = new Set<string>();
    const nodeOutputs = new Map<string, string>();

    const incomingByTarget = new Map<string, Edge[]>();
    const outgoingBySource = new Map<string, Edge[]>();

    edges.forEach((edge) => {
      const incoming = incomingByTarget.get(edge.target) || [];
      incoming.push(edge);
      incomingByTarget.set(edge.target, incoming);

      const outgoing = outgoingBySource.get(edge.source) || [];
      outgoing.push(edge);
      outgoingBySource.set(edge.source, outgoing);
    });

    while (unresolved.size > 0) {
      let progressed = false;

      for (const node of executionNodes) {
        if (!unresolved.has(node.id)) continue;

        const incomingEdges = (incomingByTarget.get(node.id) || []).filter(
          (edge) => !blockedEdges.has(edge.id)
        );
        const allParentsResolved = incomingEdges.every((edge) => !unresolved.has(edge.source));
        if (!allParentsResolved) continue;

        progressed = true;
        updateNodeData(node.id, { isActive: true, status: 'loading', error: undefined });

        const availableInputs = incomingEdges
          .filter((edge) => nodeOutputs.has(edge.source))
          .map((edge) => nodeOutputs.get(edge.source) ?? '');

        if (incomingEdges.length > 0 && availableInputs.length === 0) {
          updateNodeData(node.id, {
            isActive: false,
            isLoading: false,
            status: 'skipped',
            result: 'Skipped (inactive branch)',
          });
          setNodeResult(node.id, { status: 'skipped', reason: 'Inactive branch' });
          unresolved.delete(node.id);
          continue;
        }

        const input = availableInputs.join('\n');
        let output = '';

        try {
          const nodeData = toNodeData(node.data);

          if (node.type === 'inputNode') {
            output = String(nodeData.value ?? '');
            updateNodeData(node.id, {
              isActive: false,
              isLoading: false,
              status: 'success',
              result: output,
              error: undefined,
            });
            setNodeResult(node.id, { output, status: 'success' });
          } else if (node.type === 'aiModel') {
            updateNodeData(node.id, { isLoading: true, status: 'loading' });
            const response = await callOxloAPI(
              apiKey,
              String(nodeData.model ?? defaultModelId),
              [
                {
                  role: 'system',
                  content: String(nodeData.systemPrompt ?? 'You are a helpful assistant.'),
                },
                { role: 'user', content: input },
              ],
              Number(nodeData.temperature ?? 0.7)
            );

            if (response.error) {
              throw new Error(response.error);
            }

            output = response.content;
            updateNodeData(node.id, {
              isActive: false,
              isLoading: false,
              status: 'success',
              result: output,
              error: undefined,
            });
            setNodeResult(node.id, { output, status: 'success', ...response });
          } else if (node.type === 'transformNode') {
            output = applyTransform(
              input,
              String(nodeData.transformType ?? 'uppercase'),
              String(nodeData.pattern ?? '')
            );
            updateNodeData(node.id, {
              isActive: false,
              isLoading: false,
              status: 'success',
              result: output,
              error: undefined,
            });
            setNodeResult(node.id, { output, status: 'success' });
          } else if (node.type === 'conditionNode') {
            const passed = evaluateCondition(
              input,
              String(nodeData.conditionType ?? 'contains'),
              String(nodeData.value ?? '')
            );
            output = input;
            const branch = passed ? 'true' : 'false';

            (outgoingBySource.get(node.id) || []).forEach((edge) => {
              const shouldUse = !edge.sourceHandle || edge.sourceHandle === branch;
              if (!shouldUse) blockedEdges.add(edge.id);
            });

            updateNodeData(node.id, {
              isActive: false,
              isLoading: false,
              status: 'success',
              result: passed ? 'True' : 'False',
              error: undefined,
            });
            setNodeResult(node.id, { output, branch, status: 'success' });
          } else if (node.type === 'outputNode') {
            output = input;
            updateNodeData(node.id, {
              isActive: false,
              isLoading: false,
              status: 'success',
              result: output,
              error: undefined,
            });
            setNodeResult(node.id, { output, status: 'success' });
          }

          nodeOutputs.set(node.id, output);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          updateNodeData(node.id, {
            isActive: false,
            isLoading: false,
            status: 'error',
            error: message,
          });
          setNodeResult(node.id, { status: 'error', error: message });
        }

        unresolved.delete(node.id);
      }

      if (!progressed) {
        for (const nodeId of unresolved) {
          const message = 'Unable to resolve node order. Check for circular dependencies.';
          updateNodeData(nodeId, {
            isActive: false,
            isLoading: false,
            status: 'error',
            error: message,
          });
          setNodeResult(nodeId, { status: 'error', error: message });
        }
        break;
      }
    }

    setIsRunning(false);
    addToast({
      type: 'success',
      title: 'Workflow run completed',
    });
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    clearNodeResults();
    setCurrentWorkflow(null);
    setWorkflowName('My Workflow');
    addToast({
      type: 'info',
      title: 'Canvas cleared',
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSaveWorkflow();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        void executeWorkflow();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [executeWorkflow, handleSaveWorkflow]);

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="w-full lg:w-72 bg-slate-900/50 border-r border-b lg:border-b-0 border-slate-800 p-3 flex flex-col max-h-[38vh] lg:max-h-none">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Nodes</h3>
          {nodeTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <div
                key={template.type}
                draggable
                onDragStart={(e) => onDragStart(e, template.type)}
                className={`flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 cursor-grab transition-all duration-200 ${template.hoverClass}`}
              >
                <Icon className={`w-4 h-4 ${template.iconClass}`} />
                <span className="text-sm text-slate-300">{template.label}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-slate-800 pt-3 flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Saved Workflows</h3>
          {workflows.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No workflows saved yet.</p>
          ) : (
            <div className="space-y-2">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className={`rounded-lg border p-2 ${
                    currentWorkflow?.id === workflow.id
                      ? 'bg-emerald-600/20 border-emerald-500/40'
                      : 'bg-slate-800/40 border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => handleLoadWorkflow(workflow)}
                    className="w-full text-left text-sm text-slate-200 hover:text-white"
                  >
                    {workflow.name}
                  </button>
                  <p className="text-[11px] text-slate-500 mb-2">
                    {new Date(workflow.timestamp).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleLoadWorkflow(workflow)}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/60"
                      title="Load"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicateWorkflow(workflow)}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/60"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleExportWorkflow(workflow)}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/60"
                      title="Export JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700/60 ml-auto"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="min-h-14 bg-slate-900/50 border-b border-slate-800 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 px-3 md:px-4 py-2">
          <div className="flex items-center gap-3">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-56 py-1.5 text-sm"
              placeholder="Workflow name"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearCanvas}>
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSaveWorkflow}>
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExportWorkflow()}>
              <Download className="w-4 h-4" />
              Export JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={handleShareWorkflow}>
              {shareCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {shareCopied ? 'Link Copied' : 'Share Link'}
            </Button>
            <Button size="sm" onClick={executeWorkflow} disabled={isRunning}>
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Running...' : 'Run Workflow'}
            </Button>
          </div>
        </div>

        {importError && (
          <div className="px-4 py-2 text-sm text-red-400 bg-red-900/20 border-b border-red-700/40">
            {importError}
          </div>
        )}

        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            className="bg-slate-950"
          >
            <Controls className="!bg-slate-800 !border-slate-700 !rounded-lg" />
            <Background color="#334155" gap={20} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
}

