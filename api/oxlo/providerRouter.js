const PROVIDER_CACHE_TTL_MS = 10 * 60 * 1000;

const PROVIDERS = {
  oxlo: {
    id: 'oxlo',
    name: 'Oxlo.ai',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
  },
  qwen: {
    id: 'qwen',
    name: 'Qwen',
  },
};

const providerCache = new Map();

function hashApiKey(apiKey) {
  if (!apiKey) return 'anonymous';
  return `${apiKey.length}:${apiKey.slice(0, 4)}:${apiKey.slice(-4)}`;
}

function parseJsonSafely(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function requestJson(url, options) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    const data = parseJsonSafely(text);
    return {
      ok: response.ok,
      status: response.status,
      data,
      text,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      text: '',
      error: error instanceof Error ? error.message : 'Network request failed',
    };
  }
}

function extractErrorMessage(result, fallbackMessage) {
  if (!result) return fallbackMessage;
  const data = result.data;
  if (data?.error?.message) return data.error.message;
  if (typeof data?.error === 'string') return data.error;
  if (data?.message) return data.message;
  if (result.text) return result.text;
  if (result.error) return result.error;
  return fallbackMessage;
}

function prettifyModelName(id) {
  if (!id || typeof id !== 'string') return '';
  return id
    .replace(/^models\//, '')
    .split(/[-_.]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function normalizeModelItem({ id, name, providerId, providerName }) {
  if (!id || typeof id !== 'string') return null;
  const cleanedId = id.trim();
  if (!cleanedId) return null;

  return {
    id: cleanedId,
    name: (typeof name === 'string' && name.trim()) || prettifyModelName(cleanedId) || cleanedId,
    provider: providerName,
    provider_id: providerId,
    category: 'chat',
    status: 'ready',
  };
}

function uniqueModelsById(models) {
  const seen = new Set();
  const deduped = [];

  for (const model of models) {
    if (!model || !model.id || seen.has(model.id)) continue;
    seen.add(model.id);
    deduped.push(model);
  }

  return deduped.sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeApiKey(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, '').trim();
}

function normalizeTemperature(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.7;
  return Math.max(0, Math.min(1, value));
}

function normalizeMaxTokens(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 2000;
  return Math.max(1, Math.floor(value));
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((message) => ({
      role: message?.role,
      content: typeof message?.content === 'string' ? message.content : '',
    }))
    .filter((message) =>
      (message.role === 'system' || message.role === 'user' || message.role === 'assistant') &&
      message.content.trim().length > 0
    );
}

function isOpenAIChatModelId(id) {
  const normalized = id.toLowerCase();
  return (
    normalized.startsWith('gpt-') ||
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4') ||
    normalized.startsWith('chatgpt')
  );
}

function isDeepSeekModelId(id) {
  return id.toLowerCase().includes('deepseek');
}

function isQwenModelId(id) {
  const normalized = id.toLowerCase();
  return normalized.includes('qwen') || normalized.includes('qwq');
}

function extractTextFromOpenAIMessageContent(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part.text === 'string') return part.text;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function normalizeOpenAICompatibleChatResponse(providerMeta, model, payload) {
  const firstChoice = payload?.choices?.[0];
  const content =
    extractTextFromOpenAIMessageContent(firstChoice?.message?.content) ||
    extractTextFromOpenAIMessageContent(firstChoice?.text) ||
    '';

  const inputTokens = Number(payload?.usage?.prompt_tokens || payload?.usage?.input_tokens || 0);
  const outputTokens = Number(payload?.usage?.completion_tokens || payload?.usage?.output_tokens || 0);
  const totalTokens = Number(payload?.usage?.total_tokens || inputTokens + outputTokens);

  return {
    id: payload?.id || `${providerMeta.id}-chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    model: payload?.model || model,
    provider: providerMeta.name,
    provider_id: providerMeta.id,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: firstChoice?.finish_reason || 'stop',
      },
    ],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: totalTokens,
    },
  };
}

function normalizeAnthropicChatResponse(model, payload) {
  const providerMeta = PROVIDERS.anthropic;
  const content = Array.isArray(payload?.content)
    ? payload.content
        .map((part) => (part && part.type === 'text' && typeof part.text === 'string' ? part.text : ''))
        .filter(Boolean)
        .join('\n')
    : '';

  const inputTokens = Number(payload?.usage?.input_tokens || 0);
  const outputTokens = Number(payload?.usage?.output_tokens || 0);
  const totalTokens = inputTokens + outputTokens;

  return {
    id: payload?.id || `${providerMeta.id}-chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    model,
    provider: providerMeta.name,
    provider_id: providerMeta.id,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: payload?.stop_reason || 'stop',
      },
    ],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: totalTokens,
    },
  };
}

