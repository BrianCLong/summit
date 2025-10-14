import axios from 'axios';
import pino from 'pino';
import type { AuthorizationDecision, AuthorizationInput } from './types';

const logger = pino({ name: 'authz-policy' });

function opaUrl() {
  return process.env.OPA_URL || 'http://localhost:8181/v1/data/summit/abac/decision';
}

export async function authorize(
  input: AuthorizationInput,
): Promise<AuthorizationDecision> {
  try {
    const res = await axios.post(opaUrl(), { input });
    const result = res.data?.result;
    if (!result) {
      return { allowed: false, reason: 'opa_no_result', obligations: [] };
    }
    if (typeof result === 'boolean') {
      return {
        allowed: result,
        reason: result ? 'allow' : 'deny',
        obligations: [],
      };
    }
    return {
      allowed: Boolean(result.allow),
      reason: String(result.reason || (result.allow ? 'allow' : 'deny')),
      obligations: Array.isArray(result.obligations) ? result.obligations : [],
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      logger.error({ err: error }, 'OPA evaluation failed');
    }
    return { allowed: false, reason: 'opa_error', obligations: [] };
  }
}
