"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateLaunchGate = evaluateLaunchGate;
const REQUIRED_FIELDS = [
    'residency',
    'screeningLiveWithAuditTrails',
    'exceptionRegistryExists',
    'procurementPacketComplete',
    'contractRidersVerified',
    'taxReadinessVerified',
    'localizationSmokeComplete',
    'regionalSloDashboardsLive',
    'loadTestsRun',
    'failoverPostureLogged',
    'supportRunbooksTested',
];
function evaluateLaunchGate(evidence) {
    const failures = [];
    for (const field of REQUIRED_FIELDS) {
        if (!evidence[field]) {
            failures.push(`${field} is missing or false`);
        }
    }
    if (!evidence.residency.residencyEnforced) {
        failures.push('Residency enforcement must be validated');
    }
    if (!evidence.residency.kmsKeyId) {
        failures.push('Regional KMS key must be configured');
    }
    if (!evidence.residency.backupsVerified) {
        failures.push('Regional backups/restores must be validated');
    }
    if (!evidence.residency.egressAllowlist.length) {
        failures.push('Egress allowlists must be configured');
    }
    if (evidence.helperServicesActive) {
        failures.push('Cross-region helper services must be removed');
    }
    return {
        ready: failures.length === 0,
        failures,
    };
}
