"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const budget_tracker_js_1 = require("../server/src/lib/resources/budget-tracker.js");
const types_js_1 = require("../server/src/lib/resources/types.js");
const fs_1 = __importDefault(require("fs"));
// Standard Workload Definition
// 100 Agent Runs
// 500 Coordination messages
// 1000 DB Writes
const TENANT_ID = 'benchmark-tenant';
async function runBenchmark() {
    console.log('Starting Cost Benchmark...');
    // Reset (conceptually) - Set budgets for ALL domains to ensure tracking
    budget_tracker_js_1.budgetTracker.setBudget(TENANT_ID, {
        domain: types_js_1.CostDomain.AGENT_RUNS,
        limit: 1000000,
        period: 'monthly',
        currency: 'USD',
        alertThresholds: []
    });
    budget_tracker_js_1.budgetTracker.setBudget(TENANT_ID, {
        domain: types_js_1.CostDomain.COORDINATION,
        limit: 1000000,
        period: 'monthly',
        currency: 'USD',
        alertThresholds: []
    });
    budget_tracker_js_1.budgetTracker.setBudget(TENANT_ID, {
        domain: types_js_1.CostDomain.WRITE_ACTIONS,
        limit: 1000000,
        period: 'monthly',
        currency: 'USD',
        alertThresholds: []
    });
    let totalCost = 0;
    // Simulate 100 Agent Runs (Cost: $0.10 each)
    for (let i = 0; i < 100; i++) {
        const cost = 0.10;
        budget_tracker_js_1.budgetTracker.trackCost(TENANT_ID, types_js_1.CostDomain.AGENT_RUNS, cost);
        totalCost += cost;
    }
    // Simulate 500 Coordination Messages (Cost: $0.001 each)
    for (let i = 0; i < 500; i++) {
        const cost = 0.001;
        budget_tracker_js_1.budgetTracker.trackCost(TENANT_ID, types_js_1.CostDomain.COORDINATION, cost);
        totalCost += cost;
    }
    // Simulate 1000 DB Writes (Cost: $0.05 each)
    for (let i = 0; i < 1000; i++) {
        const cost = 0.05;
        budget_tracker_js_1.budgetTracker.trackCost(TENANT_ID, types_js_1.CostDomain.WRITE_ACTIONS, cost);
        totalCost += cost;
    }
    const report = budget_tracker_js_1.budgetTracker.getTenantReport(TENANT_ID);
    // Calculate total explicitly from report to verify aggregation
    let aggregatedCost = 0;
    Object.values(report).forEach(b => {
        if (b)
            aggregatedCost += b.currentSpending;
    });
    const results = {
        timestamp: new Date().toISOString(),
        totalCost: aggregatedCost,
        breakdown: report
    };
    console.log(`Benchmark Complete. Total Cost: $${aggregatedCost.toFixed(4)}`);
    fs_1.default.writeFileSync('cost-benchmark-results.json', JSON.stringify(results, null, 2));
}
runBenchmark();
