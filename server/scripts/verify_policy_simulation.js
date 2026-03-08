"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const PolicySimulationService_js_1 = require("../src/services/policy/PolicySimulationService.js");
async function run() {
    console.log('Running Policy Simulation Verification...');
    const service = PolicySimulationService_js_1.PolicySimulationService.getInstance();
    const policy = {
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
    strict_1.default.equal(result.totalRuns, 3);
    strict_1.default.equal(result.allowed, 1, 'Should have 1 allowed run');
    strict_1.default.equal(result.approvalRequired, 1, 'Should have 1 approval required');
    strict_1.default.equal(result.blocked, 1, 'Should have 1 blocked run');
    const blockDetail = result.details.find((d) => d.runId === 'run-3');
    strict_1.default.ok(blockDetail);
    strict_1.default.equal(blockDetail.outcome, 'BLOCKED');
    strict_1.default.match(blockDetail.reason, /Exceeds token budget/);
    const approvalDetail = result.details.find((d) => d.runId === 'run-2');
    strict_1.default.ok(approvalDetail);
    strict_1.default.equal(approvalDetail.outcome, 'ALLOWED_WITH_OBLIGATION');
    strict_1.default.match(approvalDetail.reason, /High spend/);
    console.log('PASS: Simulation logic correct');
}
run().catch(err => {
    console.error(err);
    process.exit(1);
});
