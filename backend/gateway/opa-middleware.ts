/**
 * OPA ABAC Enforcement Middleware for Apollo Gateway
 * 
 * Integrates Open Policy Agent (OPA) for attribute-based access control:
 * - Cross-tenant isolation enforcement
 * - Field-level redaction for sensitive data
 * - Purpose/retention metadata tagging
 * - Audit logging for all policy decisions
 * 
 * Performance: < 50ms p95 for policy evaluation
 * Security: Fail-closed (default deny)
 */

import { ApolloServerPlugin } from '@apollo/server';
import { GraphQLRequestContext } from '@apollo/server/types';
import axios from 'axios';

interface OPAConfig {
  endpoint: string;  // OPA server URL
  timeout: number;   // Request timeout (ms)
  policyPath: string; // Path to policy in OPA
}

interface PolicyDecision {
  allowed: boolean;
  redactedFields?: string[];
  auditMetadata?: {
    decision: string;
    reason?: string;
    timestamp: string;
  };
}

interface AuditLog {
  timestamp: string;
  tenantId: string;
  userId: string;
  operation: string;
  decision: 'allow' | 'deny';
  reason?: string;
  policyVersion?: string;
}

export class OPAMiddleware implements ApolloServerPlugin {
  private config: OPAConfig;
  private auditLogger: (log: AuditLog) => void;

  constructor(
    config: OPAConfig,
    auditLogger?: (log: AuditLog) => void
  ) {
    this.config = {
      timeout: 50, // Default 50ms to meet p95 requirement
      ...config,
    };
    this.auditLogger = auditLogger || this.defaultAuditLogger;
  }

  async requestDidStart(
    requestContext: GraphQLRequestContext<any>
  ): Promise<any> {
    const { request, contextValue } = requestContext;

    // Extract authentication context
    const tenantId = contextValue?.user?.tenantId;
    const userId = contextValue?.user?.id;
    const roles = contextValue?.user?.roles || [];

    if (!tenantId || !userId) {
      this.audit({
        timestamp: new Date().toISOString(),
        tenantId: tenantId || 'unknown',
        userId: userId || 'unknown',
        operation: request.operationName || 'unknown',
        decision: 'deny',
        reason: 'Missing authentication context',
      });
      throw new Error('Unauthorized: Missing authentication context');
    }

    // Prepare OPA input
    const opaInput = {
      input: {
        user: {
          id: userId,
          tenantId: tenantId,
          roles: roles,
        },
        request: {
          operation: request.operationName,
          query: request.query,
          variables: request.variables,
        },
        context: {
          timestamp: new Date().toISOString(),
        },
      },
    };

    try {
      // Call OPA for policy decision
      const startTime = Date.now();
      const decision = await this.evaluatePolicy(opaInput);
      const evalTime = Date.now() - startTime;

      // Log performance warning if > 50ms
      if (evalTime > 50) {
        console.warn(`OPA evaluation took ${evalTime}ms (> 50ms p95 target)`);
      }

      if (!decision.allowed) {
        // Log denied access with audit trail
        this.audit({
          timestamp: new Date().toISOString(),
          tenantId,
          userId,
          operation: request.operationName || 'unknown',
          decision: 'deny',
          reason: decision.auditMetadata?.reason || 'Policy denied',
        });

        // Return 403 with audit metadata
        throw new Error(`Forbidden: ${decision.auditMetadata?.reason || 'Access denied by policy'}`);
      }

      // Apply field-level redaction
      if (decision.redactedFields && decision.redactedFields.length > 0) {
        contextValue.redactedFields = decision.redactedFields;
      }

      // Log allowed access
      this.audit({
        timestamp: new Date().toISOString(),
        tenantId,
        userId,
        operation: request.operationName || 'unknown',
        decision: 'allow',
      });

      return {
        async willSendResponse(responseContext: any) {
          // Post-process response to redact sensitive fields
          if (contextValue.redactedFields) {
            responseContext.response.data = redactFields(
              responseContext.response.data,
              contextValue.redactedFields
            );
          }
        },
      };
    } catch (error: any) {
      // Fail-closed: Deny access if policy evaluation fails
      this.audit({
        timestamp: new Date().toISOString(),
        tenantId,
        userId,
        operation: request.operationName || 'unknown',
        decision: 'deny',
        reason: `Policy evaluation error: ${error.message}`,
      });

      throw new Error(`Policy evaluation failed: ${error.message}`);
    }
  }

  /**
   * Evaluate policy using OPA
   */
  private async evaluatePolicy(input: any): Promise<PolicyDecision> {
    try {
      const response = await axios.post(
        `${this.config.endpoint}${this.config.policyPath}`,
        input,
        {
          timeout: this.config.timeout,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return {
        allowed: response.data.result?.allowed || false,
        redactedFields: response.data.result?.redactedFields || [],
        auditMetadata: response.data.result?.audit,
      };
    } catch (error: any) {
      // Fail-closed on error
      console.error('OPA policy evaluation failed:', error.message);
      throw new Error('Policy evaluation unavailable');
    }
  }

  /**
   * Audit log handler
   */
  private audit(log: AuditLog): void {
    this.auditLogger(log);
  }

  /**
   * Default audit logger (console)
   */
  private defaultAuditLogger(log: AuditLog): void {
    // Ensure no PII in logs (per security requirements)
    const sanitizedLog = {
      timestamp: log.timestamp,
      tenantId: log.tenantId,
      userId: hashUserId(log.userId), // Hash for privacy
      operation: log.operation,
      decision: log.decision,
      reason: log.reason,
    };
    console.log('[OPA-AUDIT]', JSON.stringify(sanitizedLog));
  }
}

/**
 * Redact sensitive fields from response
 */
function redactFields(data: any, fieldsToRedact: string[]): any {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactFields(item, fieldsToRedact));
  }

  const redacted = { ...data };
  for (const field of fieldsToRedact) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }

  // Recursively redact nested objects
  for (const key in redacted) {
    if (typeof redacted[key] === 'object') {
      redacted[key] = redactFields(redacted[key], fieldsToRedact);
    }
  }

  return redacted;
}

/**
 * Hash user ID for privacy (no PII in audit logs)
 */
function hashUserId(userId: string): string {
  // Simple hash for demo - use crypto.createHash in production
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `user_${Math.abs(hash).toString(36)}`;
}

/**
 * Cross-tenant isolation validator
 * Checks if request attempts to access data from different tenant
 */
export function validateCrossTenantAccess(
  requestTenantId: string,
  resourceTenantId: string
): boolean {
  return requestTenantId === resourceTenantId;
}

/**
 * Purpose/retention tag applier
 */
export interface RetentionMetadata {
  purpose: string[];   // e.g., ['analytics', 'compliance']
  retentionDays: number;
  createdAt: string;
}

export function applyRetentionTags(
  data: any,
  metadata: RetentionMetadata
): any {
  return {
    ...data,
    _metadata: {
      purpose: metadata.purpose,
      retentionDays: metadata.retentionDays,
      expiresAt: new Date(
        new Date(metadata.createdAt).getTime() +
          metadata.retentionDays * 24 * 60 * 60 * 1000
      ).toISOString(),
    },
  };
}

export default OPAMiddleware;
