
export interface SLO {
  name: string;
  description: string;
  target: number; // e.g. 0.99 for 99%
  periodDays: number; // e.g. 30
  type: 'latency' | 'availability' | 'freshness' | 'quality';
  threshold?: number; // e.g. 2000 (ms) for latency
  filter?: Record<string, string>; // e.g. { route: '/api/v1/search' }
}

export const CORE_SLOS: SLO[] = [
  {
    name: 'api_search_latency',
    description: '99% of /api/v1/search requests complete in < 2s',
    target: 0.99,
    periodDays: 30,
    type: 'latency',
    threshold: 2000,
    filter: { route: '/api/v1/search' },
  },
  {
    name: 'maestro_run_success',
    description: '99.5% of Maestro runs complete successfully',
    target: 0.995,
    periodDays: 30,
    type: 'availability',
    filter: { service: 'maestro' },
  },
  {
    name: 'ingestion_pipeline_success',
    description: '99% of ingestion pipeline runs complete without failure',
    target: 0.99,
    periodDays: 30,
    type: 'availability',
    filter: { service: 'ingestion' },
  },
  {
    name: 'graph_query_latency',
    description: '95% of graph queries complete in < 500ms',
    target: 0.95,
    periodDays: 7,
    type: 'latency',
    threshold: 500,
    filter: { service: 'graph' },
  },
];

export function getSloByName(name: string): SLO | undefined {
    return CORE_SLOS.find(s => s.name === name);
}
