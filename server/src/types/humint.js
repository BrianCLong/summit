"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementPriority = exports.ReportStatus = exports.SourceStatus = exports.ReportGrading = exports.SourceReliability = void 0;
var SourceReliability;
(function (SourceReliability) {
    SourceReliability["A"] = "A";
    SourceReliability["B"] = "B";
    SourceReliability["C"] = "C";
    SourceReliability["D"] = "D";
    SourceReliability["E"] = "E";
    SourceReliability["F"] = "F";
})(SourceReliability || (exports.SourceReliability = SourceReliability = {}));
var ReportGrading;
(function (ReportGrading) {
    ReportGrading["ONE"] = "1";
    ReportGrading["TWO"] = "2";
    ReportGrading["THREE"] = "3";
    ReportGrading["FOUR"] = "4";
    ReportGrading["FIVE"] = "5";
    ReportGrading["SIX"] = "6";
})(ReportGrading || (exports.ReportGrading = ReportGrading = {}));
var SourceStatus;
(function (SourceStatus) {
    SourceStatus["RECRUITED"] = "RECRUITED";
    SourceStatus["PAUSED"] = "PAUSED";
    SourceStatus["TERMINATED"] = "TERMINATED";
    SourceStatus["BURNED"] = "BURNED";
})(SourceStatus || (exports.SourceStatus = SourceStatus = {}));
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["DRAFT"] = "DRAFT";
    ReportStatus["SUBMITTED"] = "SUBMITTED";
    ReportStatus["VALIDATED"] = "VALIDATED";
    ReportStatus["DISSEMINATED"] = "DISSEMINATED";
    ReportStatus["REJECTED"] = "REJECTED";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
var RequirementPriority;
(function (RequirementPriority) {
    RequirementPriority["LOW"] = "LOW";
    RequirementPriority["MEDIUM"] = "MEDIUM";
    RequirementPriority["HIGH"] = "HIGH";
    RequirementPriority["CRITICAL"] = "CRITICAL";
})(RequirementPriority || (exports.RequirementPriority = RequirementPriority = {}));
