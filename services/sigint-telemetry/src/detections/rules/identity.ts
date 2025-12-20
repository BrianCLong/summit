/**
 * Identity Detection Rules
 */

import type { DetectionRule } from '../engine.js';
import type { AuthEvent } from '../../schemas/identity.js';

/** Impossible travel detection */
const impossibleTravelRule: DetectionRule = {
  id: 'identity-001',
  name: 'Impossible Travel Detected',
  description: 'Authentication from geographically impossible location in short timeframe',
  severity: 'high',
  enabled: true,
  eventTypes: ['identity.auth'],
  mitreTactics: ['initial_access'],
  mitreTechniques: ['T1078'],
  tags: ['identity', 'travel', 'geolocation'],
  evaluate: (event: unknown) => {
    const authEvent = event as AuthEvent;
    if (authEvent.impossibleTravel === true) {
      return 0.9;
    }
    return null;
  },
};

/** Brute force detection */
const bruteForceRule: DetectionRule = {
  id: 'identity-002',
  name: 'Potential Brute Force Attack',
  description: 'Multiple failed authentication attempts detected',
  severity: 'medium',
  enabled: true,
  eventTypes: ['identity.auth'],
  mitreTactics: ['credential_access'],
  mitreTechniques: ['T1110'],
  tags: ['identity', 'brute-force'],
  evaluate: (event: unknown) => {
    const authEvent = event as AuthEvent;
    if (
      authEvent.result?.startsWith('failure_') &&
      authEvent.riskScore !== undefined &&
      authEvent.riskScore > 70
    ) {
      return 0.7;
    }
    return null;
  },
};

/** MFA bypass attempt */
const mfaBypassRule: DetectionRule = {
  id: 'identity-003',
  name: 'MFA Bypass Attempt',
  description: 'Authentication succeeded without MFA from high-risk context',
  severity: 'high',
  enabled: true,
  eventTypes: ['identity.auth'],
  mitreTactics: ['credential_access', 'defense_evasion'],
  mitreTechniques: ['T1556'],
  tags: ['identity', 'mfa'],
  evaluate: (event: unknown) => {
    const authEvent = event as AuthEvent;
    if (
      authEvent.result === 'success' &&
      authEvent.authMethod === 'password' &&
      authEvent.riskScore !== undefined &&
      authEvent.riskScore > 50
    ) {
      return 0.6;
    }
    return null;
  },
};

/** High-risk authentication */
const highRiskAuthRule: DetectionRule = {
  id: 'identity-004',
  name: 'High Risk Authentication',
  description: 'Authentication with elevated risk score',
  severity: 'medium',
  enabled: true,
  eventTypes: ['identity.auth'],
  mitreTactics: ['initial_access'],
  mitreTechniques: ['T1078'],
  tags: ['identity', 'risk'],
  evaluate: (event: unknown) => {
    const authEvent = event as AuthEvent;
    if (authEvent.riskScore !== undefined && authEvent.riskScore >= 80) {
      return authEvent.riskScore / 100;
    }
    return null;
  },
};

/** Non-compliant device access */
const nonCompliantDeviceRule: DetectionRule = {
  id: 'identity-005',
  name: 'Non-Compliant Device Access',
  description: 'Access from device failing posture checks',
  severity: 'medium',
  enabled: true,
  eventTypes: ['identity.device_posture'],
  mitreTactics: ['initial_access'],
  mitreTechniques: ['T1078'],
  tags: ['identity', 'device', 'compliance'],
  evaluate: (event: unknown) => {
    const postureEvent = event as { status?: string; checks?: Array<{ passed: boolean }> };
    if (postureEvent.status === 'non_compliant') {
      const failedChecks = postureEvent.checks?.filter((c) => !c.passed).length ?? 0;
      return Math.min(0.5 + failedChecks * 0.1, 0.9);
    }
    return null;
  },
};

export const identityRules: DetectionRule[] = [
  impossibleTravelRule,
  bruteForceRule,
  mfaBypassRule,
  highRiskAuthRule,
  nonCompliantDeviceRule,
];
