// HTTP and access helpers for the metrics function: CORS, JSON responses, the admin
// allowlist and partner share-token matching. Mirrors intake/http.ts on CORS.

const DEFAULT_ORIGINS = [
  'https://talewatersandtides.com',
  'https://www.talewatersandtides.com',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

// Same two addresses as public.is_facilitator(); override with METRICS_ADMIN_EMAILS.
const DEFAULT_ADMINS = ['cboelkens@gmail.com', 'corey@talewatersandtides.com'];

export function allowedOrigins(): string[] {
  const env = Deno.env.get('ALLOWED_ORIGINS');
  return env ? env.split(',').map((o) => o.trim()).filter(Boolean) : DEFAULT_ORIGINS;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allow = allowedOrigins().includes(origin) ? origin : allowedOrigins()[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function originAllowed(req: Request): boolean {
  const origin = req.headers.get('origin');
  return !origin || allowedOrigins().includes(origin);
}

export function adminEmails(): string[] {
  const env = Deno.env.get('METRICS_ADMIN_EMAILS');
  const list = env ? env.split(',') : DEFAULT_ADMINS;
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Returns the partner label whose stored hash matches the token, or null.
 * PARTNER_TOKENS_SHA256: "acme:9f86d0...,river-co:2c26b4...". Tokens shorter than
 * 24 characters are refused outright so a guessable link can never be issued.
 */
export async function matchPartner(token: string): Promise<string | null> {
  if (token.length < 24 || token.length > 200) return null;
  const hash = await sha256Hex(token);
  const entries = (Deno.env.get('PARTNER_TOKENS_SHA256') ?? '')
    .split(',')
    .map((e) => e.trim().split(':'))
    .filter((p) => p.length === 2 && /^[0-9a-f]{64}$/.test(p[1]));
  let found: string | null = null;
  for (const [label, h] of entries) if (sameHex(hash, h)) found = label;
  return found;
}
