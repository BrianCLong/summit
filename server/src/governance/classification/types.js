"use strict";
/**
 * Data Classification Types
 * Defines the taxonomy for data governance classification.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSeverity = exports.DataClassification = void 0;
var DataClassification;
(function (DataClassification) {
    /** Publicly available data */
    DataClassification["PUBLIC"] = "PUBLIC";
    /** Internal business data */
    DataClassification["INTERNAL"] = "INTERNAL";
    /** Personally Identifiable Information */
    DataClassification["PII"] = "PII";
    /** Protected Health Information */
    DataClassification["PHI"] = "PHI";
    /** Financial data (PCI, SOX, etc.) */
    DataClassification["FINANCIAL"] = "FINANCIAL";
    /** Secrets, keys, tokens */
    DataClassification["SECRET"] = "SECRET";
    /** Legal or Compliance restrictions */
    DataClassification["RESTRICTED"] = "RESTRICTED";
    /** System metadata (IDs, timestamps) */
    DataClassification["SYSTEM"] = "SYSTEM";
})(DataClassification || (exports.DataClassification = DataClassification = {}));
var DataSeverity;
(function (DataSeverity) {
    DataSeverity["LOW"] = "LOW";
    DataSeverity["MEDIUM"] = "MEDIUM";
    DataSeverity["HIGH"] = "HIGH";
    DataSeverity["CRITICAL"] = "CRITICAL";
})(DataSeverity || (exports.DataSeverity = DataSeverity = {}));
