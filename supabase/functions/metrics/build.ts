// Turns what the collectors fetched into the dashboard payload. Pure: the same raw
// input and clock always give the same payload, which is what the tests pin down.

import {
  alignWeekly,
  bucketWeekly,
  type Business,
  gapLines,
  type Kpi,
  type Named,
  type Payload,
  share,
  type SourceState,
  sum,
  trendLine,
  weekKeys,
} from './shape.ts';

export interface LeadRow {
  created_at: string;
  source: string; // contact | readiness
  status: string; // new | contacted | qualified | won | lost | spam
  page: string | null;
  utm_src: string | null; // utm_source, else ref, else null
}

export interface WebWeek {
  timestamp: string;
  visitors: number;
  pageviews: number;
}

export interface PfgApp {
  users_total: number;
  new_30d: number;
  active_7d: number;
  active_30d: number;
  signups: { timestamp: string; value: number }[];
  trips_real: number;
  trips_confirmed: number;
  partners_published: number;
}

export interface SearchWeek {
  timestamp: string;
  clicks: number;
  impressions: number;
}

export interface Raw {
  leads?: LeadRow[];
  pfgWeb?: { weekly: WebWeek[]; referrers: Named[] };
  pfgApp?: PfgApp;
  twtWeb?: { weekly: WebWeek[]; channels: Named[] }; // GA4 (sessions as visitors)
  search?: { twt?: SearchWeek[]; pfg?: SearchWeek[] };
}

export const WEEKS = 12;

/** Readable name for a referrer host; empty means the visit carried no referrer. */
export function referrerName(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, '');
  if (!h) return 'Direct or app';
  if (/(^|\.)facebook\.com$|^l\.facebook|^lm\.facebook|^m\.facebook/.test(h)) return 'Facebook';
  if (/linkedin/.test(h)) return 'LinkedIn';
  if (/(^|\.)google\./.test(h)) return 'Google';
  if (/bing\.com|duckduckgo|yahoo\.com|baidu/.test(h)) return 'Other search';
  if (h === 'talewatersandtides.com') return 'Tale Waters and Tides';
  if (h === 'vercel.com') return 'Team and previews';
  if (/instagram/.test(h)) return 'Instagram';
  return h === 'others' ? 'Other sites' : h;
}

/** Merge referrer rows that map to the same readable name, largest first. */
export function groupReferrers(rows: Named[]): Named[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const n = referrerName(r.name);
    m.set(n, (m.get(n) ?? 0) + r.value);
  }
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function leadSourceName(utm: string | null): string {
  if (!utm) return 'Unattributed';
  const s = utm.toLowerCase();
  if (s.includes('linkedin')) return 'LinkedIn';
  if (s.includes('facebook') || s === 'fb') return 'Facebook';
  if (s.includes('google')) return 'Google';
  if (s.includes('pfg') || s.includes('pocketfishing')) return 'Pocket Fishing Guide';
  return 'Other tagged';
}

