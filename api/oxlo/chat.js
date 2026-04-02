const OXLO_CHAT_COMPLETIONS_URL = 'https://api.oxlo.ai/v1/chat/completions';

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function normalizeTemperature(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.7;
  return Math.max(0, Math.min(1, value));
}

function normalizeMaxTokens(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 2000;
  return Math.max(1, Math.floor(value));
}

function normalizeApiKey(value) {
  if (typeof value !== 'string') return '';
  // Remove hidden whitespace/newlines that can break Authorization header parsing.
  return value.replace(/\s+/g, '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed.' } });
    return;
  }

  const body = parseBody(req.body);
  const apiKey = normalizeApiKey(body.apiKey);
  const model = typeof body.model === 'string' ? body.model.trim() : '';
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const temperature = normalizeTemperature(body.temperature);
  const maxTokens = normalizeMaxTokens(body.maxTokens);

  if (!apiKey) {
    res.status(400).json({ error: { message: 'Missing apiKey.' } });
    return;
  }

  if (!model) {
    res.status(400).json({ error: { message: 'Missing model.' } });
    return;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: { message: 'Missing messages.' } });
    return;
  }

  try {
    const upstreamResponse = await fetch(OXLO_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    const responseText = await upstreamResponse.text();
    let payload;

    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = {
        error: {
          message: responseText || `Oxlo API Error: ${upstreamResponse.status}`,
        },
      };
    }

    res.status(upstreamResponse.status).json(payload);
  } catch {
    res.status(502).json({
      error: {
        message: 'Failed to reach Oxlo.ai API. Please try again.',
      },
    });
  }
}
