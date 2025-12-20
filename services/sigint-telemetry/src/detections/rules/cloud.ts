/**
 * Cloud Detection Rules
 */

import type { DetectionRule } from '../engine.js';
import type { IamEvent, ResourceEvent, SecurityFinding } from '../../schemas/cloud.js';

/** Privilege escalation via IAM */
const iamPrivEscRule: DetectionRule = {
  id: 'cloud-001',
  name: 'IAM Privilege Escalation',
  description: 'IAM policy or permission change that may indicate privilege escalation',
  severity: 'high',
  enabled: true,
  eventTypes: ['cloud.iam'],
  mitreTactics: ['privilege_escalation', 'persistence'],
  mitreTechniques: ['T1098'],
  tags: ['cloud', 'iam', 'privilege-escalation'],
  evaluate: (event: unknown) => {
    const iamEvent = event as IamEvent;
    const escalationActions = ['policy_attached', 'permission_added', 'role_created'];
    if (escalationActions.includes(iamEvent.action)) {
      return 0.7;
    }
    return null;
  },
};

/** MFA disabled */
const mfaDisabledRule: DetectionRule = {
  id: 'cloud-002',
  name: 'MFA Disabled on Account',
  description: 'Multi-factor authentication was disabled on a cloud account',
  severity: 'critical',
  enabled: true,
  eventTypes: ['cloud.iam'],
  mitreTactics: ['defense_evasion', 'persistence'],
  mitreTechniques: ['T1556'],
  tags: ['cloud', 'iam', 'mfa'],
  evaluate: (event: unknown) => {
    const iamEvent = event as IamEvent;
    if (iamEvent.action === 'mfa_disabled') {
      return 0.95;
    }
    return null;
  },
};

/** Access key created */
const accessKeyCreatedRule: DetectionRule = {
  id: 'cloud-003',
  name: 'Access Key Created',
  description: 'New programmatic access key was created',
  severity: 'medium',
  enabled: true,
  eventTypes: ['cloud.iam'],
  mitreTactics: ['persistence', 'credential_access'],
  mitreTechniques: ['T1098.001'],
  tags: ['cloud', 'iam', 'access-key'],
  evaluate: (event: unknown) => {
    const iamEvent = event as IamEvent;
    if (iamEvent.action === 'access_key_created') {
      return 0.6;
    }
    return null;
  },
};

/** Public resource exposure */
const publicResourceRule: DetectionRule = {
  id: 'cloud-004',
  name: 'Public Resource Exposure',
  description: 'Cloud resource configured with public access',
  severity: 'high',
  enabled: true,
  eventTypes: ['cloud.resource'],
  mitreTactics: ['initial_access'],
  mitreTechniques: ['T1190'],
  tags: ['cloud', 'exposure', 'public'],
  evaluate: (event: unknown) => {
    const resourceEvent = event as ResourceEvent;
    if (resourceEvent.isPublic === true) {
      return 0.85;
    }
    return null;
  },
};

/** Unencrypted resource */
const unencryptedResourceRule: DetectionRule = {
  id: 'cloud-005',
  name: 'Unencrypted Resource',
  description: 'Cloud resource created without encryption',
  severity: 'medium',
  enabled: true,
  eventTypes: ['cloud.resource'],
  mitreTactics: ['collection'],
  mitreTechniques: ['T1530'],
  tags: ['cloud', 'encryption', 'compliance'],
  evaluate: (event: unknown) => {
    const resourceEvent = event as ResourceEvent;
    if (resourceEvent.isEncrypted === false && resourceEvent.action === 'created') {
      return 0.6;
    }
    return null;
  },
};

/** Security finding passthrough */
const securityFindingRule: DetectionRule = {
  id: 'cloud-006',
  name: 'Cloud Security Finding',
  description: 'Security finding from cloud security posture management',
  severity: 'medium',
  enabled: true,
  eventTypes: ['cloud.security_finding'],
  mitreTactics: ['*'],
  mitreTechniques: ['*'],
  tags: ['cloud', 'cspm', 'finding'],
  evaluate: (event: unknown) => {
    const finding = event as SecurityFinding;
    if (finding.status === 'active') {
      const severityScore: Record<string, number> = {
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
const rootAccountRule: DetectionRule = {
  id: 'cloud-007',
  name: 'Root Account Usage',
  description: 'Root or privileged account used for operations',
  severity: 'critical',
  enabled: true,
  eventTypes: ['cloud.iam', 'cloud.api_call'],
  mitreTactics: ['privilege_escalation'],
  mitreTechniques: ['T1078.004'],
  tags: ['cloud', 'root', 'privileged'],
  evaluate: (event: unknown) => {
    const cloudEvent = event as { actorType?: string };
    if (cloudEvent.actorType === 'root') {
      return 0.9;
    }
    return null;
  },
};

export const cloudRules: DetectionRule[] = [
  iamPrivEscRule,
  mfaDisabledRule,
  accessKeyCreatedRule,
  publicResourceRule,
  unencryptedResourceRule,
  securityFindingRule,
  rootAccountRule,
];
