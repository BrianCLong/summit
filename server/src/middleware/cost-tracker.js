"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.costTracker = void 0;
const budget_tracker_js_1 = require("../lib/resources/budget-tracker.js");
const types_js_1 = require("../lib/resources/types.js");
const budgetTracker = budget_tracker_js_1.BudgetTracker.getInstance();
// Unit costs (in micro-USD)
const COST_PER_REQUEST = 0.000001;
const COST_PER_MS_COMPUTE = 0.00002 / 1000;
const costTracker = (req, res, next) => {
    const start = process.hrtime();
    const tenantId = req.user?.tenantId || 'anonymous'; // Fallback for now
    // Pre-Execution Check
    // We estimate a minimal cost for the request itself
    const estimatedCost = COST_PER_REQUEST;
    // Hard Stop Check
    const allowed = budgetTracker.checkBudget(tenantId, types_js_1.CostDomain.API_REQUEST, estimatedCost);
    if (!allowed) {
        res.status(402).json({
            error: 'Budget Exceeded',
            message: 'You have exceeded your API request budget.',
            domain: types_js_1.CostDomain.API_REQUEST
        });
        return;
    }
    // Hook into response finish to calculate actual duration cost
    res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const durationMs = (seconds * 1000) + (nanoseconds / 1e6);
        // Calculate total cost
        const computeCost = durationMs * COST_PER_MS_COMPUTE;
        const totalCost = COST_PER_REQUEST + computeCost;
        // Track the realized cost
        budgetTracker.trackCost(tenantId, types_js_1.CostDomain.API_REQUEST, totalCost, {
            method: req.method,
            path: req.path,
            durationMs,
            statusCode: res.statusCode
        });
    });
    next();
};
exports.costTracker = costTracker;
