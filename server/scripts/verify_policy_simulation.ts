import assert from 'node:assert/strict';
import { PolicySimulationService } from '../src/services/policy/PolicySimulationService.js';
import { EnterprisePolicy } from '../src/services/policy/types.js';

async function run() {
    console.log('Running Policy Simulation Verification...');
    const service = PolicySimulationService.getInstance();

    const policy: EnterprisePolicy = {
        metadata: { name: 'Budget Limit', author: 'admin@test.com', version: '1.0' },
        scope: {},
        capabilities: [],
        approvals: [
            { triggerEvent: 'SPEND_THRESHOLD', thresholdValue: 10, requiredApproverRoles: ['ADMIN'], autoExpireHours: 24 }
        ],
        budgets: {
            maxTokensPerRequest: 1000
        }
    };

    const historicalRuns = [
        { id: 'run-1', cost: 5, usage: { totalTokens: 500 }, tools: [] }, // Allowed
        { id: 'run-2', cost: 15, usage: { totalTokens: 500 }, tools: [] }, // Needs Approval (Cost > 10)
        { id: 'run-3', cost: 5, usage: { totalTokens: 1500 }, tools: [] }, // Blocked (Tokens > 1000)
    ];

    console.log('Test: Simulate Budget & Approvals');
    const result = await service.simulate(policy, historicalRuns);

    assert.equal(result.totalRuns, 3);
    assert.equal(result.allowed, 1, 'Should have 1 allowed run');
    assert.equal(result.approvalRequired, 1, 'Should have 1 approval required');
    assert.equal(result.blocked, 1, 'Should have 1 blocked run');

    const blockDetail = result.details.find((d: any) => d.runId === 'run-3');
    assert.ok(blockDetail);
    assert.equal(blockDetail.outcome, 'BLOCKED');
    assert.match(blockDetail.reason, /Exceeds token budget/);

    const approvalDetail = result.details.find((d: any) => d.runId === 'run-2');
    assert.ok(approvalDetail);
    assert.equal(approvalDetail.outcome, 'ALLOWED_WITH_OBLIGATION');
    assert.match(approvalDetail.reason, /High spend/);

    console.log('PASS: Simulation logic correct');
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
