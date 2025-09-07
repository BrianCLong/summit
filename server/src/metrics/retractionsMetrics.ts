import { Counter, Histogram } from 'prom-client';
import { registry } from './registry.js';

export const retractionsProcessed = new Counter({
  name: 'retractions_processed_total',
  help: 'Retraction jobs processed',
  labelNames: ['status'] as const,
  registers: [registry],
});

export const retractionsDuration = new Histogram({
  name: 'retractions_processing_seconds',
  help: 'Time from creation to processed',
  buckets: [60, 300, 1800, 3600, 86400, 259200],
  registers: [registry],
});

export const retractionsSlaBreaches = new Counter({
  name: 'retractions_sla_breach_total',
  help: 'Retractions exceeding SLA window',
  registers: [registry],
});
