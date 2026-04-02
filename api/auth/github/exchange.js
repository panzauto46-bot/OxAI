const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const clientId = (process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GITHUB_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    res.status(500).json({
      error: 'GitHub OAuth env vars are missing. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.',
    });
    return;
  }

  const body = parseBody(req.body);
  const code = typeof body.code === 'string' ? body.code : '';
  const redirectUri = typeof body.redirectUri === 'string' ? body.redirectUri : '';

  if (!code) {
    res.status(400).json({ error: 'Missing OAuth code.' });
    return;
  }

  try {
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'OxAI',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri || undefined,
      }),
    });

    const tokenPayload = await tokenResponse.json();
    const accessToken = tokenPayload.access_token;

    if (!tokenResponse.ok || !accessToken) {
      res.status(401).json({
        error: tokenPayload.error_description || tokenPayload.error || 'Failed to exchange OAuth code.',
      });
      return;
    }

    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'OxAI',
      },
    });

    if (!userResponse.ok) {
      res.status(401).json({ error: 'Failed to fetch GitHub user profile.' });
      return;
    }

    const user = await userResponse.json();
    let email = null;

    const emailsResponse = await fetch(GITHUB_EMAILS_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'OxAI',
      },
    });

    if (emailsResponse.ok) {
      const emails = await emailsResponse.json();
      if (Array.isArray(emails)) {
        const primary = emails.find((entry) => entry && entry.primary) || emails[0];
        email = primary?.email || null;
      }
    }

    res.status(200).json({
      user: {
        id: user.id,
        login: user.login,
        name: user.name || null,
        avatarUrl: user.avatar_url,
        profileUrl: user.html_url,
        email,
      },
    });
  } catch {
    res.status(500).json({ error: 'Unexpected server error during GitHub OAuth.' });
  }
}
