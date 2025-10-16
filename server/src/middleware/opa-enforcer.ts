/**
 * OPA Policy Enforcement Middleware
 * Integrates with llm-preflight.ts to enforce budget + four-eyes policies
 */

import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import logger from '../utils/logger';
import { getBudgetLedgerManager } from '../db/budgetLedger';

interface OPAInput {
  tenant_id: string;
  user_id: string;
  mutation: string;
  field_name?: string;
  est_usd: number;
  est_total_tokens: number;
  risk_tag?: string;
  mutation_category?: string;
  approvers?: Array<{
    user_id: string;
    role: string;
    tenant_id?: string;
    approved_at: string;
    session_token: string;
  }>;
  request_id: string;
  timestamp: string;
}

interface OPADecision {
  allow: boolean;
  tenant_id: string;
  estimated_usd: number;
  monthly_room: number;
  daily_room: number;
  requires_four_eyes: boolean;
  valid_approvers: number;
  risk_level: string;
  violation_reasons: string[];
  policy_version: string;
  evaluated_at: number;
}

interface OPAResponse {
  result: OPADecision;
}

interface OPAEnforcerOptions {
  opaUrl?: string;
  enabled?: boolean;
  timeoutMs?: number;
  retries?: number;
  cacheDecisions?: boolean;
  cacheTtlMs?: number;
}

/**
 * OPA Policy Enforcer
 */
export class OPAEnforcer {
  private options: Required<OPAEnforcerOptions>;
  private budgetLedger = getBudgetLedgerManager();
  private decisionCache = new Map<
    string,
    { decision: OPADecision; expiresAt: number }
  >();

  constructor(options: OPAEnforcerOptions = {}) {
    this.options = {
      opaUrl: options.opaUrl || process.env.OPA_URL || 'http://localhost:8181',
      enabled: options.enabled ?? process.env.OPA_ENFORCEMENT === 'true',
      timeoutMs: options.timeoutMs || 5000,
      retries: options.retries || 2,
      cacheDecisions: options.cacheDecisions ?? true,
      cacheTtlMs: options.cacheTtlMs || 60000, // 1 minute
    };
  }

  /**
   * Evaluate policy decision
   */
  async evaluatePolicy(input: OPAInput): Promise<OPADecision> {
    if (!this.options.enabled) {
      // When OPA is disabled, apply basic budget checks only
      return this.fallbackDecision(input);
    }

    const cacheKey = this.generateCacheKey(input);

    // Check cache first
    if (this.options.cacheDecisions) {
      const cached = this.decisionCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        logger.debug('OPA decision cache hit', {
          tenantId: input.tenant_id,
          requestId: input.request_id,
        });
        return cached.decision;
      }
    }

