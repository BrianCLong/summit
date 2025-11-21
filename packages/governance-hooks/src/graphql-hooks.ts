/**
 * GraphQL Governance Hooks
 *
 * Hooks for integrating governance into Apollo Server GraphQL resolvers.
 */

import type { GraphQLResolveInfo } from 'graphql';

// Types from authority-compiler (would import in production)
type Operation = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'SHARE' | 'COPILOT' | 'QUERY' | 'ANNOTATE' | 'LINK';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface GraphQLGovernanceContext {
  user: {
    id: string;
    roles: string[];
    tenantId: string;
    clearance?: string;
    compartments?: string[];
  };
  request: {
    ip?: string;
    userAgent?: string;
    correlationId?: string;
  };
  policyDecision?: {
    allowed: boolean;
    authorityId?: string;
    reason: string;
    redactedFields?: string[];
    maxResults?: number;
  };
}

export interface GovernancePlugin {
  /** Called before resolver execution */
  beforeResolve?: (context: ResolverContext) => Promise<void>;
  /** Called after resolver execution */
  afterResolve?: (context: ResolverContext, result: unknown) => Promise<unknown>;
  /** Called on resolver error */
  onError?: (context: ResolverContext, error: Error) => Promise<void>;
}

export interface ResolverContext {
  /** GraphQL context */
  context: GraphQLGovernanceContext;
  /** Resolver info */
  info: GraphQLResolveInfo;
  /** Resolver arguments */
  args: Record<string, unknown>;
  /** Operation type */
  operation: Operation;
  /** Resource being accessed */
  resource: {
    type?: string;
    id?: string;
    investigationId?: string;
  };
}

// -----------------------------------------------------------------------------
// Authority Hook
// -----------------------------------------------------------------------------

export function createAuthorityHook(evaluator: any): GovernancePlugin {
  return {
    async beforeResolve(ctx: ResolverContext) {
      const decision = await evaluator.evaluate({
        user: ctx.context.user,
        operation: ctx.operation,
        resource: ctx.resource,
        request: {
          timestamp: new Date(),
          ip: ctx.context.request.ip,
          userAgent: ctx.context.request.userAgent,
        },
      });

      if (!decision.allowed) {
        throw new AuthorizationError(decision.reason, decision.auditId);
      }

      ctx.context.policyDecision = decision;
    },
  };
}

// -----------------------------------------------------------------------------
// PII Detection Hook
// -----------------------------------------------------------------------------

export interface PIIConfig {
  patterns: Array<{
    name: string;
    regex: RegExp;
    action: 'redact' | 'mask' | 'block' | 'log';
  }>;
  redactionText?: string;
}

export function createPIIDetectionHook(config: PIIConfig): GovernancePlugin {
  const { patterns, redactionText = '[REDACTED]' } = config;

  return {
    async afterResolve(ctx: ResolverContext, result: unknown) {
      return redactPII(result, patterns, redactionText);
    },
  };
}

function redactPII(data: unknown, patterns: PIIConfig['patterns'], redactionText: string): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    let result = data;
    for (const pattern of patterns) {
      if (pattern.action === 'redact') {
        result = result.replace(pattern.regex, redactionText);
      } else if (pattern.action === 'mask') {
        result = result.replace(pattern.regex, (match) => '*'.repeat(match.length));
      }
    }
    return result;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactPII(item, patterns, redactionText));
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = redactPII(value, patterns, redactionText);
    }
    return result;
  }

  return data;
}

