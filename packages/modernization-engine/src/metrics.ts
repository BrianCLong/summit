import { Counter, Registry } from "prom-client";

export const registry = new Registry();

export const boundaryViolationCounter = new Counter({
  name: "domain_boundary_violations_total",
  help: "Counts domain boundary violations by source, target, and type",
  labelNames: ["source_domain", "target_domain", "type"],
  registers: [registry],
});

export const predictiveRiskGauge = new Counter({
  name: "predictive_risk_alerts_total",
  help: "Counts predictive risk alerts emitted by the risk engine",
  labelNames: ["domain", "severity"],
  registers: [registry],
});

export function serializeMetrics(): Promise<string> {
  return registry.metrics();
}
