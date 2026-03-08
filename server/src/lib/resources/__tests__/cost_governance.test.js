"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const budget_tracker_js_1 = require("../budget-tracker.js");
const types_js_1 = require("../types.js");
(0, globals_1.describe)('Cost Governance & FinOps', () => {
    const tenantId = 'test-tenant-finops';
    (0, globals_1.beforeEach)(() => {
        // Reset state? budgetTracker is a singleton, so we need to be careful.
        // In a real test suite we'd mock or have a reset method.
        // For this sprint, we'll just use a unique tenantId per test block or setup.
    });
    (0, globals_1.it)('should enforce hard stops when budget is exceeded', () => {
        // 1. Set a small budget
        budget_tracker_js_1.budgetTracker.setBudget(tenantId, {
            domain: types_js_1.CostDomain.AGENT_RUNS,
            limit: 10.0, // $10
            period: 'daily',
            currency: 'USD',
            alertThresholds: [0.5, 1.0],
            hardStop: true,
        });
        // 2. Spend within budget
        const allowed = budget_tracker_js_1.budgetTracker.checkBudget(tenantId, types_js_1.CostDomain.AGENT_RUNS, 5.0);
        (0, globals_1.expect)(allowed).toBe(true);
        budget_tracker_js_1.budgetTracker.trackCost(tenantId, types_js_1.CostDomain.AGENT_RUNS, 5.0);
        // 3. Try to overspend
        const allowed2 = budget_tracker_js_1.budgetTracker.checkBudget(tenantId, types_js_1.CostDomain.AGENT_RUNS, 6.0); // 5+6 = 11 > 10
        (0, globals_1.expect)(allowed2).toBe(false);
        // 4. Verify no cost was tracked for the blocked attempt (manual check needed in real app, here trackCost is separate)
    });
    (0, globals_1.it)('should calculate spending forecast', () => {
        const tenantIdForecast = 'test-tenant-forecast';
        globals_1.jest.useFakeTimers();
        const start = new Date('2024-01-01T00:00:00Z');
        globals_1.jest.setSystemTime(start);
        // Set budget
        budget_tracker_js_1.budgetTracker.setBudget(tenantIdForecast, {
            domain: types_js_1.CostDomain.AGENT_RUNS,
            limit: 100.0,
            period: 'monthly',
            currency: 'USD',
            alertThresholds: [],
            hardStop: false,
        });
        // Simulate spending: $10 spent in the first hour of a 30-day period
        // This is a huge burn rate, should forecast massive overspend.
        globals_1.jest.setSystemTime(new Date(start.getTime() + 60 * 60 * 1000));
        budget_tracker_js_1.budgetTracker.trackCost(tenantIdForecast, types_js_1.CostDomain.AGENT_RUNS, 10.0);
        const budget = budget_tracker_js_1.budgetTracker.getDomainBudget(tenantIdForecast, types_js_1.CostDomain.AGENT_RUNS);
        (0, globals_1.expect)(budget).toBeDefined();
        // Forecast should be roughly: (10 / elapsed) * total_period
        // Since execution is fast, elapsed is tiny, so forecast is huge.
        (0, globals_1.expect)(budget.forecastedSpending).toBeGreaterThan(100.0);
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('should emit alerts on thresholds', (done) => {
        const tenantIdAlert = 'test-tenant-alert';
        budget_tracker_js_1.budgetTracker.setBudget(tenantIdAlert, {
            domain: types_js_1.CostDomain.AGENT_RUNS,
            limit: 100.0,
            period: 'daily',
            currency: 'USD',
            alertThresholds: [0.5],
            hardStop: false,
        });
        budget_tracker_js_1.budgetTracker.once('threshold_reached', (payload) => {
            try {
                (0, globals_1.expect)(payload.tenantId).toBe(tenantIdAlert);
                (0, globals_1.expect)(payload.threshold).toBe(0.5);
                done();
            }
            catch (error) {
                done(error);
            }
        });
        // Spend 51%
        budget_tracker_js_1.budgetTracker.trackCost(tenantIdAlert, types_js_1.CostDomain.AGENT_RUNS, 51.0);
    });
});
