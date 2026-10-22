// Collectors: one per data source. Each returns its slice of Raw, or throws
// NotConnected when its secrets are absent, so a missing source blanks one panel
// instead of failing the dashboard. Nothing here returns a row about a person;
// lead rows are reduced to date, form, status, page and source before they leave.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.1';
import type { LeadRow, PfgApp, Raw, SearchWeek, WebWeek } from './build.ts';
import { type Named, NotConnected } from './shape.ts';
import { googleToken } from './google.ts';

export { NotConnected };

const TIMEOUT_MS = 8_000;

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new NotConnected(name + ' not set');
  return v;
}

async function getJson(url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`);
  return await res.json();
}

/** Tale Waters and Tides leads from the intake table (service role, same project). */
export async function twtLeads(db: SupabaseClient): Promise<Pick<Raw, 'leads'>> {
  const { data, error } = await db
    .from('leads')
    .select('created_at, source, status, page, utm')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw new Error('leads query failed: ' + error.message);
  const leads: LeadRow[] = (data ?? []).map((r: Record<string, unknown>) => {
    const utm = (r.utm ?? {}) as Record<string, unknown>;
    const src = typeof utm.utm_source === 'string' ? utm.utm_source : typeof utm.ref === 'string' ? utm.ref : null;
    return {
      created_at: String(r.created_at),
      source: String(r.source),
      status: String(r.status),
      page: typeof r.page === 'string' ? r.page : null,
      utm_src: src,
    };
  });
  return { leads };
}

/** Pocket Fishing Guide traffic from Vercel Web Analytics. */
export async function pfgWeb(since: string, until: string): Promise<Pick<Raw, 'pfgWeb'>> {
  const token = env('VERCEL_TOKEN');
  const project = env('VERCEL_PFG_PROJECT_ID');
  const team = env('VERCEL_TEAM_ID');
  const base = 'https://api.vercel.com/v1/query/web-analytics/visits/aggregate';
  const q = (by: string, limit: number) =>
    `${base}?projectId=${encodeURIComponent(project)}&teamId=${encodeURIComponent(team)}` +
    `&by=${by}&since=${since}T00:00:00.000Z&until=${until}T23:59:59.000Z&limit=${limit}`;
  const headers = { Authorization: `Bearer ${token}` };
  const [weekly, refs] = await Promise.all([getJson(q('week', 30), { headers }), getJson(q('referrerHostname', 15), { headers })]);
  const rows = (x: unknown) => (((x as { data?: unknown[] }).data ?? []) as Record<string, unknown>[]);
  return {
    pfgWeb: {
      weekly: rows(weekly).map((r) => ({
        timestamp: String(r.timestamp),
        visitors: Number(r.visitors) || 0,
        pageviews: Number(r.pageviews) || 0,
      })) as WebWeek[],
      referrers: rows(refs).map((r) => ({ name: String(r.referrerHostname ?? ''), value: Number(r.visitors) || 0 })),
    },
  };
}

/**
 * Pocket Fishing Guide account and booking totals, from an aggregate-only endpoint the
 * PFG app serves (contract in README). Keeps PFG's database keys inside PFG.
 */
export async function pfgApp(): Promise<Pick<Raw, 'pfgApp'>> {
  const url = env('PFG_METRICS_URL');
  const token = env('PFG_METRICS_TOKEN');
  const j = (await getJson(url, { headers: { Authorization: `Bearer ${token}` } })) as Record<string, unknown>;
  const n = (k: string) => Number(j[k]) || 0;
  const signups = Array.isArray(j.signups_weekly)
    ? (j.signups_weekly as Record<string, unknown>[]).map((s) => ({ timestamp: String(s.week), value: Number(s.n) || 0 }))
    : [];
  const app: PfgApp = {
    users_total: n('users_total'),
    new_30d: n('new_30d'),
    active_7d: n('active_7d'),
    active_30d: n('active_30d'),
    signups,
    trips_real: n('trips_real'),
    trips_confirmed: n('trips_confirmed'),
    partners_published: n('partners_published'),
  };
  return { pfgApp: app };
}

/** GA4 sessions by week and by channel for talewatersandtides.com. */
export async function twtWeb(since: string, until: string): Promise<Pick<Raw, 'twtWeb'>> {
  const property = env('GA4_PROPERTY_ID_TWT');
  const token = await googleToken(['https://www.googleapis.com/auth/analytics.readonly']);
  const run = (body: unknown) =>
    getJson(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(property)}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as Promise<{ rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] }>;
  const dateRanges = [{ startDate: since, endDate: until }];
  const [byDay, byChannel] = await Promise.all([
    run({ dateRanges, dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }], limit: 400 }),
    run({ dateRanges, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], limit: 10 }),
  ]);
  const weekly: WebWeek[] = (byDay.rows ?? []).map((r) => {
    const d = r.dimensionValues[0].value; // YYYYMMDD
    return {
      timestamp: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T00:00:00Z`,
      visitors: Number(r.metricValues[0].value) || 0,
      pageviews: Number(r.metricValues[1].value) || 0,
    };
  });
  const channels: Named[] = (byChannel.rows ?? []).map((r) => ({
    name: r.dimensionValues[0].value,
    value: Number(r.metricValues[0].value) || 0,
  }));
  return { twtWeb: { weekly, channels } };
}

/** Search Console clicks and impressions by day for each configured site. */
export async function search(since: string, until: string): Promise<Pick<Raw, 'search'>> {
  // GSC_SITES: "twt=sc-domain:talewatersandtides.com,pfg=sc-domain:pocketfishinguide.com"
  const sites = Object.fromEntries(
    env('GSC_SITES')
      .split(',')
      .map((p) => p.split('=').map((s) => s.trim()))
      .filter((p) => p.length === 2 && p[0] && p[1])
  ) as Record<string, string>;
  const token = await googleToken(['https://www.googleapis.com/auth/webmasters.readonly']);
  const out: NonNullable<Raw['search']> = {};
  for (const key of ['twt', 'pfg'] as const) {
    if (!sites[key]) continue;
    const j = (await getJson(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(sites[key])}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: since, endDate: until, dimensions: ['date'], rowLimit: 500 }),
      }
    )) as { rows?: { keys: string[]; clicks: number; impressions: number }[] };
    out[key] = (j.rows ?? []).map((r): SearchWeek => ({
      timestamp: r.keys[0] + 'T00:00:00Z',
      clicks: r.clicks,
      impressions: r.impressions,
    }));
  }
  return { search: out };
}
