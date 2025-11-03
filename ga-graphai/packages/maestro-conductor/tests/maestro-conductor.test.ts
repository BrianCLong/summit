import { describe, expect, it, beforeEach } from 'vitest';
import type {
  AssetDescriptor,
  DiscoveryProvider,
  JobSpec,
  PolicyHook,
  ResponseStrategy,
} from '../src/types';
import { MaestroConductor } from '../src/maestro-conductor';

const assetAlpha: AssetDescriptor = {
  id: 'svc-alpha',
  name: 'orchestrator-alpha',
  kind: 'microservice',
  cloud: 'aws',
  region: 'us-east-1',
  labels: {
    compliance: 'soc2,hipaa',
    'data-region': 'us',
  },
  metadata: {
    fallback: 'svc-beta',
  },
  capabilities: [
    {
      name: 'maestro-routing',
      description: 'Multi-cloud orchestration',
      qualityOfService: { latencyMs: 120, reliability: 0.999 },
    },
    {
      name: 'auto-heal',
      qualityOfService: { latencyMs: 200, reliability: 0.998 },
    },
  ],
};

const assetBeta: AssetDescriptor = {
  id: 'svc-beta',
  name: 'orchestrator-beta',
  kind: 'microservice',
  cloud: 'gcp',
  region: 'us-central1',
  labels: {
    compliance: 'soc2',
    'data-region': 'us',
  },
  metadata: {
    fallback: 'svc-alpha',
  },
  capabilities: [
    {
      name: 'maestro-routing',
      qualityOfService: { latencyMs: 160, reliability: 0.992 },
    },
    {
      name: 'auto-heal',
      qualityOfService: { latencyMs: 260, reliability: 0.989 },
    },
  ],
};

