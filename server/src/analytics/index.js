"use strict";
/**
 * Analytics Module
 *
 * AI-powered analytics for anomaly detection, policy optimization,
 * and compliance prediction.
 *
 * SOC 2 Controls: CC3.1 (Risk Assessment), CC4.1 (Monitoring), CC7.2 (Detection)
 *
 * @module analytics
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
exports.getEvidenceQualityScorer = exports.EvidenceQualityScorer = exports.getRemediationPrioritizer = exports.RemediationPrioritizer = exports.getGapPredictionService = exports.GapPredictionService = exports.getCompliancePredictionEngine = exports.CompliancePredictionEngine = exports.getAnomalyDetectionService = exports.AnomalyDetectionService = void 0;
// Anomaly Detection
var AnomalyDetectionService_js_1 = require("./AnomalyDetectionService.js");
Object.defineProperty(exports, "AnomalyDetectionService", { enumerable: true, get: function () { return AnomalyDetectionService_js_1.AnomalyDetectionService; } });
Object.defineProperty(exports, "getAnomalyDetectionService", { enumerable: true, get: function () { return AnomalyDetectionService_js_1.getAnomalyDetectionService; } });
// Policy Analytics
__exportStar(require("./policy/index.js"), exports);
// Compliance Analytics
// Note: RiskFactor is already exported from policy/index.ts, so we exclude it from compliance
var index_js_1 = require("./compliance/index.js");
Object.defineProperty(exports, "CompliancePredictionEngine", { enumerable: true, get: function () { return index_js_1.CompliancePredictionEngine; } });
Object.defineProperty(exports, "getCompliancePredictionEngine", { enumerable: true, get: function () { return index_js_1.getCompliancePredictionEngine; } });
Object.defineProperty(exports, "GapPredictionService", { enumerable: true, get: function () { return index_js_1.GapPredictionService; } });
Object.defineProperty(exports, "getGapPredictionService", { enumerable: true, get: function () { return index_js_1.getGapPredictionService; } });
Object.defineProperty(exports, "RemediationPrioritizer", { enumerable: true, get: function () { return index_js_1.RemediationPrioritizer; } });
Object.defineProperty(exports, "getRemediationPrioritizer", { enumerable: true, get: function () { return index_js_1.getRemediationPrioritizer; } });
Object.defineProperty(exports, "EvidenceQualityScorer", { enumerable: true, get: function () { return index_js_1.EvidenceQualityScorer; } });
Object.defineProperty(exports, "getEvidenceQualityScorer", { enumerable: true, get: function () { return index_js_1.getEvidenceQualityScorer; } });
