// services/interop/policy-wrapper.ts
// MC v0.3.2 - Shared policy enforcement for interop gateways

import { logger } from '../config/logger';
import { simulateOPA } from '../middleware/opa-client';
import { validateResidency } from '../middleware/residency-validator';
import { auditDecision } from './audit';

export interface PolicyContext {
  tenantId: string;
  purpose: string;
  residency: string;
  pqid?: string;
  userId?: string;
  sessionId?: string;
}

export interface PolicyAction {
  kind: string;  // 'tool', 'a2a', 'mcp'
  resource: string;
  method?: string;
  parameters?: Record<string, any>;
}

export interface PolicyResult {
  allowed: boolean;
  reasons?: string[];
  constraints?: Record<string, any>;
  auditEventId?: string;
}

/**
 * Enforce comprehensive policy checks for interop operations
 * All external interactions must pass through this gateway
 */
export async function enforcePolicy(
  ctx: PolicyContext,
  action: PolicyAction
): Promise<PolicyResult> {
  const startTime = Date.now();

  try {
    // Phase 1: Validate required context
    validatePolicyContext(ctx);

    // Phase 2: OPA policy simulation
    const opaResult = await simulateOPA({
      input: {
        tenant_id: ctx.tenantId,
        purpose: ctx.purpose,
        residency: ctx.residency,
        action: action,
        timestamp: new Date().toISOString()
      }
    });

    if (!opaResult.allow) {
      const result: PolicyResult = {
        allowed: false,
        reasons: opaResult.reasons || ['OPA_DENY'],
        auditEventId: await auditDecision('policy.deny', {
          ...ctx,
          action,
          reasons: opaResult.reasons,
          duration_ms: Date.now() - startTime
        })
      };

      logger.warn('Policy denied interop operation', { ctx, action, reasons: result.reasons });
      return result;
    }

    // Phase 3: Residency validation
    const residencyResult = await validateResidency(ctx.residency, ctx.tenantId);
    if (!residencyResult.valid) {
      const result: PolicyResult = {
        allowed: false,
        reasons: ['RESIDENCY_VIOLATION', ...residencyResult.violations],
        auditEventId: await auditDecision('residency.violation', {
          ...ctx,
          action,
          violations: residencyResult.violations,
          duration_ms: Date.now() - startTime
        })
      };

      logger.error('Residency violation in interop operation', { ctx, action, violations: residencyResult.violations });
      return result;
    }

    // Phase 4: Persisted-only enforcement for GraphQL operations
    if (action.kind === 'tool' && action.resource.includes('graph') && !ctx.pqid) {
      const result: PolicyResult = {
        allowed: false,
        reasons: ['PERSISTED_QUERY_REQUIRED'],
        auditEventId: await auditDecision('persisted.violation', {
          ...ctx,
          action,
          duration_ms: Date.now() - startTime
        })
      };

      logger.warn('Non-persisted query blocked', { ctx, action });
      return result;
    }

    // Success - log and return approval
    const result: PolicyResult = {
      allowed: true,
      constraints: opaResult.constraints || {},
      auditEventId: await auditDecision('policy.allow', {
        ...ctx,
        action,
        duration_ms: Date.now() - startTime
      })
    };

    logger.info('Policy approved interop operation', { ctx, action, constraints: result.constraints });
    return result;

  } catch (error) {
    logger.error('Policy enforcement error', { error: error.message, ctx, action });

    // Fail closed on policy errors
    return {
      allowed: false,
      reasons: ['POLICY_ERROR', error.message],
      auditEventId: await auditDecision('policy.error', {
        ...ctx,
        action,
        error: error.message,
        duration_ms: Date.now() - startTime
      })
    };
  }
}

function validatePolicyContext(ctx: PolicyContext): void {
  const required = ['tenantId', 'purpose', 'residency'];
  for (const field of required) {
    if (!ctx[field as keyof PolicyContext]) {
      throw new Error(`Required policy context field missing: ${field}`);
    }
  }

  // Validate purpose is from approved set
  const validPurposes = ['investigation', 'threat-intel', 'compliance', 'audit', 'research'];
  if (!validPurposes.includes(ctx.purpose)) {
    throw new Error(`Invalid purpose: ${ctx.purpose}. Must be one of: ${validPurposes.join(', ')}`);
  }
}
