"use strict";
/**
 * Financial Compliance Module
 *
 * Comprehensive financial compliance, surveillance, risk analytics,
 * fraud detection, market data, and regulatory reporting capabilities.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegulatoryReportingService = exports.MarketDataService = exports.FraudDetectionService = exports.RiskAnalyticsService = exports.TradeSurveillanceService = void 0;
exports.createFinancialServices = createFinancialServices;
// Types
__exportStar(require("./types.js"), exports);
// Services
var TradeSurveillanceService_js_1 = require("./surveillance/TradeSurveillanceService.js");
Object.defineProperty(exports, "TradeSurveillanceService", { enumerable: true, get: function () { return TradeSurveillanceService_js_1.TradeSurveillanceService; } });
var RiskAnalyticsService_js_1 = require("./risk/RiskAnalyticsService.js");
Object.defineProperty(exports, "RiskAnalyticsService", { enumerable: true, get: function () { return RiskAnalyticsService_js_1.RiskAnalyticsService; } });
var FraudDetectionService_js_1 = require("./fraud/FraudDetectionService.js");
Object.defineProperty(exports, "FraudDetectionService", { enumerable: true, get: function () { return FraudDetectionService_js_1.FraudDetectionService; } });
var MarketDataService_js_1 = require("./market/MarketDataService.js");
Object.defineProperty(exports, "MarketDataService", { enumerable: true, get: function () { return MarketDataService_js_1.MarketDataService; } });
var RegulatoryReportingService_js_1 = require("./reporting/RegulatoryReportingService.js");
Object.defineProperty(exports, "RegulatoryReportingService", { enumerable: true, get: function () { return RegulatoryReportingService_js_1.RegulatoryReportingService; } });
const TradeSurveillanceService_js_2 = require("./surveillance/TradeSurveillanceService.js");
const RiskAnalyticsService_js_2 = require("./risk/RiskAnalyticsService.js");
const FraudDetectionService_js_2 = require("./fraud/FraudDetectionService.js");
const MarketDataService_js_2 = require("./market/MarketDataService.js");
const RegulatoryReportingService_js_2 = require("./reporting/RegulatoryReportingService.js");
/**
 * Create all financial services with shared database connection
 */
function createFinancialServices(pg, config) {
    return {
        surveillance: new TradeSurveillanceService_js_2.TradeSurveillanceService(pg, config?.surveillance),
        risk: new RiskAnalyticsService_js_2.RiskAnalyticsService(pg, config?.risk),
        fraud: new FraudDetectionService_js_2.FraudDetectionService(pg, config?.fraud),
        market: new MarketDataService_js_2.MarketDataService(pg, config?.market),
        reporting: new RegulatoryReportingService_js_2.RegulatoryReportingService(pg, config?.reporting),
    };
}
