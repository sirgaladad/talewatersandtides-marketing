// Google service-account access tokens (OAuth 2.0 JWT bearer flow), signed with
// WebCrypto so the function needs no Google SDK. The service account only needs
// Viewer on the GA4 property and Restricted access on the Search Console sites.
//
// Secret: GOOGLE_SERVICE_ACCOUNT_JSON, the key file Google issues, pasted whole.

import { NotConnected } from './shape.ts';

const cache = new Map<string, { token: string; exp: number }>();

function b64url(bytes: Uint8Array | string): string {
  const bin = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const bytes = new Uint8Array(new ArrayBuffer(atob(body).length));
  bytes.set(Array.from(atob(body), (c) => c.charCodeAt(0)));
  return bytes.buffer;
}

export async function googleToken(scopes: string[]): Promise<string> {
  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new NotConnected('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  const scope = scopes.join(' ');
  const hit = cache.get(scope);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;

  const sa = JSON.parse(raw) as { client_email: string; private_key: string; token_uri?: string };
  const aud = sa.token_uri ?? 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope, aud, iat: now, exp: now + 3600 }));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`))
  );
  const res = await fetch(aud, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${b64url(sig)}`,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error('google token exchange answered ' + res.status);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cache.set(scope, { token: j.access_token, exp: Date.now() + j.expires_in * 1000 });
  return j.access_token;
}
