"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphInsight = void 0;
var GraphInsight;
(function (GraphInsight) {
    let severity;
    (function (severity) {
        severity["LOW"] = "low";
        severity["MEDIUM"] = "medium";
        severity["HIGH"] = "high";
        severity["CRITICAL"] = "critical";
    })(severity = GraphInsight.severity || (GraphInsight.severity = {}));
})(GraphInsight || (exports.GraphInsight = GraphInsight = {}));
