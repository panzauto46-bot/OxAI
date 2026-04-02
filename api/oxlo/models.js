import { detectProviderAndModels, normalizeRequestBody } from './providerRouter.js';

function normalizeApiKey(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed.' } });
    return;
  }

  const body = normalizeRequestBody(req.body);
  const headers = req.headers && typeof req.headers === 'object' ? req.headers : {};
  const apiKeyFromBody = normalizeApiKey(body.apiKey);
  const apiKeyFromHeader = normalizeApiKey(headers['x-oxlo-api-key']);
  const apiKey = apiKeyFromBody || apiKeyFromHeader;
  const providerHint = typeof body.providerHint === 'string' ? body.providerHint.trim().toLowerCase() : '';

  const detection = await detectProviderAndModels(apiKey, providerHint);
  if (!detection.ok) {
    res.status(detection.status || 401).json({
      error: {
        message: detection.errorMessage || 'Invalid or unsupported API key.',
      },
    });
    return;
  }

  res.status(200).json({
    provider_id: detection.providerId,
    provider_name: detection.providerName,
    data: detection.models,
  });
}