describe('MaestroConductor meta-agent', () => {
  let conductor: MaestroConductor;
  let assets: AssetDescriptor[];
  const executed: string[] = [];

  beforeEach(async () => {
    assets = [assetAlpha, assetBeta];
    executed.length = 0;
    const provider: DiscoveryProvider = {
      id: 'stub',
      description: 'stub discovery',
      async scan() {
        return assets;
      },
    };

    conductor = new MaestroConductor({
      anomaly: { windowSize: 6, minSamples: 4, zThreshold: 1.2 },
      selfHealing: { defaultCooldownMs: 1 },
      optimizer: {
        windowSize: 12,
        latencyThresholdMs: 200,
        errorRateThreshold: 0.08,
        saturationThreshold: 0.7,
      },
      jobRouter: { latencyWeight: 0.4 },
    });

    conductor.registerDiscoveryProvider(provider);

    const policyHook: PolicyHook = {
      id: 'sensitivity',
      description: 'require hipaa for sensitive workloads',
      evaluate: ({ asset, job }) => {
        const sensitive = Boolean(job?.metadata?.sensitive);
        if (sensitive) {
          const compliance = asset.labels?.compliance ?? '';
          if (!compliance.includes('hipaa')) {
            return { allowed: false, reason: 'hipaa required' };
          }
        }
        return { allowed: true, reason: 'policy:approved' };
      },
    };

    conductor.registerPolicyHook(policyHook);

    const strategy: ResponseStrategy = {
      id: 'auto-fallback',
      description: 'failover to paired service and launch runbook',
      supports: (asset) => Boolean(asset.metadata?.fallback),
      shouldTrigger: (context) => context.anomaly.severity !== 'low',
      async execute(context) {
        const target = context.asset.metadata?.fallback as string | undefined;
        executed.push(`${context.asset.id}->${target ?? 'none'}`);
        return {
          strategyId: 'auto-fallback',
          executed: true,
          actions: [
            {
              type: 'failover',
              targetAssetId: target,
              estimatedImpact: 'high',
              payload: { mode: 'multi-cloud-drain' },
              runbook: 'runbooks/fallback.md',
            },
            {
              type: 'runbook',
              estimatedImpact: 'medium',
              payload: { link: 'runbooks/live-observability.md' },
            },
          ],
          notes: 'automatic fallback executed',
        };
      },
      cooldownMs: 1,
    };

    conductor.registerResponseStrategy(strategy);

    await conductor.scanAssets();
  });

  it('links discovery, anomaly defence, optimisation, and routing into a unified control loop', async () => {
    expect(conductor.listAssets()).toHaveLength(2);

    const baselineLatencies = [110, 108, 112, 115];
    for (const [index, value] of baselineLatencies.entries()) {
      await conductor.ingestHealthSignal({
        assetId: 'svc-alpha',
        metric: 'latency.p95',
        value,
        unit: 'ms',
        timestamp: new Date(Date.now() + index * 1000),
      });
    }

    await conductor.ingestHealthSignal({
      assetId: 'svc-alpha',
      metric: 'latency.p95',
      value: 420,
      unit: 'ms',
      timestamp: new Date(),
    });

    await conductor.ingestHealthSignal({
      assetId: 'svc-alpha',
      metric: 'cost.perHour',
      value: 28,
      timestamp: new Date(),
    });
    await conductor.ingestHealthSignal({
      assetId: 'svc-alpha',
      metric: 'error.rate',
      value: 0.11,
      timestamp: new Date(),
    });
    await conductor.ingestHealthSignal({
      assetId: 'svc-alpha',
      metric: 'saturation',
      value: 0.82,
      timestamp: new Date(),
    });

    await conductor.ingestHealthSignal({
      assetId: 'svc-beta',
      metric: 'latency.p95',
      value: 150,
      unit: 'ms',
      timestamp: new Date(),
    });
    await conductor.ingestHealthSignal({
      assetId: 'svc-beta',
      metric: 'cost.perHour',
      value: 18,
      timestamp: new Date(),
    });
    await conductor.ingestHealthSignal({
      assetId: 'svc-beta',
      metric: 'throughput',
      value: 210,
      timestamp: new Date(),
    });

    const incidents = conductor.getIncidents();
    expect(incidents.length).toBeGreaterThan(0);
    const actionable = incidents.find((incident) => incident.plans.length > 0);
    expect(actionable?.plans[0].actions[0].type).toBe('failover');
    expect(executed).toContain('svc-alpha->svc-beta');

    const recommendations = conductor.getOptimizationRecommendations();
    const alphaRecommendation = recommendations.find(
      (rec) => rec.assetId === 'svc-alpha',
    );
    expect(alphaRecommendation).toBeDefined();
    expect(alphaRecommendation?.actions).toContain('scale-out');

    const job: JobSpec = {
      id: 'job-1',
      type: 'incident-mitigation',
      priority: 'critical',
      requiredCapabilities: ['maestro-routing'],
      requirements: {
        regions: ['us-east-1'],
        complianceTags: ['soc2'],
        maxLatencyMs: 500,
      },
      metadata: { sensitive: true },
    };

    const plan = await conductor.routeJob(job);
    expect(plan.primary.assetId).toBe('svc-alpha');
    expect(
      plan.primary.reasoning.some((reason) => reason.includes('policy')),
    ).toBe(true);
    expect(plan.fallbacks.length).toBeLessThanOrEqual(1);
  });

  it('records narrative scorecards and augments recommended playbooks', () => {
    const recorded = conductor.recordNarrativeScorecard({
      campaignId: 'campaign-1',
      narrative: 'supply-chain disinfo',
      identification: 0.8,
      imitation: 0.7,
      amplification: 0.75,
      emotionalRisk: 0.72,
      recommendedPlaybooks: ['exposure-report'],
    });

    expect(recorded.recommendedPlaybooks).toContain('rapid-response-comms');
    expect(recorded.recommendedPlaybooks).toContain('media-literacy-boost');
    expect(conductor.listNarrativeScorecards()).toHaveLength(1);
  });
});
