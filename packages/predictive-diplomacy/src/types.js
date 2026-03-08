"use strict";
/**
 * Predictive Diplomacy and Forecasting Types
 * Advanced prediction and forecasting for diplomatic outcomes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Confidence = exports.PredictionTimeframe = exports.PredictionType = void 0;
var PredictionType;
(function (PredictionType) {
    PredictionType["RELATIONSHIP_TRAJECTORY"] = "RELATIONSHIP_TRAJECTORY";
    PredictionType["POLICY_SHIFT"] = "POLICY_SHIFT";
    PredictionType["ALLIANCE_CHANGE"] = "ALLIANCE_CHANGE";
    PredictionType["NEGOTIATION_OUTCOME"] = "NEGOTIATION_OUTCOME";
    PredictionType["TREATY_RATIFICATION"] = "TREATY_RATIFICATION";
    PredictionType["DIPLOMATIC_INCIDENT"] = "DIPLOMATIC_INCIDENT";
    PredictionType["CRISIS_ESCALATION"] = "CRISIS_ESCALATION";
    PredictionType["LEADERSHIP_TRANSITION_IMPACT"] = "LEADERSHIP_TRANSITION_IMPACT";
    PredictionType["REGIONAL_STABILITY"] = "REGIONAL_STABILITY";
    PredictionType["MULTILATERAL_INITIATIVE"] = "MULTILATERAL_INITIATIVE";
})(PredictionType || (exports.PredictionType = PredictionType = {}));
var PredictionTimeframe;
(function (PredictionTimeframe) {
    PredictionTimeframe["IMMEDIATE"] = "IMMEDIATE";
    PredictionTimeframe["SHORT_TERM"] = "SHORT_TERM";
    PredictionTimeframe["MEDIUM_TERM"] = "MEDIUM_TERM";
    PredictionTimeframe["LONG_TERM"] = "LONG_TERM"; // 3+ years
})(PredictionTimeframe || (exports.PredictionTimeframe = PredictionTimeframe = {}));
var Confidence;
(function (Confidence) {
    Confidence["VERY_HIGH"] = "VERY_HIGH";
    Confidence["HIGH"] = "HIGH";
    Confidence["MEDIUM"] = "MEDIUM";
    Confidence["LOW"] = "LOW";
    Confidence["VERY_LOW"] = "VERY_LOW"; // 0-25%
})(Confidence || (exports.Confidence = Confidence = {}));
