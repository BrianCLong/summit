"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const multi_region_readiness_js_1 = require("../src/multi-region-readiness.js");
const baseConfig = {
    regions: [
        {
            name: 'us-east',
            tier: 'gold',
            primaryWrite: true,
            followerReads: true,
            dnsWeight: 60,
            failoverTargets: ['eu-west'],
            capacityBuffer: 'N+2',
            clockSkewMs: 20,
            slo: {
                readP95Ms: 320,
                writeP95Ms: 650,
                subscriptionP95Ms: 200,
                graphOneHopMs: 280,
                graphThreeHopMs: 1100,
                ingestThroughputPerPod: 1500,
                ingestLatencyP95Ms: 80,
            },
            costCaps: { infra: 18000, llm: 5000, alertPercent: 80 },
            residencyTags: ['federal', 'financial'],
            kmsRoot: true,
            opaEnabled: true,
            mtlsEnabled: true,
        },
        {
            name: 'eu-west',
            tier: 'gold',
            primaryWrite: false,
            followerReads: true,
            dnsWeight: 40,
            failoverTargets: ['us-east'],
            capacityBuffer: 'N+1',
            clockSkewMs: 15,
            slo: {
                readP95Ms: 330,
                writeP95Ms: 680,
                subscriptionP95Ms: 210,
                graphOneHopMs: 290,
                graphThreeHopMs: 1150,
                ingestThroughputPerPod: 1200,
                ingestLatencyP95Ms: 90,
            },
            costCaps: { infra: 18000, llm: 5000, alertPercent: 80 },
            residencyTags: ['eu'],
            kmsRoot: true,
            opaEnabled: true,
            mtlsEnabled: true,
        },
    ],
    residencyRules: [
        {
            residencyLabel: 'federal',
            allowedRegions: ['us-east'],
            primaryWriteRegion: 'us-east',
            purposes: ['analysis', 'storage'],
        },
        {
            residencyLabel: 'eu',
            allowedRegions: ['eu-west'],
            primaryWriteRegion: 'eu-west',
            purposes: ['analysis', 'storage'],
        },
    ],
    replication: {
        strategy: 'async-streams',
        conflictResolution: 'crdt',
        signedLedger: true,
        deletionSemantics: 'region-scoped',
        backoutSupported: true,
    },
    ingest: {
        adapters: ['object', 'http', 'bus'],
        privacyFilters: true,
        residencyGatekeeper: true,
        dlqEnabled: true,
        replaySupported: true,
        burnAlertsEnabled: true,
    },
    graph: {
        regionTagsEnforced: true,
        constraintsPersisted: true,
        readReplicasPerRegion: true,
        backupScheduleMinutes: 30,
        healthProbes: true,
        auditSubgraph: true,
    },
    apiEdge: {
        regionAwareSchema: true,
        queryCostGuard: true,
        persistedQueries: true,
        rateLimitsPerRegion: true,
        cacheHitTargetPercent: 75,
        subscriptionFanoutP95Ms: 200,
        residencyGate: true,
    },
    traffic: {
        healthProbes: true,
        circuitBreakers: true,
        idempotentRetries: true,
        dataFreezeSupported: true,
        automationEnabled: true,
    },
    observability: {
        sloDashboards: true,
        syntheticProbes: true,
        traceSamplingPercent: 20,
        costDashboards: true,
        surgeBudgets: true,
        alertHygiene: true,
    },
    cicd: {
        overlaysEnabled: true,
        policySimulation: true,
        postDeployValidation: true,
        evidenceBundles: true,
        sbomEnabled: true,
        oneClickRevert: true,
    },
    customer: {
        runbooksAvailable: true,
        migrationGuides: true,
        slaPerRegion: true,
        benchmarksPublished: true,
        feedbackFunnel: true,
    },
    predictiveRouting: {
        enabled: true,
        residencyAwareEdgeWasm: true,
        autonomousDrillScheduler: true,
    },
};
(0, vitest_1.describe)('MultiRegionReadiness', () => {
    (0, vitest_1.it)('validates configuration against blueprint controls', () => {
        const readiness = new multi_region_readiness_js_1.MultiRegionReadiness({
            ...baseConfig,
            regions: [
                {
                    ...baseConfig.regions[0],
                    slo: { ...baseConfig.regions[0].slo, readP95Ms: 500 },
                },
            ],
        });
        const issues = readiness.validateConfig();
        (0, vitest_1.expect)(issues.some((issue) => issue.code === 'slo.read.us-east')).toBe(true);
        (0, vitest_1.expect)(issues.some((issue) => issue.severity === 'error')).toBe(true);
    });
    (0, vitest_1.it)('denies out-of-residency writes and requires failover targets', () => {
        const readiness = new multi_region_readiness_js_1.MultiRegionReadiness(baseConfig);
        const request = {
            action: 'write',
            region: 'eu-west',
            residencyLabel: 'federal',
            purpose: 'analysis',
            environment: 'prod',
        };
        const decision = readiness.evaluateRequest(request);
        (0, vitest_1.expect)(decision.allowed).toBe(false);
        (0, vitest_1.expect)(decision.reasons).toContain('deny:residency-block');
        (0, vitest_1.expect)(decision.reasons).toContain('deny:primary-write-only');
    });
    (0, vitest_1.it)('permits compliant reads and emits obligations for sensitive data', () => {
        const readiness = new multi_region_readiness_js_1.MultiRegionReadiness(baseConfig);
        const request = {
            action: 'read',
            region: 'us-east',
            residencyLabel: 'federal',
            purpose: 'analysis',
            environment: 'prod',
            dataClasses: ['production-PII'],
            latencyMs: 200,
        };
        const decision = readiness.evaluateRequest(request);
        (0, vitest_1.expect)(decision.allowed).toBe(true);
        (0, vitest_1.expect)(decision.obligations).toContain('apply-privacy-filter');
        (0, vitest_1.expect)(decision.reasons).toEqual(['allow:compliant']);
    });
    (0, vitest_1.it)('raises cost guardrails when nearing caps', () => {
        const readiness = new multi_region_readiness_js_1.MultiRegionReadiness(baseConfig);
        const request = {
            action: 'read',
            region: 'us-east',
            residencyLabel: 'federal',
            purpose: 'analysis',
            environment: 'prod',
            estimatedInfraCost: 15000,
            latencyMs: 200,
        };
        const decision = readiness.evaluateRequest(request);
        (0, vitest_1.expect)(decision.allowed).toBe(true);
        (0, vitest_1.expect)(decision.reasons.some((reason) => reason.includes('cost'))).toBe(true);
        (0, vitest_1.expect)(decision.obligations).toContain('emit-finops-alert');
    });
});
