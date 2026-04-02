const OAUTH_STATE_KEY = 'oxai-github-oauth-state';

interface OAuthParams {
  code: string | null;
  state: string | null;
  error: string | null;
  errorDescription: string | null;
}

function toBase64Url(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function getGitHubClientId(): string {
  return (import.meta.env.VITE_GITHUB_CLIENT_ID || '').trim();
}

export function getGitHubRedirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

export function canStartGitHubLogin(): boolean {
  return Boolean(getGitHubClientId());
}

export function createOAuthState(): string {
  const values = new Uint8Array(24);
  crypto.getRandomValues(values);
  return toBase64Url(values.buffer);
}

export async function beginGitHubLogin(): Promise<void> {
  const clientId = getGitHubClientId();
  if (!clientId) {
    throw new Error('Missing VITE_GITHUB_CLIENT_ID in environment.');
  }

  const state = createOAuthState();
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGitHubRedirectUri(),
    scope: 'read:user user:email',
    state,
  });

  window.location.assign(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

export function readOAuthParamsFromUrl(): OAuthParams | null {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (!code && !error) return null;

  url.search = '';
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);

  return { code, state, error, errorDescription };
}

export function consumeAndValidateOAuthState(receivedState: string | null): boolean {
  const storedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  if (!storedState || !receivedState) return false;
  return storedState === receivedState;
}
