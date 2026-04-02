// Oxlo.ai API Service
const OXLO_PROXY_URL = '/api/oxlo/chat';
const DEFAULT_TIMEOUT_MS = 45000;

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

export const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'Meta' },
];

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
