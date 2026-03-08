"use strict";
/**
 * Marketplace Module
 *
 * Plugin marketplace infrastructure with 70/30 revenue sharing,
 * Stripe Connect payouts, and usage-based billing.
 *
 * SOC 2 Controls: CC6.7 (Financial Processing), CC7.1 (Billing Operations)
 *
 * @module marketplace
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsageTrackingService = exports.UsageTrackingService = exports.getPayoutService = exports.PayoutService = exports.getRevenueShareService = exports.RevenueShareService = void 0;
var RevenueShareService_js_1 = require("./RevenueShareService.js");
Object.defineProperty(exports, "RevenueShareService", { enumerable: true, get: function () { return RevenueShareService_js_1.RevenueShareService; } });
Object.defineProperty(exports, "getRevenueShareService", { enumerable: true, get: function () { return RevenueShareService_js_1.getRevenueShareService; } });
var PayoutService_js_1 = require("./PayoutService.js");
Object.defineProperty(exports, "PayoutService", { enumerable: true, get: function () { return PayoutService_js_1.PayoutService; } });
Object.defineProperty(exports, "getPayoutService", { enumerable: true, get: function () { return PayoutService_js_1.getPayoutService; } });
var UsageTrackingService_js_1 = require("./UsageTrackingService.js");
Object.defineProperty(exports, "UsageTrackingService", { enumerable: true, get: function () { return UsageTrackingService_js_1.UsageTrackingService; } });
Object.defineProperty(exports, "getUsageTrackingService", { enumerable: true, get: function () { return UsageTrackingService_js_1.getUsageTrackingService; } });