function count(items: string[]): Named[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function pageName(page: string | null): string {
  if (!page) return 'Unknown page';
  if (page.startsWith('/readiness')) return 'Readiness check';
  if (page.startsWith('/guiding')) return 'Guides';
  if (page === '/' || page === '') return 'Home contact form';
  return page;
}

export function buildPfg(raw: Raw, keys: string[], now: Date): Business {
  const kpis: Kpi[] = [];
  const series: Business['series'] = {};
  const breakdowns: Business['breakdowns'] = {};
  const story: string[] = [];

  if (raw.pfgWeb) {
    const visitors = alignWeekly(raw.pfgWeb.weekly.map((w) => ({ timestamp: w.timestamp, value: w.visitors })), keys);
    const views = alignWeekly(raw.pfgWeb.weekly.map((w) => ({ timestamp: w.timestamp, value: w.pageviews })), keys);
    series.visitors = visitors;
    series.pageviews = views;
    const last4 = sum(visitors.slice(-4));
    const prev4 = sum(visitors.slice(-8, -4));
    kpis.push({ key: 'visitors_4w', label: 'Visitors, last 4 weeks', value: last4, prev: prev4 });
    const v4 = sum(views.slice(-4));
    kpis.push({
      key: 'pages_per_visitor',
      label: 'Pages per visitor',
      value: last4 ? Math.round((v4 / last4) * 10) / 10 : null,
      hint: 'Pageviews divided by visitors over the same 4 weeks',
    });
    const refs = groupReferrers(raw.pfgWeb.referrers);
    breakdowns.referrers = refs;
    const t = trendLine(visitors, 'visitors', now);
    if (t) story.push(t);
    const direct = share(refs, 'Direct or app');
    const named = refs.filter((r) => r.name !== 'Direct or app' && r.name !== 'Team and previews');
    if (direct != null && direct >= 50) {
      story.push(
        `${direct}% of visitors arrive with no referrer: typed links, the installed app, texts and shares. ` +
          `Tagging shared links is how that group becomes readable.`
      );
    }
    if (named.length) {
      story.push(`${named[0].name} is the largest named source (${named[0].value} visitors), then ${named.slice(1, 3).map((n) => n.name).join(' and ') || 'nothing else close'}.`);
    }
  }

  if (raw.pfgApp) {
    const a = raw.pfgApp;
    kpis.push({ key: 'accounts', label: 'Angler accounts', value: a.users_total, hint: 'Demo accounts excluded' });
    kpis.push({ key: 'new_30d', label: 'New accounts, 30 days', value: a.new_30d });
    kpis.push({ key: 'active_7d', label: 'Signed in, last 7 days', value: a.active_7d });
    kpis.push({ key: 'partners', label: 'Published partners', value: a.partners_published });
    series.signups = alignWeekly(a.signups, keys);
    if (a.users_total) {
      story.push(
        `${a.active_30d} of ${a.users_total} accounts signed in during the last 30 days, and ${a.new_30d} accounts were created in that time.`
      );
    }
    kpis.push({ key: 'trips_real', label: 'Guide-trip requests', value: a.trips_real, hint: 'Demo requests excluded' });
    kpis.push({ key: 'trips_confirmed', label: 'Guide trips confirmed', value: a.trips_confirmed });
    if (a.trips_real > 0 && a.trips_confirmed === 0) {
      story.push(`${a.trips_real} real guide-trip requests have come in and none is confirmed yet, so booking is the open step.`);
    } else if (a.trips_confirmed > 0) {
      story.push(`${a.trips_confirmed} of ${a.trips_real} real guide-trip requests are confirmed.`);
    }
  }

  if (raw.search?.pfg) {
    const clicks = alignWeekly(raw.search.pfg.map((s) => ({ timestamp: s.timestamp, value: s.clicks })), keys);
    series.search_clicks = clicks;
    kpis.push({ key: 'search_clicks_4w', label: 'Google clicks, last 4 weeks', value: sum(clicks.slice(-4)), prev: sum(clicks.slice(-8, -4)) });
  }

  return { name: 'Pocket Fishing Guide', kpis, series, breakdowns, story };
}

export function buildTwt(raw: Raw, keys: string[], now: Date): Business {
  const kpis: Kpi[] = [];
  const series: Business['series'] = {};
  const breakdowns: Business['breakdowns'] = {};
  const story: string[] = [];
  const admin_only: Record<string, unknown> = {};

  if (raw.twtWeb) {
    const visits = alignWeekly(raw.twtWeb.weekly.map((w) => ({ timestamp: w.timestamp, value: w.visitors })), keys);
    series.visitors = visits;
    kpis.push({ key: 'visitors_4w', label: 'Sessions, last 4 weeks', value: sum(visits.slice(-4)), prev: sum(visits.slice(-8, -4)) });
    breakdowns.channels = raw.twtWeb.channels;
    const t = trendLine(visits, 'sessions', now);
    if (t) story.push(t);
  }

  if (raw.leads) {
    const real = raw.leads.filter((l) => l.status !== 'spam');
    const weekly = bucketWeekly(real.map((l) => l.created_at), keys);
    series.leads = weekly;
    const inWindow = sum(weekly);
    const open = real.filter((l) => l.status === 'new').length;
    kpis.push({ key: 'leads_total', label: 'Leads since launch', value: real.length });
    kpis.push({ key: 'leads_window', label: `Leads, last ${keys.length} weeks`, value: inWindow });
    kpis.push({ key: 'leads_open', label: 'Leads not yet worked', value: open, hint: 'Status still new' });
    const sources = count(real.map((l) => leadSourceName(l.utm_src)));
    breakdowns.lead_sources = sources;
    breakdowns.lead_pages = count(real.map((l) => pageName(l.page)));
    admin_only.pipeline = count(real.map((l) => l.status));

    if (real.length) {
      const top = breakdowns.lead_pages[0];
      story.push(`${real.length} leads since the site relaunch; the ${top.name.toLowerCase()} brought ${top.value} of them.`);
      const un = share(sources, 'Unattributed');
      if (un != null && un >= 50) {
        story.push(`${un}% of leads are unattributed, so it is not yet clear which channel produces them.`);
      }
      const stale = real.filter((l) => l.status === 'new' && now.getTime() - new Date(l.created_at).getTime() > 3 * 86_400_000).length;
      if (stale) story.push(`${stale} lead${stale === 1 ? ' has' : 's have'} sat in the pipeline as new for more than 3 days.`);
      const guiding = real.filter((l) => (l.page ?? '').startsWith('/guiding')).length;
      if (guiding) story.push(`The guide service has ${guiding} early-interest request${guiding === 1 ? '' : 's'} from its coming-soon page.`);
    }
  }

  if (raw.search?.twt) {
    const clicks = alignWeekly(raw.search.twt.map((s) => ({ timestamp: s.timestamp, value: s.clicks })), keys);
    series.search_clicks = clicks;
    kpis.push({ key: 'search_clicks_4w', label: 'Google clicks, last 4 weeks', value: sum(clicks.slice(-4)), prev: sum(clicks.slice(-8, -4)) });
  }

  return { name: 'Tale Waters and Tides', kpis, series, breakdowns, story, admin_only };
}

export function buildPayload(raw: Raw, sources: Record<string, SourceState>, now: Date): Payload {
  const keys = weekKeys(now, WEEKS);
  const pfg = buildPfg(raw, keys, now);
  const twt = buildTwt(raw, keys, now);
  const gaps = gapLines(sources);
  // Gaps go last in each story, so the reader sees what is known before what is missing.
  if (gaps.length) {
    pfg.story.push(...gaps.filter((g) => g.includes('Pocket Fishing Guide') || g.includes('Search Console')));
    twt.story.push(...gaps.filter((g) => g.includes('Tale Waters') || g.includes('Search Console')));
  }
  return {
    version: 1,
    scope: 'admin',
    generated_at: now.toISOString(),
    range: { since: keys[0], until: now.toISOString().slice(0, 10), weeks: WEEKS },
    sources,
    businesses: { pfg, twt },
  };
}
