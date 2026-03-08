"use strict";
/**
 * SLO Violation Model
 * Represents SLO violations tracked in CompanyOS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViolationSeverity = exports.SLOType = void 0;
var SLOType;
(function (SLOType) {
    SLOType["AVAILABILITY"] = "availability";
    SLOType["LATENCY"] = "latency";
    SLOType["ERROR_RATE"] = "error_rate";
    SLOType["THROUGHPUT"] = "throughput";
})(SLOType || (exports.SLOType = SLOType = {}));
var ViolationSeverity;
(function (ViolationSeverity) {
    ViolationSeverity["WARNING"] = "warning";
    ViolationSeverity["CRITICAL"] = "critical";
})(ViolationSeverity || (exports.ViolationSeverity = ViolationSeverity = {}));
