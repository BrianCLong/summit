import axios from 'axios';
import pino from 'pino';
import type {
  AuthorizationDecision,
  AuthorizationInput,
  DecisionObligation,
} from './types';

const logger = pino({ name: 'authz-policy' });

function opaUrl() {
  return (
    process.env.OPA_URL || 'http://localhost:8181/v1/data/summit/abac/decision'
  );
}

function normalizeAllow(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true') {
      return true;
    }
    if (lowered === 'false') {
      return false;
    }
  }
  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }
  return null;
}

function normalizeObligations(value: unknown): DecisionObligation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((obligation): obligation is DecisionObligation => {
    if (typeof obligation !== 'object' || obligation === null) {
      return false;
    }
    const candidate = obligation as Partial<DecisionObligation>;
    return typeof candidate.type === 'string' && candidate.type.length > 0;
  });
}

export async function authorize(
  input: AuthorizationInput,
): Promise<AuthorizationDecision> {
  try {
    const res = await axios.post(opaUrl(), { input });
    const result = res.data?.result;
    if (result === null || result === undefined) {
      return { allowed: false, reason: 'opa_no_result', obligations: [] };
    }
    if (typeof result === 'boolean') {
      return {
        allowed: result,
        reason: result ? 'allow' : 'deny',
        obligations: [],
      };
    }
    const allowed = normalizeAllow((result as { allow?: unknown }).allow);
    const reason =
      result.reason !== undefined && result.reason !== null
        ? String(result.reason)
        : allowed === null
          ? 'deny'
          : allowed
            ? 'allow'
            : 'deny';
    return {
      allowed: allowed ?? false,
      reason,
      obligations: normalizeObligations(
        (result as { obligations?: unknown }).obligations,
      ),
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      logger.error({ err: error }, 'OPA evaluation failed');
    }
    return { allowed: false, reason: 'opa_error', obligations: [] };
  }
}
