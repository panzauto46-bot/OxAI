// Oxlo.ai API Service
const OXLO_PROXY_URL = '/api/oxlo/chat';
const OXLO_MODELS_PROXY_URL = '/api/oxlo/models';
const DEFAULT_TIMEOUT_MS = 45000;
const MODELS_CACHE_TTL_MS = 5 * 60 * 1000;

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

interface OxloModelItem {
  id?: string;
  name?: string;
  display_name?: string;
  category?: string;
  status?: string;
  coming_soon?: boolean;
}

interface OxloModelsPayload {
  data?: OxloModelItem[];
}

let modelsCache: {
  apiKeyHash: string;
  models: ModelOption[];
  expiresAt: number;
} | null = null;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelResponse {
  model: string;
  content: string;
  tokens: number;
  latency: number;
  error?: string;
  errorType?: 'invalid_api_key' | 'rate_limit' | 'timeout' | 'network' | 'api' | 'unknown';
  statusCode?: number;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'deepseek-r1-70b', name: 'DeepSeek R1 70B', provider: 'DeepSeek' },
  { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek' },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'Meta' },
  { id: 'qwen-3-32b', name: 'Qwen 3 32B', provider: 'Alibaba' },
  { id: 'gpt-oss-120b', name: 'GPT-OSS 120B', provider: 'OpenAI/OSS' },
  { id: 'gpt-oss-20b', name: 'GPT-OSS 20B', provider: 'OpenAI/OSS' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
];

export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0]?.id || 'deepseek-r1-70b';

function inferProviderFromModelId(id: string): string {
  const normalized = id.toLowerCase();

  if (normalized.includes('claude')) return 'Anthropic';
  if (normalized.includes('gemini') || normalized.includes('gemma')) return 'Google';
  if (normalized.includes('deepseek')) return 'DeepSeek';
  if (normalized.includes('qwen')) return 'Alibaba';
  if (normalized.includes('llama')) return 'Meta';
  if (normalized.includes('mistral')) return 'Mistral';
  if (normalized.includes('gpt') || normalized.includes('o1') || normalized.includes('o3') || normalized.includes('o4')) {
    return 'OpenAI/OSS';
  }
  if (normalized.includes('glm')) return 'Zhipu';
  if (normalized.includes('minimax')) return 'MiniMax';
  return 'Other';
}

