import { Purpose, RetentionTier, PolicySignal } from '../types.js';

interface PolicyDecision {
  allow: boolean;
  reason?: string;
  tags: string[];
}

type PolicyInput = {
  tenantId: string;
  purpose: Purpose;
  retention: RetentionTier;
  classification?: string;
};

const PURPOSE_MATRIX: Record<Purpose, RetentionTier[]> = {
  investigation: ['short', 'standard'],
  't&s': ['short'],
  benchmarking: ['short', 'standard'],
  release_notes: ['standard'],
  compliance: ['standard'],
};

const LICENSE_ALLOW_LIST = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-3-Clause',
  'BSD-2-Clause',
  'ISC',
  'CC-BY-4.0',
  'Unlicense',
]);

export const evaluatePurposePolicy = (input: PolicyInput): PolicyDecision => {
  const allowedRetentions = PURPOSE_MATRIX[input.purpose];
  if (!allowedRetentions) {
    return { allow: false, reason: 'unknown_purpose', tags: [] };
  }
  if (!allowedRetentions.includes(input.retention)) {
    return {
      allow: false,
      reason: 'retention_not_allowed',
      tags: [`purpose:${input.purpose}`, `retention:${input.retention}`],
    };
  }
  return {
    allow: true,
    tags: [`purpose:${input.purpose}`, `retention:${input.retention}`],
  };
};

export const evaluateLicensePolicy = (signal: PolicySignal): PolicyDecision => {
  if (!signal.value) {
    return { allow: true, tags: ['license:unknown'] };
  }

  const normalized = signal.value.toUpperCase();
  if (LICENSE_ALLOW_LIST.has(normalized)) {
    return { allow: true, tags: [`license:${normalized}`] };
  }

  return {
    allow: false,
    reason: 'license_not_permitted',
    tags: [`license:${normalized}`],
  };
};
