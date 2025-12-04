import { Histogram, Counter, Gauge } from 'prom-client';

export const dbPoolSize = new Gauge({
  name: 'db_pool_size',
  help: 'Current size of the database connection pool',
  labelNames: ['database', 'type'] as const,
});

export const dbPoolIdle = new Gauge({
  name: 'db_pool_idle',
  help: 'Number of idle connections in the pool',
  labelNames: ['database', 'type'] as const,
});

export const dbPoolWaiting = new Gauge({
  name: 'db_pool_waiting',
  help: 'Number of requests waiting for a connection',
  labelNames: ['database', 'type'] as const,
});

export const dbConnectionErrors = new Counter({
  name: 'db_connection_errors_total',
  help: 'Total number of database connection errors',
  labelNames: ['database', 'error_type'] as const,
});

export const circuitBreakerState = new Gauge({
  name: 'db_circuit_breaker_state',
  help: 'State of the circuit breaker (0=closed, 1=half-open, 2=open)',
  labelNames: ['database'] as const,
});

export const backupDuration = new Histogram({
  name: 'backup_duration_seconds',
  help: 'Duration of backup operations',
  labelNames: ['type', 'status'] as const,
});

export const backupSize = new Gauge({
  name: 'backup_size_bytes',
  help: 'Size of the backup artifact',
  labelNames: ['type'] as const,
});
