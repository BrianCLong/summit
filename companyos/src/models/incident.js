"use strict";
/**
 * Incident Model
 * Represents operational incidents tracked in CompanyOS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentStatus = exports.IncidentSeverity = void 0;
var IncidentSeverity;
(function (IncidentSeverity) {
    IncidentSeverity["SEV1"] = "sev1";
    IncidentSeverity["SEV2"] = "sev2";
    IncidentSeverity["SEV3"] = "sev3";
    IncidentSeverity["SEV4"] = "sev4";
})(IncidentSeverity || (exports.IncidentSeverity = IncidentSeverity = {}));
var IncidentStatus;
(function (IncidentStatus) {
    IncidentStatus["OPEN"] = "open";
    IncidentStatus["INVESTIGATING"] = "investigating";
    IncidentStatus["IDENTIFIED"] = "identified";
    IncidentStatus["MONITORING"] = "monitoring";
    IncidentStatus["RESOLVED"] = "resolved";
    IncidentStatus["CLOSED"] = "closed";
})(IncidentStatus || (exports.IncidentStatus = IncidentStatus = {}));
