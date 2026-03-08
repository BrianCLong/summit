"use strict";
/**
 * Cost Guard Module
 *
 * Provides cost budgeting and rate limiting infrastructure that can be
 * dropped into any service without modifying business logic.
 *
 * Features:
 * - Per-tenant budget tracking (daily/monthly)
 * - Query complexity-based cost calculation
 * - Rate limiting based on cost thresholds
 * - Automatic cost recording and reporting
 * - Clear error messages when budgets exceeded
 *
 * @module cost-guard
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostGuardService = exports.CostGuardError = exports.costGuard = exports.withCostGuardExport = exports.withCostGuardDB = exports.withCostGuardResolver = exports.withCostGuard = exports.costRecordingMiddleware = exports.costGuardMiddleware = void 0;
exports.killSlowQueries = killSlowQueries;
var middleware_js_1 = require("./middleware.js");
Object.defineProperty(exports, "costGuardMiddleware", { enumerable: true, get: function () { return middleware_js_1.costGuardMiddleware; } });
Object.defineProperty(exports, "costRecordingMiddleware", { enumerable: true, get: function () { return middleware_js_1.costRecordingMiddleware; } });
Object.defineProperty(exports, "withCostGuard", { enumerable: true, get: function () { return middleware_js_1.withCostGuard; } });
Object.defineProperty(exports, "withCostGuardResolver", { enumerable: true, get: function () { return middleware_js_1.withCostGuardResolver; } });
Object.defineProperty(exports, "withCostGuardDB", { enumerable: true, get: function () { return middleware_js_1.withCostGuardDB; } });
Object.defineProperty(exports, "withCostGuardExport", { enumerable: true, get: function () { return middleware_js_1.withCostGuardExport; } });
Object.defineProperty(exports, "costGuard", { enumerable: true, get: function () { return middleware_js_1.costGuard; } });
Object.defineProperty(exports, "CostGuardError", { enumerable: true, get: function () { return middleware_js_1.CostGuardError; } });
Object.defineProperty(exports, "CostGuardService", { enumerable: true, get: function () { return middleware_js_1.CostGuardService; } });
// Stub for slow query killer
function killSlowQueries(thresholdMs = 30000) {
    // In a real implementation, this would query pg_stat_activity and terminate backends
    // or use Neo4j's dbms.listQueries and dbms.killQuery
    console.log(`[CostGuard] Scanning for queries slower than ${thresholdMs}ms...`);
    // Mock finding 0 queries
    return Promise.resolve(0);
}
