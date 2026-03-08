"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const maestro_conductor_1 = require("../src/maestro-conductor");
const common_types_1 = require("@ga-graphai/common-types");
const assetAlpha = {
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
const assetBeta = {
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
(0, vitest_1.describe)('MaestroConductor meta-agent', () => {
    let conductor;
    let assets;
    const executed = [];
    let events;
    let eventTransport;
    (0, vitest_1.beforeEach)(async () => {
        assets = [assetAlpha, assetBeta];
        executed.length = 0;
        eventTransport = vitest_1.vi.fn();
        events = new common_types_1.StructuredEventEmitter({ transport: eventTransport });
        const provider = {
            id: 'stub',
            description: 'stub discovery',
            async scan() {
                return assets;
            },
        };
        conductor = new maestro_conductor_1.MaestroConductor({
            anomaly: { windowSize: 6, minSamples: 4, zThreshold: 1.2 },
            selfHealing: { defaultCooldownMs: 1 },
            optimizer: {
                windowSize: 12,
                latencyThresholdMs: 200,
                errorRateThreshold: 0.08,
                saturationThreshold: 0.7,
            },
            jobRouter: { latencyWeight: 0.4 },
            events,
        });
        conductor.registerDiscoveryProvider(provider);
        const policyHook = {
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
        const strategy = {
            id: 'auto-fallback',
            description: 'failover to paired service and launch runbook',
            supports: (asset) => Boolean(asset.metadata?.fallback),
            shouldTrigger: (context) => context.anomaly.severity !== 'low',
            async execute(context) {
                const target = context.asset.metadata?.fallback;
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
    (0, vitest_1.it)('links discovery, anomaly defence, optimisation, and routing into a unified control loop', async () => {
        (0, vitest_1.expect)(conductor.listAssets()).toHaveLength(2);
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
        (0, vitest_1.expect)(incidents.length).toBeGreaterThan(0);
        const actionable = incidents.find((incident) => incident.plans.length > 0);
        (0, vitest_1.expect)(actionable?.plans[0].actions[0].type).toBe('failover');
        (0, vitest_1.expect)(executed).toContain('svc-alpha->svc-beta');
        const recommendations = conductor.getOptimizationRecommendations();
        const alphaRecommendation = recommendations.find((rec) => rec.assetId === 'svc-alpha');
        (0, vitest_1.expect)(alphaRecommendation).toBeDefined();
        (0, vitest_1.expect)(alphaRecommendation?.actions).toContain('scale-out');
        const job = {
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
        (0, vitest_1.expect)(plan.primary.assetId).toBe('svc-alpha');
        (0, vitest_1.expect)(plan.primary.reasoning.some((reason) => reason.includes('policy'))).toBe(true);
        (0, vitest_1.expect)(plan.primary.policyDecisions).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                hookId: 'sensitivity',
                allowed: true,
                reason: 'policy:approved',
            }),
        ]));
        (0, vitest_1.expect)(plan.fallbacks.length).toBeLessThanOrEqual(1);
    });
    (0, vitest_1.it)('emits structured incidents when anomalies are detected', async () => {
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
            value: 500,
            unit: 'ms',
            timestamp: new Date(),
        });
        (0, vitest_1.expect)(eventTransport).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ name: 'summit.incident.detected' }));
    });
});
