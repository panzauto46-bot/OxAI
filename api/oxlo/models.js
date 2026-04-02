const OXLO_MODELS_URL = 'https://api.oxlo.ai/v1/models';

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

function normalizeApiKey(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed.' } });
    return;
  }

  const body = parseBody(req.body);
  const apiKeyFromBody = normalizeApiKey(body.apiKey);
  const apiKeyFromHeader = normalizeApiKey(req.headers['x-oxlo-api-key']);
  const apiKey = apiKeyFromBody || apiKeyFromHeader;

  try {
    const headers = {
      Accept: 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const upstreamResponse = await fetch(OXLO_MODELS_URL, {
      method: 'GET',
      headers,
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
        message: 'Failed to load Oxlo model catalog. Please try again.',
      },
    });
  }
}
