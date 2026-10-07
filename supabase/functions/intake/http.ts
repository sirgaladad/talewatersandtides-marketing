// Shared HTTP helpers for the intake function: CORS, JSON responses, client IP
// hashing, and a rate-limit check backed by public.intake_events.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.1';

const DEFAULT_ORIGINS = [
  'https://talewatersandtides.com',
  'https://www.talewatersandtides.com',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

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
  // Non-browser callers (curl, tests) send no Origin; the anon JWT still gates them.
  return !origin || allowedOrigins().includes(origin);
}

export async function ipHash(req: Request): Promise<string> {
  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    'unknown';
  const salt = Deno.env.get('IP_HASH_SALT') ?? 'twt-intake';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + ip));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

/**
 * Returns true when the caller is under both limits, and records the event.
 * perIp: max events per IP in the last hour. global: max events of this kind in the last day.
 */
export async function rateLimit(
  db: SupabaseClient,
  kind: 'scan' | 'lead',
  hash: string,
  perIp: number,
  global: number
): Promise<boolean> {
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const [mine, all] = await Promise.all([
    db.from('intake_events').select('id', { count: 'exact', head: true })
      .eq('kind', kind).eq('ip_hash', hash).gte('created_at', hourAgo),
    db.from('intake_events').select('id', { count: 'exact', head: true })
      .eq('kind', kind).gte('created_at', dayAgo),
  ]);
  if ((mine.count ?? 0) >= perIp || (all.count ?? 0) >= global) return false;
  await db.from('intake_events').insert({ kind, ip_hash: hash });
  // Opportunistic prune; failures are irrelevant to the caller.
  if (Math.random() < 0.05) {
    await db.from('intake_events').delete().lt('created_at', dayAgo);
  }
  return true;
}

export function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

export function strList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .slice(0, maxItems)
    .map((x) => x.trim().slice(0, maxLen));
}
