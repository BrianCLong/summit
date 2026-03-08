"use strict";
/**
 * Compliance Types
 *
 * Type definitions for the compliance automation framework.
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC4.2 (Evidence)
 *
 * @module compliance/types/Compliance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceType = exports.ComplianceFramework = void 0;
// ============================================================================
// Compliance Frameworks
// ============================================================================
var ComplianceFramework;
(function (ComplianceFramework) {
    ComplianceFramework["SOC2"] = "SOC2";
    ComplianceFramework["ISO27001"] = "ISO27001";
    ComplianceFramework["GDPR"] = "GDPR";
    ComplianceFramework["HIPAA"] = "HIPAA";
    ComplianceFramework["PCIDSS"] = "PCI-DSS";
    ComplianceFramework["NIST"] = "NIST";
})(ComplianceFramework || (exports.ComplianceFramework = ComplianceFramework = {}));
var EvidenceType;
(function (EvidenceType) {
    EvidenceType["SYSTEM_CONFIG"] = "system_config";
    EvidenceType["ACCESS_LOG"] = "access_log";
    EvidenceType["AUDIT_TRAIL"] = "audit_trail";
    EvidenceType["POLICY_DOCUMENT"] = "policy_document";
    EvidenceType["SCREENSHOT"] = "screenshot";
    EvidenceType["TEST_RESULT"] = "test_result";
    EvidenceType["ATTESTATION"] = "attestation";
    EvidenceType["SCAN_REPORT"] = "scan_report";
    EvidenceType["METRIC"] = "metric";
    EvidenceType["CUSTOM"] = "custom";
})(EvidenceType || (exports.EvidenceType = EvidenceType = {}));
