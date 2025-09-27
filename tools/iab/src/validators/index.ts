import { ArtifactConfig, ValidationResult } from '../types.js';
import { ArtifactValidator } from './types.js';
import { validateLog } from './logValidator.js';
import { validatePolicy } from './policyValidator.js';
import { validateDpBudget } from './dpBudgetValidator.js';
import { validateConsentProof } from './consentProofValidator.js';
import { validateErrorTrace } from './errorTraceValidator.js';

const registry: Record<string, ArtifactValidator> = {
  log: validateLog,
  policy: validatePolicy,
  'dp-budget': validateDpBudget,
  'consent-proof': validateConsentProof,
  'error-trace': validateErrorTrace
};

export function validateArtifact(
  artifact: ArtifactConfig,
  rawContent: string
): ValidationResult {
  const validator = registry[artifact.type];
  if (!validator) {
    return {
      status: 'failed',
      validator: 'UnknownValidator',
      details: [`no validator registered for type ${artifact.type}`]
    };
  }

  return validator(artifact, rawContent);
}
