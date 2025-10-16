/**
 * Enhanced OPA Middleware with Appeal System - GA Core Implementation
 * 
 * Features:
 * - Policy-by-default denials with structured appeal paths
 * - Appeal SLA tracking and escalation
 * - Complete audit trail for policy decisions
 * - UI-friendly denial payloads with reason + appeal info
 * - Data Steward role integration
 */

import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import logger from '../config/logger';
import { getPostgresPool } from '../config/database';
import { writeAudit } from '../utils/audit.js';

const log = logger.child({ name: 'OPAWithAppeals' });

// GA Core appeal configuration
const APPEAL_CONFIG = {
  defaultSlaHours: 24,
  escalationHours: 48,
  requiredRole: 'DATA_STEWARD',
  maxAppealRequests: 3
};

interface User {
  id?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  permissions?: string[];
}

interface PolicyInput {
  user?: User;
  action: string;
  resource: {
    type: string;
    field?: string;
    path?: string;
    method?: string;
    args?: any;
    params?: any;
    query?: any;
  };
  context: {
    investigationId?: string;
    entityType?: string;
    tenantId?: string;
    ip?: string;
    userAgent?: string;
  };
}

interface AppealPath {
  available: boolean;
  appealId?: string;
  requiredRole: string;
  slaHours: number;
  escalationHours: number;
  instructions: string;
  submitUrl: string;
  statusUrl?: string;
}

interface PolicyDecisionWithAppeal {
  allowed: boolean;
  policy: string;
  reason: string;
  appeal?: AppealPath;
  decisionId: string;
  timestamp: string;
  ttl?: number;
  metadata?: {
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    requiresJustification?: boolean;
    alternatives?: string[];
  };
}

interface AppealRequest {
  id: string;
  decisionId: string;
  userId: string;
  justification: string;
  businessNeed: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requestedDuration?: string; // ISO duration
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
  createdAt: Date;
  respondedAt?: Date;
  respondedBy?: string;
  responseReason?: string;
}

export class OPAWithAppealsMiddleware {
  private opaUrl: string;
  private policyCache = new Map<string, { decision: PolicyDecisionWithAppeal; expires: number }>();
  private readonly cacheTtl = 300000; // 5 minutes

  constructor(opaUrl: string = process.env.OPA_URL || 'http://localhost:8181') {
    this.opaUrl = opaUrl;
  }

  /**
   * Express middleware for OPA policy evaluation with appeals
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const decision = await this.evaluatePolicy(req);
        
        if (decision.allowed) {
          // Log successful authorization
          await this.auditDecision(req, decision, 'ALLOWED');
          return next();
        }

        // Policy denied - return structured response with appeal path
        await this.auditDecision(req, decision, 'DENIED');
        
        return res.status(403).json({
          error: 'Access Denied',
          code: 'POLICY_VIOLATION',
          decision,
          // Include appeal information in response
          appeal: decision.appeal
        });

      } catch (error) {
        log.error({ error: error.message, path: req.path }, 'OPA evaluation failed');
        
        // Fail secure - deny access on policy evaluation errors
        const failSecureDecision: PolicyDecisionWithAppeal = {
          allowed: false,
          policy: 'system.fail_secure',
          reason: 'Policy evaluation failed - access denied for security',
decisionId: randomUUID(),
          timestamp: new Date().toISOString(),
          appeal: this.createAppealPath('SYSTEM_ERROR')
        };

        await this.auditDecision(req, failSecureDecision, 'ERROR');

        return res.status(503).json({
          error: 'Policy Service Unavailable',
          code: 'POLICY_SERVICE_ERROR',
          decision: failSecureDecision
        });
      }
    };
  }

  /**
   * GraphQL resolver wrapper for field-level authorization
   */
  wrapResolver(originalResolver: any, resourceType: string) {
    return async (parent: any, args: any, context: any, info: any) => {
      const policyInput: PolicyInput = {
        user: context.user,
        action: `graphql.${info.operation.operation}`,
        resource: {
          type: resourceType,
          field: info.fieldName,
          path: info.path,
          args: args
        },
        context: {
          tenantId: context.user?.tenantId,
          ip: context.req?.ip,
          userAgent: context.req?.get('user-agent')
        }
      };

      const decision = await this.evaluatePolicy(policyInput);

      if (!decision.allowed) {
        await this.auditDecision(policyInput, decision, 'DENIED');
        
        throw new Error(`Access denied: ${decision.reason}${
          decision.appeal?.available ? ` (Appeal ID: ${decision.appeal.appealId})` : ''
        }`);
      }

      await this.auditDecision(policyInput, decision, 'ALLOWED');
      return originalResolver(parent, args, context, info);
    };
  }

