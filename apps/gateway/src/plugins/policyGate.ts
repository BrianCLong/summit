import type { ApolloServerPlugin } from '@apollo/server';
import { PolicyClient } from '../../../../sdk/typescript/src/policy/client';

const DEFAULT_POLICY_URL =
  process.env.POLICY_SIDECAR_URL || process.env.POLICY_API_URL || 'http://127.0.0.1:8181';

export function policyGatePlugin(): ApolloServerPlugin {
  const client = new PolicyClient({ baseUrl: DEFAULT_POLICY_URL });
  return {
    async requestDidStart(requestContext) {
      return {
        async didResolveOperation(context) {
          const headers = context.request.http?.headers;
          const subject = buildSubject(headers);
          const resource = buildResource(headers, context.operationName || context.request.operationName || 'graphql');
          const policyContext = buildContext(headers);
          const action = context.operationName || context.request.operationName || 'graphql';
          const decision = await client.evaluate({ subject, resource, action, context: policyContext });
          context.contextValue = {
            ...(context.contextValue ?? {}),
            policyDecision: decision,
            policySubject: subject,
            policyContext,
          };
          if (!decision.allow) {
            throw new PolicyError(decision.reason);
          }
        },
      };
    },
  };
}

class PolicyError extends Error {
  extensions: { http: { status: number }; policy: { reason: string } };

  constructor(reason: string) {
    super('Forbidden');
    this.extensions = {
      http: { status: 403 },
      policy: { reason },
    };
  }
}

function buildSubject(headers: Headers | undefined) {
  const tenant = readHeader(headers, 'x-tenant');
  const roles = parseList(readHeader(headers, 'x-role'));
  const purposes = parseList(readHeader(headers, 'x-purpose'));
  return {
    id: readHeader(headers, 'x-subject') || 'anonymous',
    clearance: readHeader(headers, 'x-clearance') || '',
    license: readHeader(headers, 'x-license') || '',
    tenants: tenant ? parseList(tenant) : [],
    roles,
    purposes,
  };
}

function buildResource(headers: Headers | undefined, fallbackId: string) {
  return {
    id: readHeader(headers, 'x-resource-id') || fallbackId,
    classification: readHeader(headers, 'x-resource-classification') || '',
    license: parseList(readHeader(headers, 'x-resource-license')),
    tenants: parseList(readHeader(headers, 'x-resource-tenant')),
    allowed_purposes: parseList(readHeader(headers, 'x-resource-purpose')),
    actions: parseList(readHeader(headers, 'x-resource-actions')),
  };
}

function buildContext(headers: Headers | undefined) {
  const tenant = readHeader(headers, 'x-tenant') || '';
  const roles = parseList(readHeader(headers, 'x-role'));
  return {
    tenant,
    role: roles[0] || '',
    purpose: readHeader(headers, 'x-purpose') || '',
    clearance: readHeader(headers, 'x-clearance') || '',
  };
}

function readHeader(headers: Headers | undefined, name: string): string | null {
  return headers?.get(name) ?? null;
}

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
