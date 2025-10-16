import { Gauge, Counter } from 'prom-client';
import { registry } from './registry.js';

export const poolInfo = new Gauge({
  name: 'maestro_pool_info',
  help: 'Registered pools (labels only)',
  labelNames: ['pool', 'region'] as const,
  registers: [registry],
});

export const poolCpuUsd = new Gauge({
  name: 'maestro_pool_cpu_sec_usd',
  help: 'CPU-second price by pool',
  labelNames: ['pool'] as const,
  registers: [registry],
});

export const poolGbUsd = new Gauge({
  name: 'maestro_pool_gb_sec_usd',
  help: 'GB-second price by pool',
  labelNames: ['pool'] as const,
  registers: [registry],
});

export const poolEgressUsd = new Gauge({
  name: 'maestro_pool_egress_gb_usd',
  help: 'Egress GB price by pool',
  labelNames: ['pool'] as const,
  registers: [registry],
});

export const poolHeartbeats = new Counter({
  name: 'maestro_pool_heartbeats_total',
  help: 'Pool heartbeat counter',
  labelNames: ['pool'] as const,
  registers: [registry],
});
