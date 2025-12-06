import { Histogram, Counter, Gauge, register } from 'prom-client';

export const featureFlagLatency = new Histogram({
  name: 'feature_flag_evaluation_duration_seconds',
  help: 'Latency of OPA-backed feature flag evaluations',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  labelNames: ['flag', 'source', 'outcome'],
});

export const featureFlagDecisions = new Counter({
  name: 'feature_flag_decisions_total',
  help: 'Total feature flag decisions emitted by the runtime SDK',
  labelNames: ['flag', 'source', 'outcome'],
});

export const killSwitchGauge = new Gauge({
  name: 'feature_kill_switch_active',
  help: 'Indicates whether a kill switch is active for a module',
  labelNames: ['module'],
});

export function ensureMetricsRegistered() {
  if (!register.getSingleMetric(featureFlagLatency.name)) {
    register.registerMetric(featureFlagLatency);
  }
  if (!register.getSingleMetric(featureFlagDecisions.name)) {
    register.registerMetric(featureFlagDecisions);
  }
  if (!register.getSingleMetric(killSwitchGauge.name)) {
    register.registerMetric(killSwitchGauge);
  }
}