  /**
   * Evaluate policy with OPA and create appeal path if denied
   */
  private async evaluatePolicy(
    input: Request | PolicyInput
  ): Promise<PolicyDecisionWithAppeal> {
    let policyInput: PolicyInput;

    if ('method' in input) {
      // Express Request
      policyInput = this.buildPolicyInputFromRequest(input);
    } else {
      // Direct PolicyInput
      policyInput = input;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(policyInput);
    const cached = this.policyCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.decision;
    }

    try {
      // Evaluate policy with OPA
      const response = await axios.post(`${this.opaUrl}/v1/data/intelgraph/allow`, {
        input: policyInput
      }, { timeout: 5000 });

      const opaResult = response.data.result;
      
      const decision: PolicyDecisionWithAppeal = {
        allowed: opaResult.allow || false,
        policy: opaResult.policy || 'unknown',
        reason: opaResult.reason || 'Access denied by policy',
decisionId: randomUUID(),
        timestamp: new Date().toISOString(),
        ttl: this.cacheTtl,
        metadata: opaResult.metadata
      };

      // Add appeal path if access is denied
      if (!decision.allowed) {
        decision.appeal = this.createAppealPath(
          opaResult.policy,
          policyInput,
          decision.decisionId
        );
      }

      // Cache the decision
      this.policyCache.set(cacheKey, {
        decision,
        expires: Date.now() + this.cacheTtl
      });

      return decision;

    } catch (error) {
      log.error({ error: error.message, input: policyInput }, 'OPA request failed');
      throw error;
    }
  }

  /**
   * Create structured appeal path based on policy violation
   */
  private createAppealPath(
    policy: string,
    policyInput?: PolicyInput,
    decisionId?: string
  ): AppealPath {
const appealId = randomUUID();
    
    // Determine if appeal is available based on policy type
    const appealable = !policy.includes('security.critical') && 
                      !policy.includes('compliance.mandatory');

    if (!appealable) {
      return {
        available: false,
        requiredRole: APPEAL_CONFIG.requiredRole,
        slaHours: 0,
        escalationHours: 0,
        instructions: 'This policy violation cannot be appealed due to security or compliance requirements.',
        submitUrl: ''
      };
    }

    // Calculate SLA based on resource sensitivity
    let slaHours = APPEAL_CONFIG.defaultSlaHours;
    let escalationHours = APPEAL_CONFIG.escalationHours;

    if (policyInput?.resource.type === 'sensitive_data' || 
        policyInput?.context.investigationId) {
      slaHours = 12; // Faster SLA for sensitive resources
      escalationHours = 24;
    }

    return {
      available: true,
      appealId,
      requiredRole: APPEAL_CONFIG.requiredRole,
      slaHours,
      escalationHours,
      instructions: this.getAppealInstructions(policy),
      submitUrl: `/api/policy/appeals`,
      statusUrl: `/api/policy/appeals/${appealId}/status`
    };
  }

  /**
   * Get contextual appeal instructions based on policy
   */
  private getAppealInstructions(policy: string): string {
    const instructions = {
      'data.access_denied': 'To appeal this data access denial, provide business justification and specify the minimum data needed.',
      'export.volume_exceeded': 'To appeal this export limit, justify the business need for the full dataset and confirm data handling procedures.',
      'query.complexity_exceeded': 'To appeal this query complexity limit, provide technical justification and confirm query optimization attempts.',
      'time.outside_hours': 'To appeal this time restriction, provide urgency justification and manager approval.',
      'default': 'To appeal this policy decision, provide detailed business justification and specify the duration needed.'
    };

    return instructions[policy] || instructions.default;
  }