function normalizeGeminiChatResponse(model, payload) {
  const providerMeta = PROVIDERS.gemini;
  const candidate = payload?.candidates?.[0];
  const content = Array.isArray(candidate?.content?.parts)
    ? candidate.content.parts
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .filter(Boolean)
        .join('\n')
    : '';

  const promptTokens = Number(payload?.usageMetadata?.promptTokenCount || 0);
  const completionTokens = Number(payload?.usageMetadata?.candidatesTokenCount || 0);
  const totalTokens = Number(payload?.usageMetadata?.totalTokenCount || promptTokens + completionTokens);

  return {
    id: `${providerMeta.id}-chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    model,
    provider: providerMeta.name,
    provider_id: providerMeta.id,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: candidate?.finishReason || 'stop',
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
    },
  };
}

async function listOxloModels(apiKey) {
  const providerMeta = PROVIDERS.oxlo;
  const result = await requestJson('https://api.oxlo.ai/v1/models', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!result.ok) return { ...result, providerMeta, models: [] };

  const source = Array.isArray(result?.data?.data) ? result.data.data : [];
  const models = uniqueModelsById(
    source
      .filter((item) => item && item.category === 'chat' && item.coming_soon !== true && String(item.status || '').toLowerCase() === 'ready')
      .map((item) =>
        normalizeModelItem({
          id: item.id,
          name: item.display_name || item.name,
          providerId: providerMeta.id,
          providerName: providerMeta.name,
        })
      )
      .filter(Boolean)
  );

  return { ...result, providerMeta, models };
}

async function listOpenAIModels(apiKey) {
  const providerMeta = PROVIDERS.openai;
  const result = await requestJson('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!result.ok) return { ...result, providerMeta, models: [] };

  const source = Array.isArray(result?.data?.data) ? result.data.data : [];
  const models = uniqueModelsById(
    source
      .filter((item) => item && typeof item.id === 'string' && isOpenAIChatModelId(item.id))
      .map((item) =>
        normalizeModelItem({
          id: item.id,
          name: item.id,
          providerId: providerMeta.id,
          providerName: providerMeta.name,
        })
      )
      .filter(Boolean)
  );

  return { ...result, providerMeta, models };
}

async function listAnthropicModels(apiKey) {
  const providerMeta = PROVIDERS.anthropic;
  const result = await requestJson('https://api.anthropic.com/v1/models', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });

  if (!result.ok) return { ...result, providerMeta, models: [] };

  const source = Array.isArray(result?.data?.data) ? result.data.data : [];
  const models = uniqueModelsById(
    source
      .filter((item) => item && typeof item.id === 'string')
      .map((item) =>
        normalizeModelItem({
          id: item.id,
          name: item.display_name || item.id,
          providerId: providerMeta.id,
          providerName: providerMeta.name,
        })
      )
      .filter(Boolean)
  );

  return { ...result, providerMeta, models };
}

async function listGeminiModels(apiKey) {
  const providerMeta = PROVIDERS.gemini;
  const result = await requestJson(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!result.ok) return { ...result, providerMeta, models: [] };

  const source = Array.isArray(result?.data?.models) ? result.data.models : [];
  const models = uniqueModelsById(
    source
      .filter((item) => {
        const methods = Array.isArray(item?.supportedGenerationMethods) ? item.supportedGenerationMethods : [];
        return methods.includes('generateContent') && typeof item.name === 'string';
      })
      .map((item) => {
        const rawId = String(item.name || '').replace(/^models\//, '');
        return normalizeModelItem({
          id: rawId,
          name: item.displayName || rawId,
          providerId: providerMeta.id,
          providerName: providerMeta.name,
        });
      })
      .filter(Boolean)
  );

  return { ...result, providerMeta, models };
}

async function listDeepSeekModels(apiKey) {
  const providerMeta = PROVIDERS.deepseek;
  const result = await requestJson('https://api.deepseek.com/v1/models', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!result.ok) return { ...result, providerMeta, models: [] };

  const source = Array.isArray(result?.data?.data) ? result.data.data : [];
  const models = uniqueModelsById(
    source
      .filter((item) => item && typeof item.id === 'string' && isDeepSeekModelId(item.id))
      .map((item) =>
        normalizeModelItem({
          id: item.id,
          name: item.id,
          providerId: providerMeta.id,
          providerName: providerMeta.name,
        })
      )
      .filter(Boolean)
  );

  return { ...result, providerMeta, models };
}

async function listQwenModels(apiKey) {
  const providerMeta = PROVIDERS.qwen;
  const endpoints = [
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models',
    'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
  ];

  let lastResult = null;
  for (const endpoint of endpoints) {
    const result = await requestJson(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    lastResult = result;
    if (!result.ok) continue;

    const source = Array.isArray(result?.data?.data) ? result.data.data : [];
    const models = uniqueModelsById(
      source
        .filter((item) => item && typeof item.id === 'string' && isQwenModelId(item.id))
        .map((item) =>
          normalizeModelItem({
            id: item.id,
            name: item.id,
            providerId: providerMeta.id,
            providerName: providerMeta.name,
          })
        )
        .filter(Boolean)
    );

    return { ...result, providerMeta, models };
  }

  return { ...(lastResult || { ok: false, status: 0, data: null, text: '', error: 'Unable to reach Qwen endpoints.' }), providerMeta, models: [] };
}

export async function listModelsByProvider(providerId, apiKey) {
  switch (providerId) {
    case 'oxlo':
      return listOxloModels(apiKey);
    case 'openai':
      return listOpenAIModels(apiKey);
    case 'anthropic':
      return listAnthropicModels(apiKey);
    case 'gemini':
      return listGeminiModels(apiKey);
    case 'deepseek':
      return listDeepSeekModels(apiKey);
    case 'qwen':
      return listQwenModels(apiKey);
    default:
      return {
        ok: false,
        status: 400,
        data: null,
        text: '',
        error: `Unsupported provider: ${providerId}`,
        providerMeta: null,
        models: [],
      };
  }
}

function buildDetectionCandidates(apiKey, providerHint) {
  const preferred = [];
  if (providerHint && PROVIDERS[providerHint]) preferred.push(providerHint);

  const normalized = apiKey.toLowerCase();
  let inferred = [];

  if (normalized.startsWith('sk-ant-')) {
    inferred = ['anthropic', 'openai', 'deepseek', 'qwen', 'gemini'];
  } else if (apiKey.startsWith('AIza')) {
    inferred = ['gemini', 'openai', 'anthropic', 'deepseek', 'qwen'];
  } else if (normalized.startsWith('sk_')) {
    inferred = ['oxlo', 'openai', 'deepseek', 'qwen', 'anthropic', 'gemini'];
  } else if (normalized.startsWith('sk-proj-')) {
    inferred = ['openai', 'deepseek', 'qwen', 'anthropic', 'gemini'];
  } else if (normalized.startsWith('sk-')) {
    inferred = ['openai', 'deepseek', 'qwen', 'anthropic', 'gemini'];
  } else {
    inferred = ['openai', 'anthropic', 'gemini', 'deepseek', 'qwen'];
  }

  return [...new Set([...preferred, ...inferred])];
}

export async function detectProviderAndModels(apiKey, providerHint = '') {
  const normalizedApiKey = normalizeApiKey(apiKey);
  if (!normalizedApiKey) {
    return {
      ok: false,
      status: 400,
      errorMessage: 'Missing apiKey.',
      providerId: null,
      providerName: null,
      models: [],
    };
  }

  const keyHash = hashApiKey(normalizedApiKey);
  const now = Date.now();
  const cached = providerCache.get(keyHash);

  if (!providerHint && cached && cached.expiresAt > now) {
    const cachedResult = await listModelsByProvider(cached.providerId, normalizedApiKey);
    if (cachedResult.ok && cachedResult.models.length > 0) {
      return {
        ok: true,
        status: 200,
        providerId: cached.providerId,
        providerName: cachedResult.providerMeta?.name || cached.providerName,
        models: cachedResult.models,
        errorMessage: '',
      };
    }
  }

  const candidates = buildDetectionCandidates(normalizedApiKey, providerHint);
  let lastError = 'Invalid or unsupported API key.';

  for (const candidate of candidates) {
    const result = await listModelsByProvider(candidate, normalizedApiKey);

    if (result.ok) {
      providerCache.set(keyHash, {
        providerId: candidate,
        providerName: result.providerMeta?.name || candidate,
        expiresAt: now + PROVIDER_CACHE_TTL_MS,
      });

      return {
        ok: true,
        status: 200,
        providerId: candidate,
        providerName: result.providerMeta?.name || candidate,
        models: result.models,
        errorMessage: '',
      };
    }

    if (result.status !== 401 && result.status !== 403) {
      lastError = extractErrorMessage(result, lastError);
    }
  }

  return {
    ok: false,
    status: 401,
    providerId: null,
    providerName: null,
    models: [],
    errorMessage: lastError,
  };
}

async function callOpenAICompatibleChat(baseUrl, providerMeta, apiKey, body) {
  const result = await requestJson(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: body.maxTokens,
    }),
  });

  if (!result.ok) {
    return {
      ok: false,
      status: result.status || 502,
      payload: {
        error: {
          message: extractErrorMessage(result, `${providerMeta.name} API request failed.`),
        },
      },
    };
  }

  return {
    ok: true,
    status: 200,
    payload: normalizeOpenAICompatibleChatResponse(providerMeta, body.model, result.data || {}),
  };
}

function toAnthropicRequestPayload(body) {
  const systemMessages = [];
  const conversation = [];

  for (const message of body.messages) {
    if (message.role === 'system') {
      systemMessages.push(message.content);
      continue;
    }

    if (message.role === 'user' || message.role === 'assistant') {
      conversation.push({
        role: message.role,
        content: message.content,
      });
    }
  }

  if (conversation.length === 0) {
    conversation.push({
      role: 'user',
      content: '',
    });
  }

  const payload = {
    model: body.model,
    max_tokens: body.maxTokens,
    temperature: body.temperature,
    messages: conversation,
  };

  if (systemMessages.length > 0) {
    payload.system = systemMessages.join('\n\n');
  }

  return payload;
}

async function callAnthropicChat(apiKey, body) {
  const result = await requestJson('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(toAnthropicRequestPayload(body)),
  });

  if (!result.ok) {
    return {
      ok: false,
      status: result.status || 502,
      payload: {
        error: {
          message: extractErrorMessage(result, 'Anthropic API request failed.'),
        },
      },
    };
  }

  return {
    ok: true,
    status: 200,
    payload: normalizeAnthropicChatResponse(body.model, result.data || {}),
  };
}

function toGeminiRequestPayload(body) {
  const systemParts = [];
  const contents = [];

  for (const message of body.messages) {
    if (message.role === 'system') {
      systemParts.push(message.content);
      continue;
    }

    if (message.role === 'user' || message.role === 'assistant') {
      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      });
    }
  }

  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: '' }],
    });
  }

  const payload = {
    contents,
    generationConfig: {
      temperature: body.temperature,
      maxOutputTokens: body.maxTokens,
    },
  };

  if (systemParts.length > 0) {
    payload.systemInstruction = {
      parts: [{ text: systemParts.join('\n\n') }],
    };
  }

  return payload;
}

async function callGeminiChat(apiKey, body) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(body.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const result = await requestJson(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toGeminiRequestPayload(body)),
  });

  if (!result.ok) {
    return {
      ok: false,
      status: result.status || 502,
      payload: {
        error: {
          message: extractErrorMessage(result, 'Gemini API request failed.'),
        },
      },
    };
  }

  return {
    ok: true,
    status: 200,
    payload: normalizeGeminiChatResponse(body.model, result.data || {}),
  };
}

async function callQwenChat(apiKey, body) {
  const providerMeta = PROVIDERS.qwen;
  const endpoints = [
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
  ];

  let lastFailure = null;
  for (const endpoint of endpoints) {
    const result = await callOpenAICompatibleChat(endpoint, providerMeta, apiKey, body);
    if (result.ok) return result;
    lastFailure = result;

    if (result.status !== 404 && result.status !== 405) {
      break;
    }
  }

  return (
    lastFailure || {
      ok: false,
      status: 502,
      payload: {
        error: {
          message: 'Qwen API request failed.',
        },
      },
    }
  );
}

export async function callChatByProvider(providerId, apiKey, payload) {
  const normalizedApiKey = normalizeApiKey(apiKey);
  const model = typeof payload?.model === 'string' ? payload.model.trim() : '';
  const messages = normalizeMessages(payload?.messages);
  const temperature = normalizeTemperature(payload?.temperature);
  const maxTokens = normalizeMaxTokens(payload?.maxTokens);

  if (!normalizedApiKey) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: { message: 'Missing apiKey.' },
      },
    };
  }

  if (!model) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: { message: 'Missing model.' },
      },
    };
  }

  if (messages.length === 0) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: { message: 'Missing messages.' },
      },
    };
  }

  const body = {
    model,
    messages,
    temperature,
    maxTokens,
  };

  switch (providerId) {
    case 'oxlo':
      return callOpenAICompatibleChat('https://api.oxlo.ai/v1', PROVIDERS.oxlo, normalizedApiKey, body);
    case 'openai':
      return callOpenAICompatibleChat('https://api.openai.com/v1', PROVIDERS.openai, normalizedApiKey, body);
    case 'deepseek':
      return callOpenAICompatibleChat('https://api.deepseek.com/v1', PROVIDERS.deepseek, normalizedApiKey, body);
    case 'qwen':
      return callQwenChat(normalizedApiKey, body);
    case 'anthropic':
      return callAnthropicChat(normalizedApiKey, body);
    case 'gemini':
      return callGeminiChat(normalizedApiKey, body);
    default:
      return {
        ok: false,
        status: 400,
        payload: {
          error: {
            message: `Unsupported provider: ${providerId}`,
          },
        },
      };
  }
}

export function normalizeRequestBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    const parsed = parseJsonSafely(body);
    return parsed && typeof parsed === 'object' ? parsed : {};
  }
  if (typeof body === 'object') return body;
  return {};
}
