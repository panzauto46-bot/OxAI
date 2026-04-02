import {
  callChatByProvider,
  detectProviderAndModels,
  normalizeRequestBody,
} from './providerRouter.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed.' } });
    return;
  }

  const body = normalizeRequestBody(req.body);
  const providerHint = typeof body.providerHint === 'string' ? body.providerHint.trim().toLowerCase() : '';
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey : '';

  if (providerHint) {
    const hintedResult = await callChatByProvider(providerHint, apiKey, {
      model: body.model,
      messages: body.messages,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
    });

    if (hintedResult.ok) {
      res.status(hintedResult.status || 200).json(hintedResult.payload);
      return;
    }

    // If provider hint fails due to auth/model mismatch, fall back to auto-detection.
    if (
      hintedResult.status !== 401 &&
      hintedResult.status !== 403 &&
      hintedResult.status !== 404 &&
      hintedResult.status !== 400
    ) {
      res.status(hintedResult.status || 500).json(hintedResult.payload);
      return;
    }
  }

  const detection = await detectProviderAndModels(apiKey, providerHint);
  if (!detection.ok || !detection.providerId) {
    res.status(detection.status || 401).json({
      error: {
        message: detection.errorMessage || 'Invalid or unsupported API key.',
      },
    });
    return;
  }

  const detectedResult = await callChatByProvider(detection.providerId, apiKey, {
    model: body.model,
    messages: body.messages,
    temperature: body.temperature,
    maxTokens: body.maxTokens,
  });

  res.status(detectedResult.status || 200).json(detectedResult.payload);
}
