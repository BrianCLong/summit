"use strict";
/**
 * Cloud Detection Rules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudRules = void 0;
/** Privilege escalation via IAM */
const iamPrivEscRule = {
    id: 'cloud-001',
    name: 'IAM Privilege Escalation',
    description: 'IAM policy or permission change that may indicate privilege escalation',
    severity: 'high',
    enabled: true,
    eventTypes: ['cloud.iam'],
    mitreTactics: ['privilege_escalation', 'persistence'],
    mitreTechniques: ['T1098'],
    tags: ['cloud', 'iam', 'privilege-escalation'],
    evaluate: (event) => {
        const iamEvent = event;
        const escalationActions = ['policy_attached', 'permission_added', 'role_created'];
        if (escalationActions.includes(iamEvent.action)) {
            return 0.7;
        }
        return null;
    },
};
/** MFA disabled */
const mfaDisabledRule = {
    id: 'cloud-002',
    name: 'MFA Disabled on Account',
    description: 'Multi-factor authentication was disabled on a cloud account',
    severity: 'critical',
    enabled: true,
    eventTypes: ['cloud.iam'],
    mitreTactics: ['defense_evasion', 'persistence'],
    mitreTechniques: ['T1556'],
    tags: ['cloud', 'iam', 'mfa'],
    evaluate: (event) => {
        const iamEvent = event;
        if (iamEvent.action === 'mfa_disabled') {
            return 0.95;
        }
        return null;
    },
};
/** Access key created */
const accessKeyCreatedRule = {
    id: 'cloud-003',
    name: 'Access Key Created',
    description: 'New programmatic access key was created',
    severity: 'medium',
    enabled: true,
    eventTypes: ['cloud.iam'],
    mitreTactics: ['persistence', 'credential_access'],
    mitreTechniques: ['T1098.001'],
    tags: ['cloud', 'iam', 'access-key'],
    evaluate: (event) => {
        const iamEvent = event;
        if (iamEvent.action === 'access_key_created') {
            return 0.6;
        }
        return null;
    },
};
/** Public resource exposure */
const publicResourceRule = {
    id: 'cloud-004',
    name: 'Public Resource Exposure',
    description: 'Cloud resource configured with public access',
    severity: 'high',
    enabled: true,
    eventTypes: ['cloud.resource'],
    mitreTactics: ['initial_access'],
    mitreTechniques: ['T1190'],
    tags: ['cloud', 'exposure', 'public'],
    evaluate: (event) => {
        const resourceEvent = event;
        if (resourceEvent.isPublic === true) {
            return 0.85;
        }
        return null;
    },
};
/** Unencrypted resource */
const unencryptedResourceRule = {
    id: 'cloud-005',
    name: 'Unencrypted Resource',
    description: 'Cloud resource created without encryption',
    severity: 'medium',
    enabled: true,
    eventTypes: ['cloud.resource'],
    mitreTactics: ['collection'],
    mitreTechniques: ['T1530'],
    tags: ['cloud', 'encryption', 'compliance'],
    evaluate: (event) => {
        const resourceEvent = event;
        if (resourceEvent.isEncrypted === false && resourceEvent.action === 'created') {
            return 0.6;
        }
        return null;
    },
};
/** Security finding passthrough */
const securityFindingRule = {
    id: 'cloud-006',
    name: 'Cloud Security Finding',
    description: 'Security finding from cloud security posture management',
    severity: 'medium',
    enabled: true,
    eventTypes: ['cloud.security_finding'],
    mitreTactics: ['*'],
    mitreTechniques: ['*'],
    tags: ['cloud', 'cspm', 'finding'],
    evaluate: (event) => {
        const finding = event;
        if (finding.status === 'active') {
            const severityScore = {
                critical: 0.95,
                high: 0.8,
                medium: 0.6,
                low: 0.4,
            };
            return severityScore[finding.severity] ?? 0.5;
        }
        return null;
    },
};
/** Root account usage */
const rootAccountRule = {
    id: 'cloud-007',
    name: 'Root Account Usage',
    description: 'Root or privileged account used for operations',
    severity: 'critical',
    enabled: true,
    eventTypes: ['cloud.iam', 'cloud.api_call'],
    mitreTactics: ['privilege_escalation'],
    mitreTechniques: ['T1078.004'],
    tags: ['cloud', 'root', 'privileged'],
    evaluate: (event) => {
        const cloudEvent = event;
        if (cloudEvent.actorType === 'root') {
            return 0.9;
        }
        return null;
    },
};
exports.cloudRules = [
    iamPrivEscRule,
    mfaDisabledRule,
    accessKeyCreatedRule,
    publicResourceRule,
    unencryptedResourceRule,
    securityFindingRule,
    rootAccountRule,
];
