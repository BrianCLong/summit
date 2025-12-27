import axios from 'axios';
import pino from 'pino';
import type {
  AuthorizationDecision,
  AuthorizationInput,
  DecisionObligation,
} from './types';

const logger = pino({ name: 'authz-policy' });

function normalizePath(path: string) {
  return path.replace(/^\/+/, '');
}

function buildBaseUrl() {
  return (process.env.OPA_BASE_URL || 'http://localhost:8181').replace(
    /\/+$/,
    '',
  );
}

function buildEndpoint(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${buildBaseUrl()}/v1/data/${normalizePath(path)}`;
}

function tenantAwarePaths(tenantId?: string): string[] {
  const endpoints: string[] = [];
  if (process.env.OPA_URL) {
    endpoints.push(process.env.OPA_URL);
  }

  const tenantTemplate = process.env.OPA_TENANT_POLICY_TEMPLATE;
  if (tenantTemplate && tenantId) {
    const safeTenant = encodeURIComponent(tenantId);
    const normalizedTemplate = tenantTemplate
      .replace('{tenantId}', safeTenant)
      .replace('{tenant}', safeTenant);
    endpoints.push(normalizePath(normalizedTemplate));
  }

  endpoints.push(
    normalizePath(process.env.OPA_POLICY_PATH || 'summit/abac/decision'),
  );

  return Array.from(new Set(endpoints)).map(buildEndpoint);
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
  const endpoints = tenantAwarePaths(input.subject.tenantId);
  try {
    for (const endpoint of endpoints) {
      try {
        const res = await axios.post(endpoint, { input });
        const result = res.data?.result;
        if (result === null || result === undefined) {
          continue;
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
        const status = (error as { response?: { status?: number } }).response
          ?.status;
        if (status === 404) {
          continue;
        }
        if (process.env.NODE_ENV !== 'test') {
          logger.warn(
            { err: error, endpoint },
            'OPA evaluation endpoint failed',
          );
        }
      }
    }
    return { allowed: false, reason: 'opa_no_result', obligations: [] };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      logger.error({ err: error }, 'OPA evaluation failed');
    }
    return { allowed: false, reason: 'opa_error', obligations: [] };
  }
}
