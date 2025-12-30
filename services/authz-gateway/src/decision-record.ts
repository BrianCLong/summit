import crypto from 'crypto';
import type { AuthorizationDecision, AuthorizationInput } from './types';

export function enrichDecision(
  decision: AuthorizationDecision,
  input: AuthorizationInput,
  policyVersion = process.env.POLICY_BUNDLE_VERSION || 'abac.v1.0.0',
): AuthorizationDecision {
  const decisionId = crypto.randomUUID();
  const inputsHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
  return { ...decision, decisionId, inputsHash, policyVersion };
}
