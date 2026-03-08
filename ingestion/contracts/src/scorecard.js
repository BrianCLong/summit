"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildScorecard = buildScorecard;
function buildScorecard(contractId, version, findings, webhooksDelivered) {
    const critical = findings.filter((finding) => finding.severity === 'error').length;
    const warnings = findings.filter((finding) => finding.severity === 'warning').length;
    const completeness = Math.max(0, 100 - warnings * 10 - critical * 20);
    const safety = Math.max(0, 100 - critical * 25);
    const governance = 100 - warnings * 5;
    return {
        contractId,
        version,
        completeness,
        safety,
        governance,
        webhooksDelivered,
        findings
    };
}
