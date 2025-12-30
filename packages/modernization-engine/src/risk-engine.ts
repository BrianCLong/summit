import { predictiveRiskGauge } from './metrics.js';
import { DomainEvent, TrafficDirective } from './types.js';
import { DomainRegistry } from './domain-registry.js';

const RISK_THRESHOLD = 0.65;

export class PredictiveRiskEngine {
  constructor(private readonly registry: DomainRegistry) {}

  calculateRisk(eventWindow: DomainEvent[]): Map<string, number> {
    const riskByDomain = new Map<string, number>();
    eventWindow.forEach((event) => {
      const baseline = 0.1;
      const latencyContribution = Math.min(event.latencyMs / 1000, 1) * 0.4;
      const violationContribution = event.violationObserved ? 0.4 : 0;
      const driftContribution = Math.min(Math.abs(event.driftDelta ?? 0) / 10, 1) * 0.3;
      const riskScore = Math.min(baseline + latencyContribution + violationContribution + driftContribution, 1);
      const current = riskByDomain.get(event.domain) ?? 0;
      riskByDomain.set(event.domain, Math.max(current, riskScore));
    });
    return riskByDomain;
  }

  deriveTrafficDirectives(eventWindow: DomainEvent[]): TrafficDirective[] {
    const riskByDomain = this.calculateRisk(eventWindow);
    const directives: TrafficDirective[] = [];

    this.registry.getDomains().forEach((domain) => {
      const riskScore = riskByDomain.get(domain.name) ?? 0;
      const shouldAlert = riskScore >= RISK_THRESHOLD;
      const shadowPercentage = Math.min(50, Math.round(riskScore * 100));
      const primaryPercentage = 100 - shadowPercentage;
      const featureFlags = {
        [`${domain.name}-write-guard`]: shouldAlert,
        [`${domain.name}-shadow-mode`]: riskScore > 0.4,
      };
      if (shouldAlert) {
        predictiveRiskGauge.labels({ domain: domain.name, severity: 'high' }).inc();
      }
      directives.push({
        domain: domain.name,
        shadowPercentage,
        primaryPercentage,
        featureFlags,
        rationale: shouldAlert
          ? `Risk ${riskScore.toFixed(2)} exceeds threshold; increasing shadow traffic`
          : `Risk ${riskScore.toFixed(2)} nominal; keep primary traffic`,
      });
    });

    return directives;
  }
}
