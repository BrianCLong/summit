"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertStatus = exports.AlertSeverity = void 0;
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["LOW"] = "low";
    AlertSeverity["INFO"] = "info";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["TRIGGERED"] = "triggered";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["SUPPRESSED"] = "suppressed";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
