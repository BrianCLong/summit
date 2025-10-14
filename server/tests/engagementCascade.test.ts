import { engagementCascade } from '../../src/insights/engagementCascade';

describe('engagementCascade', () => {
  it('reduces latency compared to the baseline plan', () => {
    const plan = engagementCascade();

    expect(plan.summary).toMatch(/speculative decoding/i);
    expect(plan.speculativeCascade.expectedLatencyMs).toBeLessThan(
      plan.baseline.latencyMs,
    );
    expect(plan.speculativeCascade.expectedComputeUnits).toBeLessThan(
      plan.baseline.computeUnits,
    );
  });

  it('improves hit rate and speedup with higher amplification', () => {
    const baselinePlan = engagementCascade();
    const tunedPlan = engagementCascade({
      engagementAmplification: 120,
      influenceIntensity: 1.6,
    });

    expect(tunedPlan.speculativeCascade.speculativeHitRate).toBeGreaterThan(
      baselinePlan.speculativeCascade.speculativeHitRate,
    );
    expect(tunedPlan.speculativeCascade.speedup).toBeGreaterThan(
      baselinePlan.speculativeCascade.speedup,
    );
  });

  it('keeps guardrail and tier metrics within sensible ranges', () => {
    const plan = engagementCascade({
      engagementAmplification: 20,
      globalDataSync: false,
    });

    expect(plan.guardrails.fallbackRate).toBeGreaterThanOrEqual(0);
    expect(plan.guardrails.fallbackRate).toBeLessThanOrEqual(1);
    expect(plan.guardrails.minimumConfidence).toBeGreaterThan(0.7);
    expect(plan.guardrails.minimumConfidence).toBeLessThanOrEqual(1);

    plan.speculativeCascade.tiers.forEach(tier => {
      expect(tier.latencyMs).toBeGreaterThan(0);
      expect(tier.acceptanceThreshold).toBeGreaterThan(0);
      expect(tier.acceptanceThreshold).toBeLessThanOrEqual(1);
    });
  });
});
