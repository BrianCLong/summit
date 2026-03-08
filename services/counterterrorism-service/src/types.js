"use strict";
/**
 * Counterterrorism Service Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceType = exports.Priority = exports.OperationStatus = exports.OperationType = void 0;
var OperationType;
(function (OperationType) {
    OperationType["SURVEILLANCE"] = "SURVEILLANCE";
    OperationType["INTERDICTION"] = "INTERDICTION";
    OperationType["ARREST"] = "ARREST";
    OperationType["ASSET_SEIZURE"] = "ASSET_SEIZURE";
    OperationType["DISRUPTION"] = "DISRUPTION";
    OperationType["DERADICALIZATION"] = "DERADICALIZATION";
    OperationType["INTELLIGENCE_GATHERING"] = "INTELLIGENCE_GATHERING";
    OperationType["BORDER_SECURITY"] = "BORDER_SECURITY";
    OperationType["CYBER_OPERATION"] = "CYBER_OPERATION";
})(OperationType || (exports.OperationType = OperationType = {}));
var OperationStatus;
(function (OperationStatus) {
    OperationStatus["PLANNING"] = "PLANNING";
    OperationStatus["APPROVED"] = "APPROVED";
    OperationStatus["ACTIVE"] = "ACTIVE";
    OperationStatus["COMPLETED"] = "COMPLETED";
    OperationStatus["SUSPENDED"] = "SUSPENDED";
    OperationStatus["CANCELLED"] = "CANCELLED";
})(OperationStatus || (exports.OperationStatus = OperationStatus = {}));
var Priority;
(function (Priority) {
    Priority["CRITICAL"] = "CRITICAL";
    Priority["HIGH"] = "HIGH";
    Priority["MEDIUM"] = "MEDIUM";
    Priority["LOW"] = "LOW";
})(Priority || (exports.Priority = Priority = {}));
var EvidenceType;
(function (EvidenceType) {
    EvidenceType["PHYSICAL"] = "PHYSICAL";
    EvidenceType["DIGITAL"] = "DIGITAL";
    EvidenceType["TESTIMONIAL"] = "TESTIMONIAL";
    EvidenceType["DOCUMENTARY"] = "DOCUMENTARY";
    EvidenceType["SURVEILLANCE"] = "SURVEILLANCE";
    EvidenceType["FORENSIC"] = "FORENSIC";
})(EvidenceType || (exports.EvidenceType = EvidenceType = {}));
