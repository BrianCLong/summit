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

export const featureFlagEnabledGauge = new Gauge({
  name: 'feature_flag_enabled',
  help: 'Feature flag state (1=enabled,0=disabled)',
  labelNames: ['flag'] as const,
  registers: [registry],
});

export const pricingRefreshBlockedTotal = new Counter({
  name: 'pricing_refresh_blocked_total',
  help: 'Number of pricing refresh attempts blocked by feature flag',
  registers: [registry],
});

export const poolSelectionFallbackTotal = new Counter({
  name: 'pool_selection_fallback_total',
  help: 'Count of pool selection fallbacks triggered by feature flags or missing data',
  labelNames: ['reason'] as const,
  registers: [registry],
});
