"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Severity = exports.AnomalyType = void 0;
var AnomalyType;
(function (AnomalyType) {
    AnomalyType["TEMPORAL"] = "temporal";
    AnomalyType["SPATIAL"] = "spatial";
    AnomalyType["NETWORK"] = "network";
    AnomalyType["BEHAVIORAL"] = "behavioral";
})(AnomalyType || (exports.AnomalyType = AnomalyType = {}));
var Severity;
(function (Severity) {
    Severity["LOW"] = "low";
    Severity["MEDIUM"] = "medium";
    Severity["HIGH"] = "high";
    Severity["CRITICAL"] = "critical";
})(Severity || (exports.Severity = Severity = {}));
