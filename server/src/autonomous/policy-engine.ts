/**
 * Policy Engine - OPA/Rego Integration for Autonomous Operations
 * Addresses P0 safety gaps with comprehensive policy evaluation
 */

import { createHash } from 'crypto';
import axios from 'axios';
import { Pool } from 'pg';
import { Logger } from 'pino';
import { z } from 'zod';

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  conditions?: Record<string, any>;
  requiresApproval?: boolean;
  riskScore?: number;
}

export interface PolicyContext {
  user: {
    id: string;
    roles: string[];
    tenantId: string;
    permissions: string[];
  };
  resource: {
    type: string;
    id: string;
    tenantId: string;
    sensitivity?: 'low' | 'medium' | 'high' | 'critical';
  };
  action: {
    type: string;
    category: 'read' | 'write' | 'deploy' | 'rollback';
    autonomy: number;
    budgets?: {
      tokens: number;
      usd: number;
      timeMinutes: number;
    };
  };
  environment: {
    name: string;
    production: boolean;
    region: string;
  };
  time: {
    timestamp: number;
    timezone: string;
    businessHours: boolean;
  };
}

// Validation schemas
const PolicyContextSchema = z.object({
  user: z.object({
    id: z.string(),
    roles: z.array(z.string()),
    tenantId: z.string(),
    permissions: z.array(z.string()),
  }),
  resource: z.object({
    type: z.string(),
    id: z.string(),
    tenantId: z.string(),
    sensitivity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }),
  action: z.object({
    type: z.string(),
    category: z.enum(['read', 'write', 'deploy', 'rollback']),
    autonomy: z.number().int().min(0).max(5),
    budgets: z
      .object({
        tokens: z.number().positive(),
        usd: z.number().positive(),
        timeMinutes: z.number().positive(),
      })
      .optional(),
  }),
  environment: z.object({
    name: z.string(),
    production: z.boolean(),
    region: z.string(),
  }),
  time: z.object({
    timestamp: z.number(),
    timezone: z.string(),
    businessHours: z.boolean(),
  }),
});

export class PolicyEngine {
  private opaUrl: string;
  private db: Pool;
  private logger: Logger;
  private policyVersion: string;
  private cache: Map<string, { decision: PolicyDecision; expires: number }> =
    new Map();

  constructor(
    opaUrl: string,
    db: Pool,
    logger: Logger,
    policyVersion = '1.0.0',
  ) {
    this.opaUrl = opaUrl;
    this.db = db;
    this.logger = logger;
    this.policyVersion = policyVersion;

    // Clean cache periodically
    setInterval(() => this.cleanCache(), 60000);
  }

