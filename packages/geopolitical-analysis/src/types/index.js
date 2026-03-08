"use strict";
/**
 * Geopolitical Analysis Types
 * @module @intelgraph/geopolitical-analysis/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeHorizon = exports.ConfidenceLevel = exports.RiskLevel = void 0;
/**
 * Risk severity levels for all indicators
 */
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "LOW";
    RiskLevel["MODERATE"] = "MODERATE";
    RiskLevel["HIGH"] = "HIGH";
    RiskLevel["CRITICAL"] = "CRITICAL";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
/**
 * Confidence level in the analysis
 */
var ConfidenceLevel;
(function (ConfidenceLevel) {
    ConfidenceLevel["LOW"] = "LOW";
    ConfidenceLevel["MEDIUM"] = "MEDIUM";
    ConfidenceLevel["HIGH"] = "HIGH";
    ConfidenceLevel["VERY_HIGH"] = "VERY_HIGH";
})(ConfidenceLevel || (exports.ConfidenceLevel = ConfidenceLevel = {}));
/**
 * Time horizon for predictions and analysis
 */
var TimeHorizon;
(function (TimeHorizon) {
    TimeHorizon["IMMEDIATE"] = "IMMEDIATE";
    TimeHorizon["SHORT_TERM"] = "SHORT_TERM";
    TimeHorizon["MEDIUM_TERM"] = "MEDIUM_TERM";
    TimeHorizon["LONG_TERM"] = "LONG_TERM";
})(TimeHorizon || (exports.TimeHorizon = TimeHorizon = {}));
