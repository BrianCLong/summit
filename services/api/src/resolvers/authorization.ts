import fetch, { type Response } from 'node-fetch';
import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../graphql/context.js';
import { tracer } from './telemetry.js';

const DEFAULT_OPA_URL = process.env.OPA_URL || 'http://localhost:8181/v1/data/authz/allow';

export interface AuthorizationResource {
  type: string;
  id?: string;
  tenantId: string;
  attributes?: Record<string, unknown>;
}

export interface AuthorizationCheck {
  resource: AuthorizationResource;
  action: string;
  scope?: string;
}

function resolveFetch(context: GraphQLContext): typeof fetch {
  return (context as unknown as { fetch?: typeof fetch }).fetch || fetch;
}

function opaUrl(): string {
  return DEFAULT_OPA_URL;
}

export async function enforceAuthorization(
  context: GraphQLContext,
  check: AuthorizationCheck,
): Promise<void> {
  const tenantId = check.resource.tenantId || context.tenant?.id || context.user?.tenantId;

  const span = tracer.startSpan('opa.authorize', {
    attributes: {
      'authz.action': check.action,
      'authz.resource.type': check.resource.type,
      'authz.resource.id': check.resource.id || 'n/a',
      'tenant.id': tenantId || 'unknown',
    },
  });

  try {
    if (!context.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'AUTHN_REQUIRED' },
      });
    }

    if (!tenantId) {
      throw new GraphQLError('Tenant scope missing', {
        extensions: { code: 'VALIDATION_FAILED' },
      });
    }

    const payload = {
      input: {
        user: {
          id: context.user.id,
          role: context.user.role,
          tenantId,
          permissions: context.user.permissions,
        },
        resource: {
          ...check.resource,
          tenantId,
        },
        action: check.action,
        scope: check.scope,
        attributes: check.resource.attributes,
      },
    };

    const opaResponse: Response = await resolveFetch(context)(opaUrl(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!opaResponse.ok) {
      throw new Error(`OPA responded with ${opaResponse.status}`);
    }

    const decision = await opaResponse.json();
    const result = typeof decision.result === 'boolean' ? decision.result : decision.result?.allow;

    if (!result) {
      span.addEvent('opa.decision.denied', {
        reason: decision.result?.reason || 'policy_denied',
      });
      throw new GraphQLError('Access denied by policy', {
        extensions: {
          code: 'AUTHZ_DENIED',
          details: decision.result || null,
        },
      });
    }

    span.addEvent('opa.decision.allow');
  } catch (error) {
    span.recordException(error as Error);

    if (error instanceof GraphQLError) {
      throw error;
    }

    throw new GraphQLError('Access denied by policy', {
      extensions: {
        code: 'AUTHZ_DENIED',
        details: {
          reason: error instanceof Error ? error.message : 'unknown_error',
        },
      },
    });
  } finally {
    span.end();
  }
}
