"use strict";
/**
 * Alert Model
 * Represents alerts from monitoring systems tracked in CompanyOS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertStatus = exports.AlertSeverity = exports.AlertSource = void 0;
var AlertSource;
(function (AlertSource) {
    AlertSource["PROMETHEUS"] = "prometheus";
    AlertSource["ALERTMANAGER"] = "alertmanager";
    AlertSource["GRAFANA"] = "grafana";
    AlertSource["CUSTOM"] = "custom";
    AlertSource["GITHUB_ACTIONS"] = "github_actions";
})(AlertSource || (exports.AlertSource = AlertSource = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["INFO"] = "info";
    AlertSeverity["WARNING"] = "warning";
    AlertSeverity["CRITICAL"] = "critical";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["FIRING"] = "firing";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["SILENCED"] = "silenced";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
