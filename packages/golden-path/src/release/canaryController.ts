import { AuditTrailEntry, CanaryConfig, CanaryOutcome, CanarySignal } from "../types.js";

export function evaluateCanaryStep(
  signal: CanarySignal,
  config: CanaryConfig
): { healthy: boolean; reason?: string } {
  if (signal.errorRate > config.maxErrorRate) {
    return { healthy: false, reason: "error_rate_exceeded" };
  }
  if (signal.p99LatencyMs > config.maxP99Latency) {
    return { healthy: false, reason: "latency_regression" };
  }
  if (signal.saturation > config.maxSaturation) {
    return { healthy: false, reason: "saturation_limit" };
  }
  if (
    config.maxCustomMetric !== undefined &&
    signal.customMetric !== undefined &&
    signal.customMetric > config.maxCustomMetric
  ) {
    return { healthy: false, reason: "custom_metric_limit" };
  }
  return { healthy: true };
}

export function runCanary(
  signals: CanarySignal[],
  config: CanaryConfig,
  manualOverride = false
): CanaryOutcome {
  const auditTrail: AuditTrailEntry[] = [];
  for (let i = 0; i < config.steps.length; i += 1) {
    const step = config.steps[i];
    const signal = signals[i];
    const result = evaluateCanaryStep(signal, config);
    auditTrail.push({
      timestamp: new Date().toISOString(),
      message: "canary_step",
      context: { step, signal, result },
    });
    if (!result.healthy) {
      auditTrail.push({
        timestamp: new Date().toISOString(),
        message: "rollback",
        context: { step, reason: result.reason },
      });
      if (manualOverride) {
        auditTrail.push({
          timestamp: new Date().toISOString(),
          message: "manual_override",
          context: { by: "operator", step },
        });
        return { state: "rolled_forward", auditTrail };
      }
      return { state: "rolled_back", failedStep: step, reason: result.reason, auditTrail };
    }
  }
  auditTrail.push({
    timestamp: new Date().toISOString(),
    message: "promotion",
    context: { to: "100%" },
  });
  return { state: "rolled_forward", auditTrail };
}