    try {
      const data = await this.buildOPAData(input);
      const decision = await this.queryOPA(input, data);

      // Cache successful decisions
      if (this.options.cacheDecisions) {
        this.decisionCache.set(cacheKey, {
          decision,
          expiresAt: Date.now() + this.options.cacheTtlMs,
        });
      }

      // Log decision for audit
      logger.info('OPA policy decision', {
        tenantId: input.tenant_id,
        userId: input.user_id,
        requestId: input.request_id,
        allow: decision.allow,
        estimatedUsd: decision.estimated_usd,
        monthlyRoom: decision.monthly_room,
        requiresFourEyes: decision.requires_four_eyes,
        validApprovers: decision.valid_approvers,
        riskLevel: decision.risk_level,
        violations: decision.violation_reasons,
      });

      return decision;
    } catch (error) {
      logger.error('OPA policy evaluation failed', {
        error: error instanceof Error ? error.message : String(error),
        tenantId: input.tenant_id,
        requestId: input.request_id,
      });

      // Fail-safe: use fallback decision
      return this.fallbackDecision(input);
    }
  }

  /**
   * Generate cache key for decisions
   */
  private generateCacheKey(input: OPAInput): string {
    const keyComponents = [
      input.tenant_id,
      input.user_id,
      input.mutation,
      input.est_usd.toFixed(4),
      input.risk_tag || 'none',
      input.approvers?.map((a) => `${a.user_id}:${a.approved_at}`).join(',') ||
        'none',
      Math.floor(Date.now() / 60000), // Round to minute for cache stability
    ];

    return keyComponents.join('|');
  }

  /**
   * Build OPA data context
   */
  private async buildOPAData(input: OPAInput): Promise<any> {
    const [tenantBudget, spendingSummary] = await Promise.all([
      this.budgetLedger.getTenantBudget(input.tenant_id),
      this.budgetLedger.getSpendingSummary(input.tenant_id),
    ]);

    return {
      tenant_budgets: tenantBudget
        ? {
            [input.tenant_id]: {
              monthly_usd_limit: tenantBudget.monthlyUsdLimit,
              daily_usd_limit: tenantBudget.dailyUsdLimit,
              hard_cap: tenantBudget.hardCap,
              notification_threshold: tenantBudget.notificationThreshold,
            },
          }
        : {},

      spending_ledger: {
        [input.tenant_id]: await this.getRecentSpendingEntries(input.tenant_id),
      },

      global_config: {
        four_eyes_threshold_usd: parseFloat(
          process.env.FOUR_EYES_THRESHOLD_USD || '5.0',
        ),
        four_eyes_threshold_tokens: parseInt(
          process.env.FOUR_EYES_THRESHOLD_TOKENS || '50000',
        ),
        emergency_multiplier: parseFloat(
          process.env.EMERGENCY_BUDGET_MULTIPLIER || '1.2',
        ),
      },

      sensitive_tenants: (process.env.SENSITIVE_TENANTS || '')
        .split(',')
        .filter(Boolean),

      tenant_overrides: await this.getTenantOverrides(),
    };
  }

  /**
   * Get recent spending entries for OPA context
   */
  private async getRecentSpendingEntries(tenantId: string): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const entries = await this.budgetLedger.getSpendingEntries(
      {
        tenantId,
        startDate: thirtyDaysAgo,
      },
      1000,
    ); // Last 1000 entries or 30 days

    return entries.map((entry) => ({
      created_at: entry.createdAt.toISOString(),
      total_usd: entry.actualTotalUsd || entry.estTotalUsd,
      status: entry.status,
    }));
  }

  /**
   * Get tenant overrides (from database or cache)
   */
  private async getTenantOverrides(): Promise<any> {
    // In production, this would query a database table
    // For now, return empty overrides
    return {};
  }

  /**
   * Query OPA server
   */
  private async queryOPA(input: OPAInput, data: any): Promise<OPADecision> {
    const url = `${this.options.opaUrl}/v1/data/intelgraph/budget/decision`;

    const payload = {
      input,
      data,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.retries; attempt++) {
      try {
        const response = await axios.post<OPAResponse>(url, payload, {
          timeout: this.options.timeoutMs,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.data?.result) {
          throw new Error('Invalid OPA response structure');
        }

        return response.data.result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.options.retries) {
          const delay = Math.min(1000 * attempt, 3000); // Exponential backoff, max 3s
          await new Promise((resolve) => setTimeout(resolve, delay));

          logger.warn(`OPA query attempt ${attempt} failed, retrying`, {
            error: lastError.message,
            tenantId: input.tenant_id,
            requestId: input.request_id,
            nextAttempt: attempt + 1,
          });
        }
      }
    }

    throw lastError || new Error('OPA query failed after retries');
  }

  /**
   * Fallback decision when OPA is unavailable
   */
  private async fallbackDecision(input: OPAInput): Promise<OPADecision> {
    logger.warn('Using fallback budget decision', {
      tenantId: input.tenant_id,
      requestId: input.request_id,
      reason: this.options.enabled ? 'OPA unavailable' : 'OPA disabled',
    });

    // Simple budget check using database directly
    const budgetCheck = await this.budgetLedger.checkTenantBudget(
      input.tenant_id,
      input.est_usd,
    );

    const requiresFourEyes =
      input.est_usd > 5.0 ||
      ['destructive', 'bulk_delete'].includes(input.risk_tag || '');

    const allow =
      budgetCheck.canAfford &&
      (!requiresFourEyes || (input.approvers?.length || 0) >= 2);

    return {
      allow,
      tenant_id: input.tenant_id,
      estimated_usd: input.est_usd,
      monthly_room: budgetCheck.budgetLimit - budgetCheck.currentSpend,
      daily_room: budgetCheck.budgetLimit / 30, // Rough daily estimate
      requires_four_eyes: requiresFourEyes,
      valid_approvers: input.approvers?.length || 0,
      risk_level:
        input.est_usd > 10 ? 'high' : input.est_usd > 1 ? 'medium' : 'low',
      violation_reasons: allow ? [] : [budgetCheck.reason],
      policy_version: 'fallback-1.0',
      evaluated_at: Date.now(),
    };
  }

  /**
   * Express middleware for OPA enforcement
   */
  createMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip non-mutation requests
      if (req.method !== 'POST' || !req.body?.query?.includes('mutation')) {
        return next();
      }

      try {
        const input: OPAInput = {
          tenant_id:
            req.get('x-tenant-id') || (req as any).user?.tenantId || 'default',
          user_id: (req as any).user?.id || req.get('x-user-id') || 'anonymous',
          mutation: req.body.operationName || 'unnamed',
          field_name: this.extractMutationField(req.body.query),
          est_usd: parseFloat(req.get('x-estimated-usd') || '0'),
          est_total_tokens: parseInt(req.get('x-estimated-tokens') || '0'),
          risk_tag: req.get('x-risk-tag'),
          mutation_category: req.get('x-mutation-category'),
          approvers: this.parseApprovers(req.get('x-approvers')),
          request_id: req.get('x-request-id') || `req-${Date.now()}`,
          timestamp: new Date().toISOString(),
        };

        const decision = await this.evaluatePolicy(input);

        if (!decision.allow) {
          res.status(403).json({
            error: 'Policy violation: Operation not permitted',
            code: 'POLICY_VIOLATION',
            decision: {
              allow: decision.allow,
              requires_four_eyes: decision.requires_four_eyes,
              valid_approvers: decision.valid_approvers,
              risk_level: decision.risk_level,
              violation_reasons: decision.violation_reasons,
            },
            tenant_id: input.tenant_id,
            request_id: input.request_id,
          });
          return;
        }

        // Attach decision to request for downstream use
        (req as any).opaDecision = decision;
        next();
      } catch (error) {
        logger.error('OPA middleware error', {
          error: error instanceof Error ? error.message : String(error),
          url: req.originalUrl,
        });

        // Fail open in case of errors
        next();
      }
    };
  }

  /**
   * Extract mutation field name from GraphQL query
   */
  private extractMutationField(query: string): string | undefined {
    const mutationMatch = query.match(/mutation\s+\w*\s*{[^{]*(\w+)\s*\(/);
    return mutationMatch?.[1];
  }

  /**
   * Parse approvers from header
   */
  private parseApprovers(approversHeader?: string): Array<any> | undefined {
    if (!approversHeader) return undefined;

    try {
      return JSON.parse(decodeURIComponent(approversHeader));
    } catch (error) {
      logger.warn('Failed to parse approvers header', {
        header: approversHeader,
        error,
      });
      return undefined;
    }
  }

  /**
   * Clean up cache periodically
   */
  startCacheCleanup(): void {
    setInterval(
      () => {
        const now = Date.now();
        for (const [key, cached] of this.decisionCache.entries()) {
          if (now >= cached.expiresAt) {
            this.decisionCache.delete(key);
          }
        }
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  /**
   * Get enforcement statistics
   */
  getStats(): {
    enabled: boolean;
    cacheSize: number;
    cacheHitRate: number;
  } {
    return {
      enabled: this.options.enabled,
      cacheSize: this.decisionCache.size,
      cacheHitRate: 0, // TODO: Track cache hits/misses
    };
  }
}

// Global enforcer instance
let globalOPAEnforcer: OPAEnforcer | null = null;

/**
 * Get global OPA enforcer
 */
export function getOPAEnforcer(options?: OPAEnforcerOptions): OPAEnforcer {
  if (!globalOPAEnforcer) {
    globalOPAEnforcer = new OPAEnforcer(options);
    globalOPAEnforcer.startCacheCleanup();
  }
  return globalOPAEnforcer;
}

/**
 * Express middleware factory
 */
export function createOPAMiddleware(options?: OPAEnforcerOptions) {
  const enforcer = getOPAEnforcer(options);
  return enforcer.createMiddleware();
}

/**
 * Default OPA middleware
 */
export const opaMiddleware = createOPAMiddleware();
