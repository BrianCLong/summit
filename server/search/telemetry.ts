import { Counter, Histogram } from 'prom-client';
export const impressions = new Counter({
  name: 'search_impressions_total',
  help: 'impressions',
  labelNames: ['tenant', 'qhash', 'rank', 'doc'],
});
export const clicks = new Counter({
  name: 'search_clicks_total',
  help: 'clicks',
  labelNames: ['tenant', 'qhash', 'rank', 'doc'],
});
export const dwell = new Histogram({
  name: 'search_dwell_seconds',
  help: 'dwell',
  labelNames: ['tenant', 'qhash', 'rank', 'doc'],
  buckets: [1, 3, 5, 10, 30, 60, 120],
});
export function logImpression(
  tenant: string,
  qhash: string,
  rank: number,
  doc: string,
) {
  impressions.inc({ tenant, qhash, rank, doc });
}
export function logClick(
  tenant: string,
  qhash: string,
  rank: number,
  doc: string,
) {
  clicks.inc({ tenant, qhash, rank, doc });
}
export function logDwell(
  tenant: string,
  qhash: string,
  rank: number,
  doc: string,
  sec: number,
) {
  dwell.observe({ tenant, qhash, rank, doc }, sec);
}
