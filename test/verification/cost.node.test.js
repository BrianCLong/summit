"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const budget_tracker_js_1 = require("../../server/src/lib/resources/budget-tracker.js");
const types_js_1 = require("../../server/src/lib/resources/types.js");
(0, node_test_1.describe)('Cost Controls & Budget Enforcement', () => {
    let tracker;
    const tenantId = 'test-tenant-cost-1';
    (0, node_test_1.beforeEach)(() => {
        tracker = budget_tracker_js_1.BudgetTracker.getInstance();
        // Setup clean budget
        tracker.setBudget(tenantId, {
            domain: types_js_1.CostDomain.AGENT_RUNS,
            limit: 100,
            period: 'monthly',
            currency: 'USD',
            alertThresholds: [0.8, 1.0],
            hardStop: true
        });
    });
    (0, node_test_1.it)('should allow spending within budget', () => {
        const allowed = tracker.checkBudget(tenantId, types_js_1.CostDomain.AGENT_RUNS, 10);
        node_assert_1.default.strictEqual(allowed, true);
        tracker.trackCost(tenantId, types_js_1.CostDomain.AGENT_RUNS, 10);
        const report = tracker.getDomainBudget(tenantId, types_js_1.CostDomain.AGENT_RUNS);
        node_assert_1.default.strictEqual(report?.currentSpending, 10);
    });
    (0, node_test_1.it)('should enforce hard stop when budget exceeded', () => {
        // Burn the budget
        tracker.trackCost(tenantId, types_js_1.CostDomain.AGENT_RUNS, 95);
        // Check if next large request is blocked
        const allowed = tracker.checkBudget(tenantId, types_js_1.CostDomain.AGENT_RUNS, 10);
        node_assert_1.default.strictEqual(allowed, false, 'Should be blocked by hard stop');
    });
    (0, node_test_1.it)('should track attribution', () => {
        tracker.trackCost(tenantId, types_js_1.CostDomain.AGENT_RUNS, 5, {}, {
            agentId: 'agent-007',
            capability: 'search',
            tenantId
        });
        const costs = tracker.getAttributedCosts(tenantId);
        const lastCost = costs[costs.length - 1];
        node_assert_1.default.strictEqual(lastCost.attribution?.agentId, 'agent-007');
    });
});
