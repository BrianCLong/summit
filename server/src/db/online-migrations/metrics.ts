import { Counter, Gauge, Histogram, Registry } from 'prom-client';

export const migrationMetricsRegistry = new Registry();

export const backfillProcessedCounter = new Counter({
  name: 'online_migration_backfill_processed_total',
  help: 'Rows processed by online migration backfill jobs',
  labelNames: ['migration', 'job'],
  registers: [migrationMetricsRegistry],
});

export const backfillDurationSeconds = new Histogram({
  name: 'online_migration_backfill_duration_seconds',
  help: 'Time spent per backfill chunk',
  labelNames: ['migration', 'job'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [migrationMetricsRegistry],
});

export const backfillProgressGauge = new Gauge({
  name: 'online_migration_backfill_processed_rows',
  help: 'Cumulative processed rows for the backfill job',
  labelNames: ['migration', 'job'],
  registers: [migrationMetricsRegistry],
});

export const dualWriteDurationSeconds = new Histogram({
  name: 'online_migration_dual_write_duration_seconds',
  help: 'Latency for dual-write operations during expand/contract',
  labelNames: ['migration', 'operation'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [migrationMetricsRegistry],
});

export const parityMismatchCounter = new Counter({
  name: 'online_migration_parity_mismatches_total',
  help: 'Parity mismatches detected between old and new representations',
  labelNames: ['migration'],
  registers: [migrationMetricsRegistry],
});

export const paritySamplesCounter = new Counter({
  name: 'online_migration_parity_samples_total',
  help: 'Samples compared during parity checks',
  labelNames: ['migration'],
  registers: [migrationMetricsRegistry],
});

export function resetMigrationMetrics() {
  migrationMetricsRegistry.resetMetrics();
}
