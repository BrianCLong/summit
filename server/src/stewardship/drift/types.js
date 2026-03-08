"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriftSeverity = exports.DriftType = void 0;
var DriftType;
(function (DriftType) {
    DriftType["MODEL"] = "MODEL";
    DriftType["AGENT"] = "AGENT";
    DriftType["RISK"] = "RISK";
    DriftType["COST"] = "COST";
})(DriftType || (exports.DriftType = DriftType = {}));
var DriftSeverity;
(function (DriftSeverity) {
    DriftSeverity["LOW"] = "LOW";
    DriftSeverity["MEDIUM"] = "MEDIUM";
    DriftSeverity["HIGH"] = "HIGH";
    DriftSeverity["CRITICAL"] = "CRITICAL";
})(DriftSeverity || (exports.DriftSeverity = DriftSeverity = {}));
