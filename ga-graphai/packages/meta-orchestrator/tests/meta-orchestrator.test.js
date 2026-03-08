"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
class MockPricingFeed {
    signals;
    constructor(signals) {
        this.signals = signals;
    }
    setSignals(signals) {
        this.signals = signals;
    }
    async getPricingSignals() {
        return this.signals;
    }
}
class ScriptedExecutionAdapter {
    script = new Map();
    setResponse(provider, result) {
        const values = Array.isArray(result) ? result : [result];
        this.script.set(provider, values);
    }
    async execute(request) {
        const entries = this.script.get(request.decision.provider);
        if (!entries || entries.length === 0) {
            return {
                status: 'success',
                throughputPerMinute: request.stage.minThroughputPerMinute,
                cost: request.decision.expectedCost,
                errorRate: 0.01,
                logs: ['default-success'],
            };
        }
        const result = entries.shift();
        if (!result) {
            throw new Error('no scripted result');
        }
        this.script.set(request.decision.provider, entries);
        return result;
    }
}
(0, vitest_1.describe)('MetaOrchestrator', () => {
    let providers;
    let stage;
    let pricing;
    let pricingFeed;
    let execution;
    let auditTrail;
    (0, vitest_1.beforeEach)(() => {
        providers = [
            {
                name: 'aws',
                regions: ['us-east-1'],
                services: ['compute', 'ml'],
                reliabilityScore: 0.94,
                sustainabilityScore: 0.5,
                securityCertifications: ['fedramp', 'pci'],
                maxThroughputPerMinute: 140,
                baseLatencyMs: 70,
                policyTags: ['fedramp', 'pci'],
            },
            {
                name: 'azure',
                regions: ['eastus'],
                services: ['compute', 'ml'],
                reliabilityScore: 0.97,
                sustainabilityScore: 0.7,
                securityCertifications: ['fedramp', 'hipaa'],
                maxThroughputPerMinute: 120,
                baseLatencyMs: 65,
                policyTags: ['fedramp', 'hipaa'],
            },
            {
                name: 'oci',
                regions: ['us-phoenix-1'],
                services: ['compute'],
                reliabilityScore: 0.92,
                sustainabilityScore: 0.6,
                securityCertifications: ['iso'],
                maxThroughputPerMinute: 130,
                baseLatencyMs: 80,
                policyTags: ['iso'],
            },
        ];
        stage = {
            id: 'build-stage',
            name: 'Secure Build',
            requiredCapabilities: ['compute'],
            complianceTags: ['fedramp'],
            minThroughputPerMinute: 100,
            slaSeconds: 600,
            guardrail: {
                maxErrorRate: 0.05,
                recoveryTimeoutSeconds: 120,
            },
            fallbackStrategies: [
                { provider: 'aws', region: 'us-east-1', trigger: 'execution-failure' },
            ],
        };
        pricing = [
            {
                provider: 'aws',
                region: 'us-east-1',
                service: 'compute',
                pricePerUnit: 1.1,
                currency: 'USD',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'azure',
                region: 'eastus',
                service: 'compute',
                pricePerUnit: 0.9,
                currency: 'USD',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
        ];
        pricingFeed = new MockPricingFeed(pricing);
        execution = new ScriptedExecutionAdapter();
        auditTrail = [];
    });
    (0, vitest_1.it)('produces an explainable plan that favours cost and reliability', async () => {
        const orchestrator = new index_js_1.MetaOrchestrator({
            pipelineId: 'pipeline-x',
            providers,
            pricingFeed,
            execution,
            auditSink: {
                record: (entry) => {
                    auditTrail.push(entry);
                },
            },
            reasoningModel: new index_js_1.TemplateReasoningModel(),
        });
        const plan = await orchestrator.createPlan([stage]);
        (0, vitest_1.expect)(plan.steps[0].primary.provider).toBe('azure');
        (0, vitest_1.expect)(plan.steps[0].fallbacks[0].provider).toBe('aws');
        (0, vitest_1.expect)(plan.steps[0].explanation.narrative).toContain('Secure Build');
        (0, vitest_1.expect)(auditTrail.some((entry) => entry.category === 'plan')).toBe(true);
    });
    (0, vitest_1.it)('responds to pricing changes by switching providers', async () => {
        const orchestrator = new index_js_1.MetaOrchestrator({
            pipelineId: 'pipeline-x',
            providers,
            pricingFeed,
            execution,
            auditSink: { record: () => undefined },
            reasoningModel: new index_js_1.TemplateReasoningModel(),
        });
        const initialPlan = await orchestrator.createPlan([stage]);
        (0, vitest_1.expect)(initialPlan.steps[0].primary.provider).toBe('azure');
        pricingFeed.setSignals([
            {
                provider: 'aws',
                region: 'us-east-1',
                service: 'compute',
                pricePerUnit: 0.6,
                currency: 'USD',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'azure',
                region: 'eastus',
                service: 'compute',
                pricePerUnit: 1.9,
                currency: 'USD',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
        ]);
        const updatedPlan = await orchestrator.createPlan([stage]);
        (0, vitest_1.expect)(updatedPlan.steps[0].primary.provider).toBe('aws');
    });
    (0, vitest_1.it)('self-heals by invoking fallbacks and records rewards', async () => {
        execution.setResponse('azure', [
            {
                status: 'failure',
                throughputPerMinute: 40,
                cost: 120,
                errorRate: 0.2,
                logs: ['azure failure'],
            },
        ]);
        execution.setResponse('aws', [
            {
                status: 'success',
                throughputPerMinute: 130,
                cost: 80,
                errorRate: 0.01,
                logs: ['aws recovery'],
            },
        ]);
        const orchestrator = new index_js_1.MetaOrchestrator({
            pipelineId: 'pipeline-x',
            providers,
            pricingFeed,
            execution,
            auditSink: {
                record: (entry) => {
                    auditTrail.push(entry);
                },
            },
            reasoningModel: new index_js_1.TemplateReasoningModel(),
        });
        const outcome = await orchestrator.executePlan([stage], {
            commit: 'abc123',
        });
        (0, vitest_1.expect)(outcome.trace[0].status).toBe('recovered');
        (0, vitest_1.expect)(outcome.trace[0].provider).toBe('aws');
        (0, vitest_1.expect)(outcome.rewards[0].recovered).toBe(true);
        (0, vitest_1.expect)(outcome.rewards[0].observedThroughput).toBe(130);
        (0, vitest_1.expect)(auditTrail.some((entry) => entry.category === 'fallback')).toBe(true);
        (0, vitest_1.expect)(auditTrail.some((entry) => entry.category === 'reward-update')).toBe(true);
        const telemetry = orchestrator.deriveTelemetry(outcome);
        (0, vitest_1.expect)(telemetry.throughputPerMinute).toBe(130);
        (0, vitest_1.expect)(telemetry.selfHealingRate).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('leverages capability matrix and fairness policy for transparent selection', async () => {
        const capabilityMatrix = {
            updatedAt: new Date().toISOString(),
            entries: [
                {
                    provider: 'aws',
                    region: 'us-east-1',
                    capability: 'compute',
                    throughputPerMinute: 160,
                    latencyMs: 45,
                    costPerUnit: 1,
                },
                {
                    provider: 'azure',
                    region: 'eastus',
                    capability: 'compute',
                    throughputPerMinute: 120,
                    latencyMs: 90,
                    costPerUnit: 0.9,
                },
            ],
        };
        const orchestrator = new index_js_1.MetaOrchestrator({
            pipelineId: 'pipeline-x',
            providers,
            pricingFeed,
            execution,
            auditSink: { record: (entry) => auditTrail.push(entry) },
            reasoningModel: new index_js_1.TemplateReasoningModel(),
            capabilityMatrix,
            fairness: { minDiversityRatio: 0.5 },
        });
        const plan = await orchestrator.createPlan([stage]);
        (0, vitest_1.expect)(plan.steps[0].primary.provider).toBe('aws');
        const governance = plan.metadata.governance;
        (0, vitest_1.expect)(governance.some((event) => event.kind === 'explanation')).toBe(true);
        (0, vitest_1.expect)(plan.metadata.fairness.compliant).toBe(true);
    });
    (0, vitest_1.it)('applies decision-tree policies for urgent data profiles', async () => {
        const policy = {
            id: 'policy-urgency',
            dataTypes: ['stream'],
            urgencies: ['high'],
            costSensitivity: 'medium',
            preferredModules: ['aws'],
            rationale: 'prefer AWS for high urgency streaming workloads',
        };
        const customProviders = [
            {
                name: 'aws',
                regions: ['us-east-1'],
                services: ['compute'],
                reliabilityScore: 0.91,
                sustainabilityScore: 0.52,
                securityCertifications: ['fedramp'],
                maxThroughputPerMinute: 100,
                baseLatencyMs: 60,
                policyTags: ['fedramp'],
            },
            {
                name: 'azure',
                regions: ['eastus'],
                services: ['compute'],
                reliabilityScore: 0.93,
                sustainabilityScore: 0.55,
                securityCertifications: ['fedramp'],
                maxThroughputPerMinute: 100,
                baseLatencyMs: 55,
                policyTags: ['fedramp'],
            },
        ];
        const policyPricing = [
            {
                provider: 'aws',
                region: 'us-east-1',
                service: 'compute',
                pricePerUnit: 0.85,
                currency: 'USD',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
            {
                provider: 'azure',
                region: 'eastus',
                service: 'compute',
                pricePerUnit: 0.85,
                currency: 'USD',
                unit: 'per-minute',
                effectiveAt: new Date().toISOString(),
            },
        ];
        const policyMatrix = {
            updatedAt: new Date().toISOString(),
            entries: [
                {
                    provider: 'aws',
                    region: 'us-east-1',
                    capability: 'compute',
                    throughputPerMinute: 100,
                    latencyMs: 55,
                    costPerUnit: 0.85,
                },
                {
                    provider: 'azure',
                    region: 'eastus',
                    capability: 'compute',
                    throughputPerMinute: 100,
                    latencyMs: 70,
                    costPerUnit: 0.85,
                },
            ],
        };
        const policyStage = {
            ...stage,
            id: 'stream-stage',
            dataType: 'stream',
            urgency: 'high',
            costSensitivity: 'medium',
        };
        const policyOrchestrator = new index_js_1.MetaOrchestrator({
            pipelineId: 'pipeline-policy',
            providers: customProviders,
            pricingFeed: new MockPricingFeed(policyPricing),
            execution,
            auditSink: { record: (entry) => auditTrail.push(entry) },
            reasoningModel: new index_js_1.TemplateReasoningModel(),
            decisionPolicies: [policy],
            capabilityMatrix: policyMatrix,
        });
        const plan = await policyOrchestrator.createPlan([policyStage]);
        (0, vitest_1.expect)(plan.steps[0].primary.provider).toBe('aws');
        const governance = plan.metadata.governance;
        (0, vitest_1.expect)(governance.some((event) => event.kind === 'selection' &&
            event.details.policy?.id === 'policy-urgency')).toBe(true);
    });
});
