import { IntentEvaluateRequest, EpistemicDecision } from './types';

export const TRUST_CP_ENABLED = false;

export function evaluateIntent(req: IntentEvaluateRequest): EpistemicDecision {
  if (!TRUST_CP_ENABLED) {
    return 'APPROVE';
  }
  return 'ESCALATE'; // stub
}
