import { Histogram, Counter, Gauge } from 'prom-client';
import { registry } from './registry.js';

export const dbPoolSize = new Gauge({
  name: 'db_pool_size',
  help: 'Current size of the database connection pool',
  labelNames: ['database', 'type'] as const,
  registers: [registry],
});

export const dbPoolIdle = new Gauge({
  name: 'db_pool_idle',
  help: 'Number of idle connections in the pool',
  labelNames: ['database', 'type'] as const,
  registers: [registry],
});

export const dbPoolWaiting = new Gauge({
  name: 'db_pool_waiting',
  help: 'Number of requests waiting for a connection',
  labelNames: ['database', 'type'] as const,
  registers: [registry],
});

export const dbConnectionErrors = new Counter({
  name: 'db_connection_errors_total',
  help: 'Total number of database connection errors',
  labelNames: ['database', 'error_type'] as const,
  registers: [registry],
});

export const circuitBreakerState = new Gauge({
  name: 'db_circuit_breaker_state',
  help: 'State of the circuit breaker (0=closed, 1=half-open, 2=open)',
  labelNames: ['database'] as const,
  registers: [registry],
});

export const backupDuration = new Histogram({
  name: 'backup_duration_seconds',
  help: 'Duration of backup operations',
  labelNames: ['type', 'status'] as const,
  registers: [registry],
});

export const backupSize = new Gauge({
  name: 'backup_size_bytes',
  help: 'Size of the backup artifact',
  labelNames: ['type'] as const,
  registers: [registry],
});

export const dbPoolActive = new Gauge({
  name: 'db_pool_active',
  help: 'Active connections in the pool',
  labelNames: ['database', 'type'] as const,
  registers: [registry],
});

export const dbPoolWaitDurationSeconds = new Histogram({
  name: 'db_pool_wait_duration_seconds',
  help: 'Time spent waiting for a connection from the pool',
  labelNames: ['pool', 'type'] as const,
  registers: [registry],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

export const dbTransactionDurationSeconds = new Histogram({
  name: 'db_transaction_duration_seconds',
  help: 'Duration of database transactions',
  labelNames: ['pool', 'type', 'mode', 'outcome'] as const,
  registers: [registry],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20],
});

export const dbLockWaits = new Counter({
  name: 'db_lock_wait_total',
  help: 'Total lock wait timeouts encountered',
  labelNames: ['pool', 'type', 'code'] as const,
  registers: [registry],
});
