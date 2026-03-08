"use strict";
/**
 * ESG Reporting Types
 * Core data models for Environmental, Social, and Governance metrics tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricUnit = exports.ComplianceStatus = exports.ExportFormat = exports.ReportType = exports.ReportStatus = exports.ESGCategory = void 0;
// ============================================================================
// Enums
// ============================================================================
var ESGCategory;
(function (ESGCategory) {
    ESGCategory["ENVIRONMENTAL"] = "environmental";
    ESGCategory["SOCIAL"] = "social";
    ESGCategory["GOVERNANCE"] = "governance";
})(ESGCategory || (exports.ESGCategory = ESGCategory = {}));
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["DRAFT"] = "draft";
    ReportStatus["IN_REVIEW"] = "in_review";
    ReportStatus["APPROVED"] = "approved";
    ReportStatus["PUBLISHED"] = "published";
    ReportStatus["ARCHIVED"] = "archived";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
var ReportType;
(function (ReportType) {
    ReportType["ANNUAL"] = "annual";
    ReportType["QUARTERLY"] = "quarterly";
    ReportType["MONTHLY"] = "monthly";
    ReportType["AD_HOC"] = "ad_hoc";
    ReportType["REGULATORY"] = "regulatory";
})(ReportType || (exports.ReportType = ReportType = {}));
var ExportFormat;
(function (ExportFormat) {
    ExportFormat["JSON"] = "json";
    ExportFormat["CSV"] = "csv";
    ExportFormat["PDF"] = "pdf";
    ExportFormat["EXCEL"] = "excel";
})(ExportFormat || (exports.ExportFormat = ExportFormat = {}));
var ComplianceStatus;
(function (ComplianceStatus) {
    ComplianceStatus["COMPLIANT"] = "compliant";
    ComplianceStatus["PARTIALLY_COMPLIANT"] = "partially_compliant";
    ComplianceStatus["NON_COMPLIANT"] = "non_compliant";
    ComplianceStatus["NOT_APPLICABLE"] = "not_applicable";
    ComplianceStatus["PENDING_REVIEW"] = "pending_review";
})(ComplianceStatus || (exports.ComplianceStatus = ComplianceStatus = {}));
var MetricUnit;
(function (MetricUnit) {
    // Environmental
    MetricUnit["TONNES_CO2E"] = "tonnes_co2e";
    MetricUnit["KWH"] = "kwh";
    MetricUnit["MWH"] = "mwh";
    MetricUnit["CUBIC_METERS"] = "cubic_meters";
    MetricUnit["TONNES"] = "tonnes";
    MetricUnit["KILOGRAMS"] = "kilograms";
    MetricUnit["PERCENTAGE"] = "percentage";
    // Social/Governance
    MetricUnit["COUNT"] = "count";
    MetricUnit["RATIO"] = "ratio";
    MetricUnit["HOURS"] = "hours";
    MetricUnit["CURRENCY"] = "currency";
    MetricUnit["SCORE"] = "score";
})(MetricUnit || (exports.MetricUnit = MetricUnit = {}));
