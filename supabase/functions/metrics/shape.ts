// Pure shaping for the metrics function: week buckets, KPI deltas, the plain-language
// story lines, and the partner redaction. No network, no env, so every rule here is
// unit-tested in metrics_test.ts.

export type SourceStatus = 'ok' | 'not_connected' | 'error';

export interface SourceState {
  status: SourceStatus;
  note?: string;
}

export interface Point {
  week: string; // ISO date of the Monday that starts the week (UTC)
  value: number;
}

export interface Kpi {
  key: string;
  label: string;
  value: number | null;
  prev?: number | null; // same measure over the previous equal window, when known
  unit?: string;
  hint?: string;
}

export interface Named {
  name: string;
  value: number;
}

export interface Business {
  name: string;
  kpis: Kpi[];
  series: Record<string, Point[]>;
  breakdowns: Record<string, Named[]>;
  story: string[];
  /** Story lines built from lead rows. Admin view only; redactForPartner never copies them. */
  admin_story?: string[];
  admin_only?: Record<string, unknown>;
}

export interface Payload {
  version: 1;
  scope: 'admin' | 'partner';
  generated_at: string;
  range: { since: string; until: string; weeks: number };
  sources: Record<string, SourceState>;
  businesses: { pfg: Business; twt: Business };
}

/** Thrown by a collector whose secrets are not set; the panel shows as not connected. */
export class NotConnected extends Error {}

const DAY = 86_400_000;

/** Monday 00:00 UTC of the week holding `d`. */
export function weekStart(d: Date): Date {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
  return new Date(t - dow * DAY);
}

/** The Monday dates of the last `n` weeks, oldest first, ending with the current week. */
export function weekKeys(now: Date, n: number): string[] {
  const end = weekStart(now).getTime();
  return Array.from({ length: n }, (_, i) => new Date(end - (n - 1 - i) * 7 * DAY).toISOString().slice(0, 10));
}

/** Count timestamps into the given week buckets; anything outside the window is ignored. */
export function bucketWeekly(timestamps: string[], keys: string[]): Point[] {
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const ts of timestamps) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) continue;
    const k = weekStart(d).toISOString().slice(0, 10);
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  return keys.map((week) => ({ week, value: counts.get(week)! }));
}

/** Re-key a provider's weekly rows (any timestamp inside the week) onto our buckets. */
export function alignWeekly(rows: { timestamp: string; value: number }[], keys: string[]): Point[] {
  const byWeek = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.timestamp);
    if (Number.isNaN(d.getTime())) continue;
    const k = weekStart(d).toISOString().slice(0, 10);
    byWeek.set(k, (byWeek.get(k) ?? 0) + (Number(r.value) || 0));
  }
  return keys.map((week) => ({ week, value: byWeek.get(week) ?? 0 }));
}

export function sum(points: Point[]): number {
  return points.reduce((a, p) => a + p.value, 0);
}

/** Percent change from `prev` to `value`, rounded; null when there is no fair base. */
export function pctChange(value: number | null | undefined, prev: number | null | undefined): number | null {
  if (value == null || prev == null || prev <= 0) return null;
  return Math.round(((value - prev) / prev) * 100);
}

/**
 * The last four complete weeks and the four before them, as [current, previous].
 * The last point is always the current, partial week, so it is left out of both.
 */
export function fullWeekWindows(points: Point[]): [number, number] {
  const full = points.slice(0, -1);
  return [sum(full.slice(-4)), sum(full.slice(-8, -4))];
}

/**
 * Last complete week against the average of the four complete weeks before it.
 * The current (partial) week is never compared, so a Monday morning never reads as a crash.
 */
export function trendLine(points: Point[], noun: string, now: Date): string | null {
  const current = weekStart(now).toISOString().slice(0, 10);
  const full = points.filter((p) => p.week < current);
  if (full.length < 5) return null;
  const last = full[full.length - 1];
  const base = full.slice(-5, -1);
  const avg = sum(base) / base.length;
  const label = fmtWeek(last.week);
  if (avg < 1) {
    return last.value > 0 ? `${cap(noun)} picked up in the week of ${label}: ${last.value} after a near-empty month.` : null;
  }
  const pct = Math.round(((last.value - avg) / avg) * 100);
  if (Math.abs(pct) < 10) return `${cap(noun)} held steady in the week of ${label} (${last.value}, about the 4-week average).`;
  if (pct >= 200) {
    return `${cap(noun)} reached ${last.value} in the week of ${label}, about ${Math.round(last.value / avg)} times the 4-week average of ${Math.round(avg)}.`;
  }
  const dir = pct > 0 ? 'up' : 'down';
  return `${cap(noun)} ${dir} ${Math.abs(pct)}% in the week of ${label} (${last.value} against a 4-week average of ${Math.round(avg)}).`;
}

/** Share of the total held by the named item, as a whole percent. */
export function share(items: Named[], name: string): number | null {
  const total = items.reduce((a, i) => a + i.value, 0);
  if (!total) return null;
  const hit = items.find((i) => i.name === name);
  return Math.round(((hit?.value ?? 0) / total) * 100);
}

export function fmtWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Lines that say what a missing source means for the reader, one per gap. */
export function gapLines(sources: Record<string, SourceState>): string[] {
  const labels: Record<string, string> = {
    pfg_web: 'Pocket Fishing Guide traffic',
    pfg_app: 'Pocket Fishing Guide accounts',
    twt_leads: 'Tale Waters and Tides leads',
    google: 'Google Analytics for Tale Waters and Tides',
    search: 'Google Search Console',
  };
  return Object.entries(sources)
    .filter(([, s]) => s.status !== 'ok')
    .map(([k, s]) =>
      s.status === 'not_connected'
        ? `${labels[k] ?? k} is not connected yet, so that part of the picture is blank.`
        : `${labels[k] ?? k} failed to load this time; the numbers shown leave it out.`
    );
}

/**
 * What a partner sees: trends and totals for both businesses, with consulting lead
 * counts, lead story lines, the lead pipeline and anything marked admin_only removed. Built by copying
 * only allowed fields, so a field added later stays private until it is listed here.
 */
export function redactForPartner(p: Payload): Payload {
  const keepBusiness = (b: Business, hideKpis: string[], hideSeries: string[], hideBreakdowns: string[]): Business => ({
    name: b.name,
    kpis: b.kpis.filter((k) => !hideKpis.includes(k.key)).map((k) => ({ ...k })),
    series: Object.fromEntries(Object.entries(b.series).filter(([k]) => !hideSeries.includes(k))),
    breakdowns: Object.fromEntries(Object.entries(b.breakdowns).filter(([k]) => !hideBreakdowns.includes(k))),
    // Lead lines live in admin_story, which is never copied. The pattern is a second guard
    // in case a lead-derived line is ever added to story by mistake.
    story: b.story.filter((line) => !/lead|pipeline|unattributed|early-interest/i.test(line)),
  });
  return {
    version: 1,
    scope: 'partner',
    generated_at: p.generated_at,
    range: p.range,
    sources: Object.fromEntries(Object.entries(p.sources).map(([k, s]) => [k, { status: s.status }])),
    businesses: {
      pfg: keepBusiness(p.businesses.pfg, [], [], []),
      twt: keepBusiness(p.businesses.twt, ['leads_total', 'leads_window', 'leads_open'], ['leads'], ['lead_sources', 'lead_pages']),
    },
  };
}
