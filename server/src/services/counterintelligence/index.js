"use strict";
/**
 * Counterintelligence Platform
 *
 * Comprehensive suite of services for detecting, analyzing, and responding to
 * insider threats, foreign intelligence activities, and deception operations.
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
exports.anomalyCorrelationService = exports.deceptionDetectionEngine = exports.threatActorModelingService = void 0;
__exportStar(require("./ThreatActorModelingService.js"), exports);
__exportStar(require("./DeceptionDetectionEngine.js"), exports);
__exportStar(require("./AnomalyCorrelationService.js"), exports);
// Re-export singleton instances
var ThreatActorModelingService_js_1 = require("./ThreatActorModelingService.js");
Object.defineProperty(exports, "threatActorModelingService", { enumerable: true, get: function () { return ThreatActorModelingService_js_1.threatActorModelingService; } });
var DeceptionDetectionEngine_js_1 = require("./DeceptionDetectionEngine.js");
Object.defineProperty(exports, "deceptionDetectionEngine", { enumerable: true, get: function () { return DeceptionDetectionEngine_js_1.deceptionDetectionEngine; } });
var AnomalyCorrelationService_js_1 = require("./AnomalyCorrelationService.js");
Object.defineProperty(exports, "anomalyCorrelationService", { enumerable: true, get: function () { return AnomalyCorrelationService_js_1.anomalyCorrelationService; } });
