// HTTP and access helpers for the leads function: CORS, JSON responses and the admin
// allowlist. Same rules as metrics/http.ts; kept here so each function deploys alone.

const DEFAULT_ORIGINS = [
  'https://talewatersandtides.com',
  'https://www.talewatersandtides.com',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

// Same two addresses as public.is_facilitator(); override with LEADS_ADMIN_EMAILS.
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
  const env = Deno.env.get('LEADS_ADMIN_EMAILS') ?? Deno.env.get('METRICS_ADMIN_EMAILS');
  const list = env ? env.split(',') : DEFAULT_ADMINS;
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}