function prettifyModelName(id: string): string {
  return id
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function toModelOption(item: OxloModelItem): ModelOption | null {
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  if (!id) return null;

  const displayName =
    (typeof item.display_name === 'string' && item.display_name.trim()) ||
    (typeof item.name === 'string' && item.name.trim()) ||
    prettifyModelName(id);

  return {
    id,
    name: displayName,
    provider: inferProviderFromModelId(id),
  };
}

function uniqueModelsById(models: ModelOption[]): ModelOption[] {
  const map = new Map<string, ModelOption>();
  for (const model of models) {
    if (!map.has(model.id)) {
      map.set(model.id, model);
    }
  }
  return [...map.values()];
}

function isValidChatModel(item: OxloModelItem): boolean {
  if (!item || typeof item !== 'object') return false;
  if (item.coming_soon === true) return false;
  if (typeof item.status === 'string' && item.status.toLowerCase() !== 'ready') return false;
  if (typeof item.category === 'string' && item.category.toLowerCase() !== 'chat') return false;
  return true;
}

function mapHttpError(status: number, apiMessage: string): {
  message: string;
  errorType: ModelResponse['errorType'];
} {
  if (status === 401 || status === 403) {
    return {
      message: 'Invalid API key. Please verify your Oxlo.ai API key and try again.',
      errorType: 'invalid_api_key',
    };
  }
  if (status === 429) {
    return {
      message: 'Rate limit reached. Please wait a moment before retrying.',
      errorType: 'rate_limit',
    };
  }
  if (status === 408 || status === 504) {
    return {
      message: 'The request timed out. Try again with a shorter prompt or lower load.',
      errorType: 'timeout',
    };
  }
  return {
    message: apiMessage || `API Error: ${status}`,
    errorType: 'api',
  };
}

async function parseErrorMessage(response: Response): Promise<string> {
  const fallback = `API Error: ${response.status}`;
  try {
    const raw = await response.text();
    if (!raw) return fallback;

    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      return raw || fallback;
    }

    return (
      data?.error?.message ||
      data?.message ||
      data?.error ||
      fallback
    );
  } catch {
    try {
      const text = await response.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
}

function normalizeApiKey(apiKey: string): string {
  return apiKey.replace(/\s+/g, '').trim();
}

function buildApiKeyHash(apiKey: string): string {
  if (!apiKey) return 'anonymous';
  return `${apiKey.length}:${apiKey.slice(0, 4)}:${apiKey.slice(-4)}`;
}

export async function fetchAvailableModels(apiKey: string): Promise<ModelOption[]> {
  const normalizedApiKey = normalizeApiKey(apiKey);
  const apiKeyHash = buildApiKeyHash(normalizedApiKey);
  const now = Date.now();

  if (modelsCache && modelsCache.apiKeyHash === apiKeyHash && modelsCache.expiresAt > now) {
    return modelsCache.models;
  }

  const response = await fetch(OXLO_MODELS_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey: normalizedApiKey,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const payload = (await response.json()) as OxloModelsPayload;
  const sourceModels = Array.isArray(payload?.data) ? payload.data : [];

  const remoteModels = uniqueModelsById(
    sourceModels
      .filter(isValidChatModel)
      .map(toModelOption)
      .filter((model): model is ModelOption => Boolean(model))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const resolvedModels = remoteModels.length > 0 ? remoteModels : AVAILABLE_MODELS;

  modelsCache = {
    apiKeyHash,
    models: resolvedModels,
    expiresAt: now + MODELS_CACHE_TTL_MS,
  };

  return resolvedModels;
}

function mapUnknownError(error: unknown): {
  message: string;
  errorType: ModelResponse['errorType'];
} {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      message: 'Request timeout. Please try again.',
      errorType: 'timeout',
    };
  }
  if (error instanceof TypeError) {
    return {
      message: 'Network error. Please check your internet connection.',
      errorType: 'network',
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown error',
      errorType: 'unknown',
    };
  }
  return {
    message: 'Unknown error',
    errorType: 'unknown',
  };
}

export async function callOxloAPI(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number = 0.7,
  maxTokens: number = 2000,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ModelResponse> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const normalizedApiKey = normalizeApiKey(apiKey);
  
  try {
    const response = await fetch(OXLO_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: normalizedApiKey,
        model,
        messages,
        temperature,
        maxTokens,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const latency = Date.now() - startTime;
      const apiMessage = await parseErrorMessage(response);
      const normalized = mapHttpError(response.status, apiMessage);
      return {
        model,
        content: '',
        tokens: 0,
        latency,
        error: normalized.message,
        errorType: normalized.errorType,
        statusCode: response.status,
      };
    }

    const data = await response.json();
    const latency = Date.now() - startTime;

    return {
      model,
      content: data.choices?.[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0,
      latency,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    const normalized = mapUnknownError(error);
    return {
      model,
      content: '',
      tokens: 0,
      latency,
      error: normalized.message,
      errorType: normalized.errorType,
    };
  }
}

export async function compareModels(
  apiKey: string,
  models: string[],
  messages: ChatMessage[],
  temperature: number = 0.7
): Promise<ModelResponse[]> {
  const uniqueModels = [...new Set(models)].slice(0, 3);
  const promises = uniqueModels.map((model) => callOxloAPI(apiKey, model, messages, temperature));
  return Promise.all(promises);
}

// Helper to replace {{variables}} in prompt
export function replaceVariables(prompt: string, variables: Record<string, string>): string {
  return prompt.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] || match;
  });
}

// Extract variable names from prompt
export function extractVariables(prompt: string): string[] {
  const matches = prompt.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}
