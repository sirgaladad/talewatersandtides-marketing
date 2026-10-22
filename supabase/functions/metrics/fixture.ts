// Synthetic input for tests and for the dashboard's sample mode (#demo).
// Every number here is made up. Real figures never go in this public repo.
//
//   deno run fixture.ts > ../../../admin/metrics/sample.json

import { buildPayload, type Raw } from './build.ts';
import type { SourceState } from './shape.ts';

export const NOW = new Date('2026-10-22T14:00:00Z');

const weeks = [
  '2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07',
  '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19',
];
const visitors = [40, 36, 44, 52, 48, 45, 50, 47, 55, 120, 210, 150];

export const RAW: Raw = {
  pfgWeb: {
    weekly: weeks.map((w, i) => ({ timestamp: w + 'T00:00:00Z', visitors: visitors[i], pageviews: visitors[i] * 5 })),
    referrers: [
      { name: '', value: 300 },
      { name: 'google.com', value: 60 },
      { name: 'm.facebook.com', value: 25 },
      { name: 'facebook.com', value: 20 },
      { name: 'linkedin.com', value: 18 },
      { name: 'talewatersandtides.com', value: 12 },
      { name: 'vercel.com', value: 4 },
    ],
  },
  pfgApp: {
    users_total: 120,
    new_30d: 30,
    active_7d: 25,
    active_30d: 48,
    signups: weeks.map((w, i) => ({ timestamp: w, value: [2, 1, 3, 2, 2, 1, 2, 3, 2, 6, 9, 5][i] })),
    trips_real: 6,
    trips_confirmed: 0,
    partners_published: 5,
  },
  leads: [
    ...Array.from({ length: 5 }, (_, i) => ({
      created_at: `2026-10-0${i + 5}T15:00:00Z`,
      source: i < 3 ? 'readiness' : 'contact',
      status: 'new',
      page: i < 3 ? '/readiness/' : '/',
      utm_src: i === 0 ? 'linkedin' : null,
    })),
    { created_at: '2026-10-13T15:00:00Z', source: 'contact', status: 'contacted', page: '/guiding/', utm_src: null },
    { created_at: '2026-10-20T15:00:00Z', source: 'contact', status: 'spam', page: '/', utm_src: null },
  ],
};

export const SOURCES: Record<string, SourceState> = {
  twt_leads: { status: 'ok' },
  pfg_web: { status: 'ok' },
  pfg_app: { status: 'ok' },
  google: { status: 'not_connected', note: 'GOOGLE_SERVICE_ACCOUNT_JSON not set' },
  search: { status: 'not_connected', note: 'GOOGLE_SERVICE_ACCOUNT_JSON not set' },
};

if (import.meta.main) {
  const sample = buildPayload(RAW, SOURCES, NOW);
  console.log(JSON.stringify({ ...sample, sample: true }, null, 2));
}
