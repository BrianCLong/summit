import {
  LICENSE_CLASSES,
  SAFETY_TIERS,
  ZERO_SPEND_OPTIMIZATIONS,
} from 'common-types';

const SAFETY_ORDER = {
  [SAFETY_TIERS.A]: 3,
  [SAFETY_TIERS.B]: 2,
  [SAFETY_TIERS.C]: 1,
};

/**
 * Domain specific policy violation error that includes a machine readable code.
 */
export class PolicyViolation extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'PolicyViolation';
    this.code = code;
    this.context = context;
  }
}

/**
 * Lightweight detector used before routing prompts to models. The goal is to
 * remove obvious PII/secret markers while keeping the rest of the payload.
 *
 * @param {Record<string, unknown>} payload
 * @returns {Record<string, unknown>}
 */
function redactPayload(payload) {
  const redacted = {};
  const piiPatterns = /(password|token|secret|ssn|email)/i;
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string' && piiPatterns.test(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'string' && piiPatterns.test(value)) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactPayload(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * PolicyEngine validates candidate resources and task payloads against
 * residency, license and safety guardrails. It also emits audit tags used by
 * downstream provenance logging.
 */
export class PolicyEngine {
  constructor(config = {}) {
    this.config = {
      allowedResidencies: config.allowedResidencies ?? [],
      allowedLicenses: config.allowedLicenses ?? [
        LICENSE_CLASSES.MIT_OK,
        LICENSE_CLASSES.OPEN_DATA_OK,
      ],
      minSafetyTier: config.minSafetyTier ?? SAFETY_TIERS.B,
      enforcePiiIsolation: config.enforcePiiIsolation ?? true,
      qualityDeltaMin: config.qualityDeltaMin ?? 0.05,
      retentionDays: {
        pii: config.retentionDays?.pii ?? 30,
        standard: config.retentionDays?.standard ?? 365,
      },
      redaction: {
        enabled: config.redaction?.enabled ?? true,
      },
      optimizationFlags:
        config.optimizationFlags ?? Object.values(ZERO_SPEND_OPTIMIZATIONS),
    };
  }

  /**
   * Determine whether a candidate model/resource satisfies corporate policy.
   *
   * @param {import('common-types').CandidateResource} candidate
   * @param {{ allowedResidencies?: string[], minSafetyTier?: string, allowRestricted?: boolean }} overrides
   * @returns {{ allowed: boolean, reasons: string[], tags: string[] }}
   */
  evaluateCandidate(candidate, overrides = {}) {
    const reasons = [];
    const allowedResidencies =
      overrides.allowedResidencies ?? this.config.allowedResidencies;
    if (Array.isArray(allowedResidencies) && allowedResidencies.length > 0) {
      if (!allowedResidencies.includes(candidate.residency)) {
        reasons.push(`residency:${candidate.residency}`);
      }
    }

    const licenseAllowList =
      overrides.allowedLicenses ?? this.config.allowedLicenses;
    if (Array.isArray(licenseAllowList) && licenseAllowList.length > 0) {
      if (!licenseAllowList.includes(candidate.licenseClass)) {
        reasons.push(`license:${candidate.licenseClass}`);
      }
    }

    const minSafety = overrides.minSafetyTier ?? this.config.minSafetyTier;
    if (SAFETY_ORDER[candidate.safetyTier] < SAFETY_ORDER[minSafety]) {
      reasons.push(`safety:${candidate.safetyTier}`);
    }

    if (
      candidate.constraints?.pii &&
      this.config.enforcePiiIsolation &&
      !overrides.allowRestricted
    ) {
      reasons.push('pii:true');
    }

    return {
      allowed: reasons.length === 0,
      reasons,
      tags: this.buildTags(candidate),
    };
  }

  /**
   * Filter a list of candidates to those that pass policy.
   *
   * @param {import('common-types').CandidateResource[]} candidates
   * @param {{ allowedResidencies?: string[] }} overrides
   * @returns {import('common-types').CandidateResource[]}
   */
  filterCandidates(candidates, overrides = {}) {
    return candidates.filter(
      (candidate) => this.evaluateCandidate(candidate, overrides).allowed,
    );
  }

  /**
   * Enforce task-level policy, throwing a PolicyViolation if the candidate is
   * not permitted for the given task.
   *
   * @param {object} task
   * @param {import('common-types').CandidateResource} candidate
   * @returns {{ tags: string[], retentionDays: number, redactedPayload?: Record<string, unknown> }}
   */
  enforceTaskPolicy(task, candidate) {
    const evaluation = this.evaluateCandidate(candidate, {
      allowedResidencies: task?.policy?.allowedResidencies,
      minSafetyTier: task?.policy?.minSafetyTier,
      allowRestricted: task?.policy?.allowRestricted ?? false,
    });

    if (!evaluation.allowed) {
      throw new PolicyViolation(
        'Candidate violates policy',
        'CANDIDATE_NOT_ALLOWED',
        {
          reasons: evaluation.reasons,
          candidateId: candidate.id,
          taskId: task?.id,
        },
      );
    }

    const retentionDays = this.needsPiiIsolation(task)
      ? this.config.retentionDays.pii
      : this.config.retentionDays.standard;

    const redactedPayload = this.config.redaction.enabled
      ? redactPayload(task?.payload ?? {})
      : (task?.payload ?? {});

    return {
      tags: evaluation.tags.concat(this.policyTagsForTask(task)),
      retentionDays,
      redactedPayload,
    };
  }

  /**
   * Determine if the task contains PII and must respect the short retention
   * window.
   *
   * @param {object} task
   * @returns {boolean}
   */
  needsPiiIsolation(task) {
    return Boolean(task?.policy?.containsPii || task?.metadata?.containsPii);
  }

  /**
   * Builds audit tags for provenance records.
   *
   * @param {import('common-types').CandidateResource} candidate
   * @returns {string[]}
   */
  buildTags(candidate) {
    return [
      `kind:${candidate.kind}`,
      `safety:${candidate.safetyTier}`,
      `license:${candidate.licenseClass}`,
      `residency:${candidate.residency}`,
    ];
  }

  /**
   * Additional tags derived from task metadata.
   *
   * @param {object} task
   * @returns {string[]}
   */
  policyTagsForTask(task) {
    const tags = [];
    if (task?.policy?.containsPii) {
      tags.push('pii');
    }
    if (task?.policy?.tenant) {
      tags.push(`tenant:${task.policy.tenant}`);
    }
    if (Array.isArray(task?.skills)) {
      for (const skill of task.skills) {
        tags.push(`skill:${skill}`);
      }
    }
    return tags;
  }

  /**
   * Whether an optimization is allowed under current governance settings.
   *
   * @param {string} optimization
   * @returns {boolean}
   */
  isOptimizationEnabled(optimization) {
    return this.config.optimizationFlags.includes(optimization);
  }
}

export { redactPayload };
