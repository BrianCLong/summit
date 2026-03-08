"use strict";
/**
 * Identity Detection Rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.identityRules = void 0;
/** Impossible travel detection */
const impossibleTravelRule = {
    id: 'identity-001',
    name: 'Impossible Travel Detected',
    description: 'Authentication from geographically impossible location in short timeframe',
    severity: 'high',
    enabled: true,
    eventTypes: ['identity.auth'],
    mitreTactics: ['initial_access'],
    mitreTechniques: ['T1078'],
    tags: ['identity', 'travel', 'geolocation'],
    evaluate: (event) => {
        const authEvent = event;
        if (authEvent.impossibleTravel === true) {
            return 0.9;
        }
        return null;
    },
};
/** Brute force detection */
const bruteForceRule = {
    id: 'identity-002',
    name: 'Potential Brute Force Attack',
    description: 'Multiple failed authentication attempts detected',
    severity: 'medium',
    enabled: true,
    eventTypes: ['identity.auth'],
    mitreTactics: ['credential_access'],
    mitreTechniques: ['T1110'],
    tags: ['identity', 'brute-force'],
    evaluate: (event) => {
        const authEvent = event;
        if (authEvent.result?.startsWith('failure_') &&
            authEvent.riskScore !== undefined &&
            authEvent.riskScore > 70) {
            return 0.7;
        }
        return null;
    },
};
/** MFA bypass attempt */
const mfaBypassRule = {
    id: 'identity-003',
    name: 'MFA Bypass Attempt',
    description: 'Authentication succeeded without MFA from high-risk context',
    severity: 'high',
    enabled: true,
    eventTypes: ['identity.auth'],
    mitreTactics: ['credential_access', 'defense_evasion'],
    mitreTechniques: ['T1556'],
    tags: ['identity', 'mfa'],
    evaluate: (event) => {
        const authEvent = event;
        if (authEvent.result === 'success' &&
            authEvent.authMethod === 'password' &&
            authEvent.riskScore !== undefined &&
            authEvent.riskScore > 50) {
            return 0.6;
        }
        return null;
    },
};
/** High-risk authentication */
const highRiskAuthRule = {
    id: 'identity-004',
    name: 'High Risk Authentication',
    description: 'Authentication with elevated risk score',
    severity: 'medium',
    enabled: true,
    eventTypes: ['identity.auth'],
    mitreTactics: ['initial_access'],
    mitreTechniques: ['T1078'],
    tags: ['identity', 'risk'],
    evaluate: (event) => {
        const authEvent = event;
        if (authEvent.riskScore !== undefined && authEvent.riskScore >= 80) {
            return authEvent.riskScore / 100;
        }
        return null;
    },
};
/** Non-compliant device access */
const nonCompliantDeviceRule = {
    id: 'identity-005',
    name: 'Non-Compliant Device Access',
    description: 'Access from device failing posture checks',
    severity: 'medium',
    enabled: true,
    eventTypes: ['identity.device_posture'],
    mitreTactics: ['initial_access'],
    mitreTechniques: ['T1078'],
    tags: ['identity', 'device', 'compliance'],
    evaluate: (event) => {
        const postureEvent = event;
        if (postureEvent.status === 'non_compliant') {
            const failedChecks = postureEvent.checks?.filter((c) => !c.passed).length ?? 0;
            return Math.min(0.5 + failedChecks * 0.1, 0.9);
        }
        return null;
    },
};
exports.identityRules = [
    impossibleTravelRule,
    bruteForceRule,
    mfaBypassRule,
    highRiskAuthRule,
    nonCompliantDeviceRule,
];
