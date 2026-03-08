"use strict";
// server/tests/resources.test.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const quota_manager_js_1 = __importDefault(require("../src/lib/resources/quota-manager.js"));
const budget_tracker_js_1 = require("../src/lib/resources/budget-tracker.js");
const types_js_1 = require("../src/lib/resources/types.js");
// Use a consistent tenantId for tests to ensure we are isolating state
const TENANT_ID = 'test-tenant';
(0, globals_1.describe)('Resource Management System', () => {
    (0, globals_1.beforeEach)(() => {
        budget_tracker_js_1.budgetTracker.removeAllListeners();
    });
    (0, globals_1.describe)('QuotaManager', () => {
        (0, globals_1.it)('returns the default FREE tier when no tenant override exists', () => {
            const quota = quota_manager_js_1.default.getQuotaForTenant(TENANT_ID);
            (0, globals_1.expect)(quota.tier).toBe('FREE');
            (0, globals_1.expect)(quota.requestsPerMinute).toBeGreaterThan(0);
        });
        (0, globals_1.it)('returns tier-specific quotas after setting a tenant tier', () => {
            quota_manager_js_1.default.setTenantTier(TENANT_ID, 'PRO');
            const quota = quota_manager_js_1.default.getQuotaForTenant(TENANT_ID);
            (0, globals_1.expect)(quota.tier).toBe('PRO');
            (0, globals_1.expect)(quota.requestsPerMinute).toBeGreaterThan(100);
        });
    });
    (0, globals_1.describe)('BudgetTracker', () => {
        (0, globals_1.it)('emits a threshold_reached event when alert thresholds are crossed', (done) => {
            budget_tracker_js_1.budgetTracker.setBudget(TENANT_ID, {
                domain: types_js_1.CostDomain.API_REQUEST,
                limit: 1000,
                period: 'monthly',
                currency: 'USD',
                alertThresholds: [0.5],
                hardStop: false,
            });
            budget_tracker_js_1.budgetTracker.on('threshold_reached', (alert) => {
                (0, globals_1.expect)(alert.tenantId).toBe(TENANT_ID);
                (0, globals_1.expect)(alert.domain).toBe(types_js_1.CostDomain.API_REQUEST);
                (0, globals_1.expect)(alert.threshold).toBe(0.5);
                done();
            });
            budget_tracker_js_1.budgetTracker.trackCost(TENANT_ID, types_js_1.CostDomain.API_REQUEST, 600, {
                operation: 'test',
            });
        });
    });
});
