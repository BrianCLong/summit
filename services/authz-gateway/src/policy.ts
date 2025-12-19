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
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
    if (normalized.length === 0) {
      return Boolean(value);
    }
    if (!/[a-z]/i.test(normalized)) {
      return true;
    }
    return false;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return Boolean(value);
}

function normalizeObligations(value: unknown): DecisionObligation[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (candidate): candidate is DecisionObligation =>
      typeof candidate === 'object' &&
      candidate !== null &&
      typeof (candidate as { type?: unknown }).type === 'string' &&
      (candidate as { type: string }).type.length > 0,
  );
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
    if (typeof result === 'number' || typeof result === 'string') {
      const allowed = normalizeAllow(result);
      return {
        allowed: allowed ?? false,
        reason: allowed ? 'allow' : 'deny',
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
