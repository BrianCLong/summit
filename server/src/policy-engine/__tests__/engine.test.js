"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const engine_js_1 = require("../engine.js");
(0, vitest_1.describe)('Policy Auto-Tuning Engine', () => {
    const engine = new engine_js_1.ProposalEngine();
    engine.registerRule(new engine_js_1.DenyRateRule());
    engine.registerRule(new engine_js_1.BurstRule());
    (0, vitest_1.it)('DenyRateRule generates proposal for high denials', () => {
        const evidence = {
            id: 'ev-1',
            type: 'deny_spike',
            timestamp: new Date().toISOString(),
            source: 'audit-log',
            data: {
                subject: { id: 'service-a' },
                action: 'write',
                resource: 'db-prod',
                count: 100,
                reason: 'Insufficient permissions'
            }
        };
        const proposal = engine.generateProposal(evidence);
        (0, vitest_1.expect)(proposal).toBeTruthy();
        (0, vitest_1.expect)(proposal?.rationale).toBe('High volume of denials (100) detected for service-a. Proposing explicit block to mitigate potential attack.');
        (0, vitest_1.expect)(proposal?.proposedChanges[0].target).toBe('policy/governance-config.yaml');
        (0, vitest_1.expect)(proposal?.proposedChanges[0].operation).toBe('add');
    });
    (0, vitest_1.it)('BurstRule generates proposal for high RPS', () => {
        const evidence = {
            id: 'ev-2',
            type: 'burst_behavior',
            timestamp: new Date().toISOString(),
            source: 'metrics',
            data: {
                tenantId: 'tenant-x',
                service: 'api',
                rps: 150
            }
        };
        const proposal = engine.generateProposal(evidence);
        (0, vitest_1.expect)(proposal).toBeTruthy();
        (0, vitest_1.expect)(proposal?.rationale).toBe('Tenant tenant-x exceeded burst thresholds (150 RPS). Proposing specific quota limit.');
        (0, vitest_1.expect)(proposal?.proposedChanges[0].target).toBe('policy/governance-config.yaml');
    });
    (0, vitest_1.it)('Engine is deterministic', () => {
        const evidence = {
            id: 'ev-fixed',
            type: 'deny_spike',
            timestamp: '2025-01-01T00:00:00Z',
            source: 'audit-log',
            data: {
                subject: { id: 'service-b' },
                action: 'read',
                resource: 'cache',
                count: 60,
                reason: 'Insufficient permissions'
            }
        };
        const p1 = engine.generateProposal(evidence);
        const p2 = engine.generateProposal(evidence);
        (0, vitest_1.expect)(p1?.id).toBe(p2?.id);
    });
});
