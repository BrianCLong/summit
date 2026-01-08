import {
  EvidenceEvent,
  RegionId,
  ResidencySimulationOutcome,
  ScreeningQualityResult,
} from "./types.js";

export class EvidenceExporter {
  buildEvidencePack(events: EvidenceEvent[], regionId: RegionId) {
    const filtered = events
      .filter((event) => event.regionId === regionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const latestByType = new Map<string, EvidenceEvent>();
    for (const event of filtered) {
      latestByType.set(event.type, event);
    }

    return {
      regionId,
      exportedAt: new Date().toISOString(),
      events: Array.from(latestByType.values()).map((event) => ({
        type: event.type,
        payload: event.payload,
        timestamp: event.timestamp.toISOString(),
      })),
    };
  }
}

export class RegionalDigitalTwin {
  simulate(
    scenario: string,
    residencyStrict: boolean,
    availabilityWeight: number
  ): ResidencySimulationOutcome {
    const residencyRiskScore = residencyStrict ? 0.05 : 0.35;
    const availabilityScore = Math.min(1, 0.6 + availabilityWeight * 0.4);
    const recommendation = residencyStrict
      ? "Maintain hard residency; use in-region failover only"
      : "Permit controlled cross-region failover with contractual guardrails";

    return {
      scenario,
      residencyRiskScore,
      availabilityScore,
      recommendation,
    };
  }
}

export class ScreeningQualityLoop {
  constructor(private readonly threshold: number) {}

  evaluate(falseNegatives: number, totalScreened: number): ScreeningQualityResult {
    const falseNegativeRate = totalScreened === 0 ? 0 : falseNegatives / totalScreened;
    const thresholdsAdjusted = falseNegativeRate > this.threshold;
    const newThreshold = thresholdsAdjusted ? Math.max(this.threshold * 0.9, 0.01) : this.threshold;

    return {
      falseNegativeRate,
      thresholdsAdjusted,
      newThreshold,
    };
  }
}