  /**
   * Submit appeal request
   */
  async submitAppeal(
    decisionId: string,
    userId: string,
    justification: string,
    businessNeed: string,
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    requestedDuration?: string
  ): Promise<AppealRequest> {
    const pool = getPostgresPool();
    
    const appealRequest: AppealRequest = {
id: randomUUID(),
      decisionId,
      userId,
      justification,
      businessNeed,
      urgency,
      requestedDuration,
      status: 'PENDING',
      createdAt: new Date()
    };

    try {
      await pool.query(`
        INSERT INTO policy_appeals (
          id, decision_id, user_id, justification, business_need,
          urgency, requested_duration, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        appealRequest.id,
        appealRequest.decisionId,
        appealRequest.userId,
        appealRequest.justification,
        appealRequest.businessNeed,
        appealRequest.urgency,
        appealRequest.requestedDuration,
        appealRequest.status,
        appealRequest.createdAt
      ]);

      // Create audit entry
      await writeAudit({
        action: 'POLICY_APPEAL_SUBMITTED',
        userId: appealRequest.userId,
        resourceType: 'PolicyDecision',
        resourceId: appealRequest.decisionId,
        details: {
          appealId: appealRequest.id,
          urgency: appealRequest.urgency,
          justification: appealRequest.justification.substring(0, 100)
        }
      });

      log.info({
        appealId: appealRequest.id,
        decisionId,
        userId,
        urgency
      }, 'Policy appeal submitted');

      return appealRequest;

    } catch (error) {
      log.error({
        error: error.message,
        decisionId,
        userId
      }, 'Failed to submit policy appeal');
      
      throw error;
    }
  }

  /**
   * Process appeal response (Data Steward action)
   */
  async processAppealResponse(
    appealId: string,
    responderId: string,
    approved: boolean,
    reason: string,
    grantedDuration?: string
  ): Promise<AppealRequest> {
    const pool = getPostgresPool();

    try {
      const result = await pool.query(`
        UPDATE policy_appeals 
        SET status = $1, responded_at = NOW(), responded_by = $2, response_reason = $3
        WHERE id = $4
        RETURNING *
      `, [
        approved ? 'APPROVED' : 'DENIED',
        responderId,
        reason,
        appealId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Appeal not found');
      }

      const appeal = result.rows[0];

      // If approved, create temporary policy override
      if (approved) {
        await this.createPolicyOverride(
          appeal.decision_id,
          appeal.user_id,
          grantedDuration || '24 hours',
          responderId
        );
      }

      // Audit the response
      await writeAudit({
        action: approved ? 'POLICY_APPEAL_APPROVED' : 'POLICY_APPEAL_DENIED',
        userId: responderId,
        resourceType: 'PolicyAppeal',
        resourceId: appealId,
        details: {
          originalUserId: appeal.user_id,
          decisionId: appeal.decision_id,
          reason,
          grantedDuration: approved ? grantedDuration : null
        }
      });

      log.info({
        appealId,
        approved,
        responderId,
        originalUserId: appeal.user_id
      }, 'Policy appeal processed');

      return {
        id: appeal.id,
        decisionId: appeal.decision_id,
        userId: appeal.user_id,
        justification: appeal.justification,
        businessNeed: appeal.business_need,
        urgency: appeal.urgency,
        requestedDuration: appeal.requested_duration,
        status: appeal.status,
        createdAt: appeal.created_at,
        respondedAt: appeal.responded_at,
        respondedBy: appeal.responded_by,
        responseReason: appeal.response_reason
      };

    } catch (error) {
      log.error({
        error: error.message,
        appealId,
        responderId
      }, 'Failed to process appeal response');
      
      throw error;
    }
  }

  private async createPolicyOverride(
    decisionId: string,
    userId: string,
    duration: string,
    approvedBy: string
  ): Promise<void> {
    const pool = getPostgresPool();

    const expiresAt = new Date();
    // Parse duration (simple implementation)
    const hours = parseInt(duration.match(/(\d+)\s*hour/i)?.[1] || '24');
    expiresAt.setHours(expiresAt.getHours() + hours);

    await pool.query(`
      INSERT INTO policy_overrides (
        id, decision_id, user_id, approved_by, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
randomUUID(),
      decisionId,
      userId,
      approvedBy,
      expiresAt
    ]);

    log.info({
      decisionId,
      userId,
      approvedBy,
      expiresAt
    }, 'Policy override created');
  }

  private buildPolicyInputFromRequest(req: Request): PolicyInput {
    return {
      user: (req as any).user,
      action: `http.${req.method.toLowerCase()}`,
      resource: {
        type: 'api_endpoint',
        path: req.path,
        method: req.method,
        params: req.params,
        query: req.query
      },
      context: {
        tenantId: (req as any).user?.tenantId,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    };
  }

  private getCacheKey(input: PolicyInput): string {
    return JSON.stringify({
      user: input.user?.id,
      action: input.action,
      resource: input.resource,
      tenant: input.context.tenantId
    });
  }

  private async auditDecision(
    input: Request | PolicyInput,
    decision: PolicyDecisionWithAppeal,
    outcome: 'ALLOWED' | 'DENIED' | 'ERROR'
  ): Promise<void> {
    let userId: string | undefined;
    let resourceType: string;
    let resourceId: string;

    if ('method' in input) {
      userId = (input as any).user?.id;
      resourceType = 'APIEndpoint';
      resourceId = input.path;
    } else {
      userId = input.user?.id;
      resourceType = input.resource.type;
      resourceId = input.resource.path || input.resource.field || 'unknown';
    }

    await writeAudit({
      action: `POLICY_DECISION_${outcome}`,
      userId: userId || 'anonymous',
      resourceType,
      resourceId,
      details: {
        decisionId: decision.decisionId,
        policy: decision.policy,
        reason: decision.reason,
        appealAvailable: decision.appeal?.available,
        appealId: decision.appeal?.appealId
      }
    });
  }
}

// Export singleton instance
export const opaWithAppeals = new OPAWithAppealsMiddleware();