// Default PII patterns
export const DEFAULT_PII_PATTERNS: PIIConfig['patterns'] = [
  { name: 'SSN', regex: /\b\d{3}-?\d{2}-?\d{4}\b/g, action: 'redact' },
  { name: 'Credit Card', regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, action: 'redact' },
  { name: 'Email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, action: 'mask' },
  { name: 'Phone', regex: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, action: 'mask' },
  { name: 'Passport', regex: /\b[A-Z]{1,2}\d{6,9}\b/g, action: 'redact' },
  { name: 'IP Address', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, action: 'mask' },
];

// -----------------------------------------------------------------------------
// Audit Hook
// -----------------------------------------------------------------------------

export interface AuditLogger {
  log(event: AuditEvent): Promise<void>;
}

export interface AuditEvent {
  eventType: string;
  userId: string;
  tenantId: string;
  operation: Operation;
  resourceType?: string;
  resourceId?: string;
  investigationId?: string;
  authorityId?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export function createAuditHook(logger: AuditLogger): GovernancePlugin {
  return {
    async afterResolve(ctx: ResolverContext, result: unknown) {
      await logger.log({
        eventType: 'graphql_resolve',
        userId: ctx.context.user.id,
        tenantId: ctx.context.user.tenantId,
        operation: ctx.operation,
        resourceType: ctx.resource.type,
        resourceId: ctx.resource.id,
        investigationId: ctx.resource.investigationId,
        authorityId: ctx.context.policyDecision?.authorityId,
        success: true,
        timestamp: new Date(),
      });
      return result;
    },

    async onError(ctx: ResolverContext, error: Error) {
      await logger.log({
        eventType: 'graphql_error',
        userId: ctx.context.user.id,
        tenantId: ctx.context.user.tenantId,
        operation: ctx.operation,
        resourceType: ctx.resource.type,
        resourceId: ctx.resource.id,
        investigationId: ctx.resource.investigationId,
        success: false,
        errorMessage: error.message,
        timestamp: new Date(),
      });
    },
  };
}

// -----------------------------------------------------------------------------
// Provenance Hook
// -----------------------------------------------------------------------------

export interface ProvenanceRecorder {
  recordStep(step: ProvenanceStep): Promise<string>;
}

export interface ProvenanceStep {
  type: string;
  userId: string;
  tenantId: string;
  operation: Operation;
  inputHash?: string;
  outputHash?: string;
  entityIds?: string[];
  metadata?: Record<string, unknown>;
}

export function createProvenanceHook(recorder: ProvenanceRecorder): GovernancePlugin {
  return {
    async afterResolve(ctx: ResolverContext, result: unknown) {
      // Only record for mutations
      if (!['CREATE', 'UPDATE', 'DELETE', 'LINK'].includes(ctx.operation)) {
        return result;
      }

      await recorder.recordStep({
        type: `graphql_${ctx.operation.toLowerCase()}`,
        userId: ctx.context.user.id,
        tenantId: ctx.context.user.tenantId,
        operation: ctx.operation,
        entityIds: extractEntityIds(result),
        metadata: {
          fieldName: ctx.info.fieldName,
          args: sanitizeArgs(ctx.args),
        },
      });

      return result;
    },
  };
}

function extractEntityIds(result: unknown): string[] {
  if (!result) return [];

  if (Array.isArray(result)) {
    return result.flatMap((item) => extractEntityIds(item));
  }

  if (typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>;
    if (typeof obj.id === 'string') {
      return [obj.id];
    }
  }

  return [];
}

function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  // Remove sensitive fields from args before logging
  const sanitized = { ...args };
  const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'authorization'];

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

// -----------------------------------------------------------------------------
// Result Limiting Hook
// -----------------------------------------------------------------------------

export function createResultLimitHook(): GovernancePlugin {
  return {
    async afterResolve(ctx: ResolverContext, result: unknown) {
      const maxResults = ctx.context.policyDecision?.maxResults;

      if (maxResults && Array.isArray(result)) {
        return result.slice(0, maxResults);
      }

      return result;
    },
  };
}

// -----------------------------------------------------------------------------
// Field Redaction Hook
// -----------------------------------------------------------------------------

export function createFieldRedactionHook(): GovernancePlugin {
  return {
    async afterResolve(ctx: ResolverContext, result: unknown) {
      const redactedFields = ctx.context.policyDecision?.redactedFields;

      if (!redactedFields || redactedFields.length === 0) {
        return result;
      }

      return redactFields(result, redactedFields);
    },
  };
}

function redactFields(data: unknown, fields: string[]): unknown {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactFields(item, fields));
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (fields.includes(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactFields(value, fields);
      }
    }
    return result;
  }

  return data;
}

// -----------------------------------------------------------------------------
// Composite Hook
// -----------------------------------------------------------------------------

export function composeHooks(...hooks: GovernancePlugin[]): GovernancePlugin {
  return {
    async beforeResolve(ctx: ResolverContext) {
      for (const hook of hooks) {
        if (hook.beforeResolve) {
          await hook.beforeResolve(ctx);
        }
      }
    },

    async afterResolve(ctx: ResolverContext, result: unknown) {
      let current = result;
      for (const hook of hooks) {
        if (hook.afterResolve) {
          current = await hook.afterResolve(ctx, current);
        }
      }
      return current;
    },

    async onError(ctx: ResolverContext, error: Error) {
      for (const hook of hooks) {
        if (hook.onError) {
          await hook.onError(ctx, error);
        }
      }
    },
  };
}

// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------

export class AuthorizationError extends Error {
  constructor(message: string, public auditId?: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}