  /**
   * Main policy evaluation method
   */
  async evaluate(
    subject: string,
    action: string,
    resource: string,
    context: any,
  ): Promise<PolicyDecision> {
    try {
      // Build full context
      const policyContext = await this.buildPolicyContext(
        subject,
        action,
        resource,
        context,
      );

      // Validate context
      const validation = PolicyContextSchema.safeParse(policyContext);
      if (!validation.success) {
        this.logger.warn(
          {
            subject,
            action,
            resource,
            error: validation.error,
          },
          'Invalid policy context',
        );
        return { allowed: false, reason: 'Invalid policy context' };
      }

      // Check cache first
      const cacheKey = this.getCacheKey(policyContext);
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        this.logger.debug(
          { subject, action, resource },
          'Policy decision from cache',
        );
        return cached.decision;
      }

      // Check database cache
      const dbCached = await this.getFromDbCache(cacheKey);
      if (dbCached) {
        this.cache.set(cacheKey, {
          decision: dbCached,
          expires: Date.now() + 300000,
        }); // 5 min
        return dbCached;
      }

      // Evaluate with OPA
      const decision = await this.evaluateWithOpa(policyContext);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(policyContext, decision);
      decision.riskScore = riskScore;

      // Determine if approval is required
      decision.requiresApproval = this.requiresApproval(
        policyContext,
        decision,
        riskScore,
      );

      // Cache the decision
      await this.cacheDecision(cacheKey, decision);

      // Log the decision
      await this.logPolicyDecision(
        subject,
        action,
        resource,
        policyContext,
        decision,
      );

      return decision;
    } catch (error) {
      this.logger.error(
        {
          subject,
          action,
          resource,
          error: error.message,
        },
        'Policy evaluation failed',
      );

      // Fail-safe: deny by default
      return {
        allowed: false,
        reason: 'Policy evaluation error',
        requiresApproval: true,
        riskScore: 100,
      };
    }
  }

  /**
   * Batch policy evaluation for performance
   */
  async evaluateBatch(
    requests: Array<{
      subject: string;
      action: string;
      resource: string;
      context: any;
    }>,
  ): Promise<PolicyDecision[]> {
    const results = await Promise.allSettled(
      requests.map((req) =>
        this.evaluate(req.subject, req.action, req.resource, req.context),
      ),
    );

    return results.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : {
            allowed: false,
            reason: 'Batch evaluation error',
            requiresApproval: true,
          },
    );
  }

  /**
   * Build comprehensive policy context
   */
  private async buildPolicyContext(
    subject: string,
    action: string,
    resource: string,
    context: any,
  ): Promise<PolicyContext> {
    // Get user details (would typically come from auth service)
    const user = await this.getUserDetails(subject);

    // Parse resource details
    const [resourceType, resourceId] = resource.split(':');
    const resourceDetails = await this.getResourceDetails(
      resourceType,
      resourceId,
    );

    // Determine environment
    const environment = this.getEnvironmentContext();

    // Build time context
    const now = new Date();
    const timeContext = {
      timestamp: now.getTime(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      businessHours: this.isBusinessHours(now),
    };

    return {
      user: {
        id: subject,
        roles: user.roles || [],
        tenantId: user.tenantId || context.tenantId || 'default',
        permissions: user.permissions || [],
      },
      resource: {
        type: resourceType,
        id: resourceId,
        tenantId: resourceDetails.tenantId || context.tenantId || 'default',
        sensitivity: resourceDetails.sensitivity || 'medium',
      },
      action: {
        type: action,
        category: this.getActionCategory(action),
        autonomy: context.autonomy || 0,
        budgets: context.budgets,
      },
      environment,
      time: timeContext,
    };
  }

  /**
   * Evaluate policy with OPA
   */
  private async evaluateWithOpa(
    context: PolicyContext,
  ): Promise<PolicyDecision> {
    try {
      const response = await axios.post(
        `${this.opaUrl}/v1/data/autonomous/allow`,
        {
          input: context,
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const result = response.data.result;

      return {
        allowed: result.allow === true,
        reason: result.reason,
        conditions: result.conditions || {},
      };
    } catch (error) {
      this.logger.error({ error: error.message }, 'OPA evaluation failed');

      // Fallback to local policy evaluation
      return this.evaluateLocalPolicy(context);
    }
  }

  /**
   * Fallback local policy evaluation
   */
  private evaluateLocalPolicy(context: PolicyContext): PolicyDecision {
    const { user, resource, action, environment } = context;

    // Production protection
    if (environment.production && action.category !== 'read') {
      if (action.autonomy >= 4) {
        return {
          allowed: false,
          reason: 'High autonomy operations not allowed in production',
          requiresApproval: true,
        };
      }
    }

    // Deployment restrictions
    if (action.category === 'deploy') {
      if (!user.permissions.includes('deploy')) {
        return {
          allowed: false,
          reason: 'User lacks deployment permissions',
          requiresApproval: true,
        };
      }
    }

    // Resource sensitivity checks
    if (resource.sensitivity === 'critical') {
      if (action.autonomy >= 3) {
        return {
          allowed: false,
          reason: 'Critical resources require manual approval',
          requiresApproval: true,
        };
      }
    }

    // Budget checks
    if (action.budgets) {
      if (action.budgets.usd > 100) {
        return {
          allowed: false,
          reason: 'Budget exceeds limits',
          requiresApproval: true,
        };
      }
    }

    // Default allow for read operations
    if (action.category === 'read') {
      return { allowed: true };
    }

    // Default deny with approval required
    return {
      allowed: action.autonomy === 0, // Only allow manual mode by default
      reason: 'Default policy requires manual approval',
      requiresApproval: true,
    };
  }

  /**
   * Calculate risk score based on context
   */
  private calculateRiskScore(
    context: PolicyContext,
    decision: PolicyDecision,
  ): number {
    let risk = 0;

    // Base risk from action category
    const categoryRisk = {
      read: 10,
      write: 30,
      deploy: 60,
      rollback: 80,
    };
    risk += categoryRisk[context.action.category] || 50;

    // Autonomy multiplier
    risk += context.action.autonomy * 10;

    // Environment risk
    if (context.environment.production) {
      risk += 20;
    }

    // Resource sensitivity
    const sensitivityRisk = {
      low: 0,
      medium: 10,
      high: 20,
      critical: 40,
    };
    risk += sensitivityRisk[context.resource.sensitivity || 'medium'];

    // Time-based risk (after hours operations are riskier)
    if (!context.time.businessHours && context.action.category !== 'read') {
      risk += 15;
    }

    // Budget risk
    if (context.action.budgets) {
      if (context.action.budgets.usd > 50) risk += 10;
      if (context.action.budgets.usd > 100) risk += 20;
    }

    return Math.min(100, Math.max(0, risk));
  }

  /**
   * Determine if approval is required
   */
  private requiresApproval(
    context: PolicyContext,
    decision: PolicyDecision,
    riskScore: number,
  ): boolean {
    // Always require approval if policy explicitly denies
    if (!decision.allowed) return true;

    // High-risk operations always require approval
    if (riskScore >= 70) return true;

    // Production deployments require approval
    if (
      context.environment.production &&
      context.action.category === 'deploy'
    ) {
      return true;
    }

    // High autonomy in production requires approval
    if (context.environment.production && context.action.autonomy >= 4) {
      return true;
    }

    // Critical resources always require approval for write operations
    if (
      context.resource.sensitivity === 'critical' &&
      context.action.category !== 'read'
    ) {
      return true;
    }

    return false;
  }

  /**
   * Helper methods
   */
  private getCacheKey(context: PolicyContext): string {
    const key = JSON.stringify(context, Object.keys(context).sort());
    return createHash('sha256')
      .update(`${this.policyVersion}:${key}`)
      .digest('hex');
  }

  private async getFromDbCache(
    cacheKey: string,
  ): Promise<PolicyDecision | null> {
    try {
      const result = await this.db.query(
        `
        SELECT allowed, reason, conditions 
        FROM policy_decisions 
        WHERE subject_hash = $1 AND policy_version = $2 AND expires_at > NOW()
      `,
        [cacheKey, this.policyVersion],
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          allowed: row.allowed,
          reason: row.reason,
          conditions: row.conditions || {},
        };
      }
    } catch (error) {
      this.logger.warn(
        { error: error.message },
        'Failed to get cached policy decision',
      );
    }
    return null;
  }

  private async cacheDecision(
    cacheKey: string,
    decision: PolicyDecision,
  ): Promise<void> {
    try {
      // Cache in memory
      this.cache.set(cacheKey, {
        decision,
        expires: Date.now() + 300000, // 5 minutes
      });

      // Cache in database
      await this.db.query(
        `
        INSERT INTO policy_decisions (subject_hash, policy_version, allowed, reason, conditions, expires_at)
        VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '5 minutes')
        ON CONFLICT (subject_hash, policy_version) 
        DO UPDATE SET allowed = $3, reason = $4, conditions = $5, expires_at = NOW() + INTERVAL '5 minutes'
      `,
        [
          cacheKey,
          this.policyVersion,
          decision.allowed,
          decision.reason,
          JSON.stringify(decision.conditions || {}),
        ],
      );
    } catch (error) {
      this.logger.warn(
        { error: error.message },
        'Failed to cache policy decision',
      );
    }
  }

  private async logPolicyDecision(
    subject: string,
    action: string,
    resource: string,
    context: PolicyContext,
    decision: PolicyDecision,
  ): Promise<void> {
    this.logger.info(
      {
        subject,
        action,
        resource,
        decision: {
          allowed: decision.allowed,
          reason: decision.reason,
          riskScore: decision.riskScore,
          requiresApproval: decision.requiresApproval,
        },
        context: {
          autonomy: context.action.autonomy,
          environment: context.environment.name,
          production: context.environment.production,
        },
      },
      'Policy decision made',
    );
  }

  private async getUserDetails(userId: string): Promise<any> {
    // In a real implementation, this would query the user service
    return {
      roles: ['developer'],
      permissions: ['read', 'write'],
      tenantId: 'default',
    };
  }

  private async getResourceDetails(type: string, id: string): Promise<any> {
    // In a real implementation, this would query the resource metadata
    return {
      tenantId: 'default',
      sensitivity: type === 'production' ? 'critical' : 'medium',
    };
  }

  private getEnvironmentContext(): any {
    return {
      name: process.env.NODE_ENV || 'development',
      production: process.env.NODE_ENV === 'production',
      region: process.env.AWS_REGION || 'us-west-2',
    };
  }

  private getActionCategory(
    action: string,
  ): 'read' | 'write' | 'deploy' | 'rollback' {
    if (
      action.includes('read') ||
      action.includes('get') ||
      action.includes('list')
    ) {
      return 'read';
    }
    if (action.includes('deploy')) {
      return 'deploy';
    }
    if (action.includes('rollback') || action.includes('revert')) {
      return 'rollback';
    }
    return 'write';
  }

  private isBusinessHours(date: Date): boolean {
    const hour = date.getHours();
    const day = date.getDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 17; // Mon-Fri 9-5
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expires <= now) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Pre-built policy rules in Rego format
 */
export const DEFAULT_POLICY_RULES = `
package autonomous

import future.keywords.if
import future.keywords.in

# Default allow decision
allow := decision if {
    decision := {
        "allow": allow_decision,
        "reason": reason,
        "conditions": conditions
    }
}

# Core allow logic
allow_decision if {
    # Read operations are generally allowed
    input.action.category == "read"
    not high_risk_read
}

allow_decision if {
    # Low autonomy operations with approval
    input.action.autonomy <= 2
    input.action.category in ["write", "deploy"]
    not production_restriction
}

allow_decision if {
    # Non-production environments are more permissive
    not input.environment.production
    input.action.autonomy <= 4
    approved_user
}

# Risk assessments
high_risk_read if {
    input.resource.sensitivity == "critical"
    not business_hours
}

production_restriction if {
    input.environment.production
    input.action.autonomy >= 4
}

business_hours if {
    input.time.businessHours == true
}

approved_user if {
    "developer" in input.user.roles
    input.action.type != "admin"
}

# Conditions that must be met
conditions := {
    "approval_required": requires_approval,
    "max_budget": max_allowed_budget,
    "monitoring_required": true
}

requires_approval if {
    input.action.category in ["deploy", "rollback"]
    input.environment.production
}

requires_approval if {
    input.resource.sensitivity == "critical"
    input.action.category != "read"
}

max_allowed_budget := 100 if {
    input.environment.production
} else := 500

# Denial reasons
reason := "Production operations require approval" if {
    input.environment.production
    input.action.autonomy >= 4
}

reason := "Critical resource access restricted" if {
    input.resource.sensitivity == "critical"
    input.action.autonomy >= 3
}

reason := "User lacks required permissions" if {
    not approved_user
}

reason := "Budget exceeds limits" if {
    input.action.budgets.usd > max_allowed_budget
}

reason := "Operation allowed" if allow_decision
`;
