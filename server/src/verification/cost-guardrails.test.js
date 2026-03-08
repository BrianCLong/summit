"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const budget_tracker_js_1 = require("../lib/resources/budget-tracker.js");
const types_js_1 = require("../lib/resources/types.js");
async function verifyBudgetEnforcement() {
    const tracker = budget_tracker_js_1.BudgetTracker.getInstance();
    const tenantId = 'test-tenant-cost-v1';
    // 1. Set a small budget
    const config = {
        domain: types_js_1.CostDomain.API_REQUEST,
        limit: 0.000005, // very small limit (enough for 5 requests)
        period: 'daily',
        currency: 'USD',
        alertThresholds: [0.5, 0.8, 1.0],
        hardStop: false,
    };
    tracker.setBudget(tenantId, config);
    console.log('Budget set:', config);
    // 2. Perform requests within budget
    const costPerReq = 0.000001;
    // Req 1
    assert_1.default.ok(tracker.checkBudget(tenantId, types_js_1.CostDomain.API_REQUEST, costPerReq), 'Req 1 should be allowed');
    tracker.trackCost(tenantId, types_js_1.CostDomain.API_REQUEST, costPerReq);
    console.log('Req 1: Allowed');
    // Req 2
    assert_1.default.ok(tracker.checkBudget(tenantId, types_js_1.CostDomain.API_REQUEST, costPerReq), 'Req 2 should be allowed');
    tracker.trackCost(tenantId, types_js_1.CostDomain.API_REQUEST, costPerReq);
    console.log('Req 2: Allowed');
    // Req 3
    assert_1.default.ok(tracker.checkBudget(tenantId, types_js_1.CostDomain.API_REQUEST, costPerReq), 'Req 3 should be allowed');
    tracker.trackCost(tenantId, types_js_1.CostDomain.API_REQUEST, costPerReq);
    console.log('Req 3: Allowed');
    // Req 4
    assert_1.default.ok(tracker.checkBudget(tenantId, types_js_1.CostDomain.API_REQUEST, costPerReq), 'Req 4 should be allowed');
    tracker.trackCost(tenantId, types_js_1.CostDomain.API_REQUEST, costPerReq);
    console.log('Req 4: Allowed');
    // Req 5 (At Limit)
    // current = 4 * 1 = 4. limit = 5. req = 1. 4+1 <= 5. Allowed.
    assert_1.default.ok(tracker.checkBudget(tenantId, types_js_1.CostDomain.API_REQUEST, costPerReq), 'Req 5 should be allowed');
    tracker.trackCost(tenantId, types_js_1.CostDomain.API_REQUEST, costPerReq);
    console.log('Req 5: Allowed');
    // Req 6 (Over Limit)
    // current = 5. limit = 5. req = 1. 5+1 > 5. Denied.
    const allowed = tracker.checkBudget(tenantId, types_js_1.CostDomain.API_REQUEST, costPerReq);
    assert_1.default.strictEqual(allowed, false, 'Req 6 should be DENIED');
    console.log('Req 6: Denied (Correctly)');
    console.log('Verification Successful: Budget Enforcement working.');
}
verifyBudgetEnforcement().catch(err => {
    console.error('Verification Failed:', err);
    process.exit(1);
});
