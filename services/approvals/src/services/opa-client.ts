import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type {
  OPAApprovalInput,
  OPAApprovalDecision,
  OPADecisionInput,
  OPADecisionResult,
  PolicyDenialError,
} from '../types.js';

const log = logger.child({ component: 'opa-client' });

// Cache for OPA decisions (short TTL)
const decisionCache = new Map<
  string,
  { decision: OPAApprovalDecision; timestamp: number }
>();
const CACHE_TTL_MS = 5000; // 5 seconds

export class OPAClient {
  private baseUrl: string;
  private timeout: number;
  private failClosed: boolean;

  constructor() {
    this.baseUrl = config.opa.url;
    this.timeout = config.opa.timeout;
    this.failClosed = config.opa.failClosed;
  }

  /**
   * Evaluate whether an approval request should be created and what policy requirements apply
   */
  async evaluateApprovalRequest(
    input: OPAApprovalInput,
  ): Promise<OPAApprovalDecision> {
    const cacheKey = this.getCacheKey('approval', input);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      log.debug({ cacheKey }, 'OPA decision cache hit');
      return cached;
    }

    const opaInput = {
      input: {
        tenant_id: input.tenant_id,
        actor: input.actor,
        resource: input.resource,
        action: input.action,
        attributes: input.attributes,
        context: input.context,
        existing_decisions: input.existing_decisions || [],
        timestamp: new Date().toISOString(),
      },
    };

    try {
      const response = await this.query<{ result: OPAApprovalDecision }>(
        '/v1/data/intelgraph/approvals/evaluate_request',
        opaInput,
      );

      const decision = response.result || this.getDefaultApprovalDecision();
      this.setCache(cacheKey, decision);

      log.info(
        {
          tenant_id: input.tenant_id,
          action: input.action,
          resource_type: input.resource.type,
          decision: decision.allow ? 'allow' : decision.require_approval ? 'require_approval' : 'deny',
        },
        'OPA approval evaluation completed',
      );

      return decision;
    } catch (error) {
      log.error({ error }, 'OPA evaluation failed');

      if (this.failClosed) {
        return {
          allow: false,
          require_approval: false,
          required_approvals: 0,
          allowed_approver_roles: [],
          conditions: [],
          violations: ['OPA service unavailable - fail closed'],
          policy_version: 'unavailable',
        };
      }

      // Fail open - return default requiring approval
      return this.getDefaultApprovalDecision();
    }
  }

  /**
   * Evaluate whether an actor can submit a decision on an approval request
   */
  async evaluateDecision(input: OPADecisionInput): Promise<OPADecisionResult> {
    const opaInput = {
      input: {
        tenant_id: input.tenant_id,
        actor: input.actor,
        resource: input.resource,
        action: input.action,
        decision_type: input.decision_type,
        existing_decisions: input.existing_decisions,
        required_approvals: input.required_approvals,
        allowed_approver_roles: input.allowed_approver_roles,
        timestamp: new Date().toISOString(),
      },
    };

    try {
      const response = await this.query<{ result: OPADecisionResult }>(
        '/v1/data/intelgraph/approvals/evaluate_decision',
        opaInput,
      );

      const result = response.result || {
        allow: false,
        violations: ['No policy result'],
        is_final: false,
        policy_version: 'unknown',
      };

      log.info(
        {
          tenant_id: input.tenant_id,
          actor_id: input.actor.id,
          decision_type: input.decision_type,
          allowed: result.allow,
          is_final: result.is_final,
        },
        'OPA decision evaluation completed',
      );

      return result;
    } catch (error) {
      log.error({ error }, 'OPA decision evaluation failed');

      if (this.failClosed) {
        return {
          allow: false,
          violations: ['OPA service unavailable - fail closed'],
          is_final: false,
          policy_version: 'unavailable',
        };
      }

      throw error;
    }
  }

  /**
   * Check if OPA service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get the current policy version
   */
  async getPolicyVersion(): Promise<string> {
    try {
      const response = await this.query<{ result: { version: string } }>(
        '/v1/data/intelgraph/approvals/policy_version',
        {},
      );
      return response.result?.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async query<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OPA query failed: ${response.status} - ${text}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private getCacheKey(type: string, input: Record<string, unknown>): string {
    const normalized = JSON.stringify(input, Object.keys(input).sort());
    return `${type}:${Buffer.from(normalized).toString('base64').substring(0, 64)}`;
  }

  private getFromCache(key: string): OPAApprovalDecision | null {
    const entry = decisionCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      decisionCache.delete(key);
      return null;
    }

    return entry.decision;
  }

  private setCache(key: string, decision: OPAApprovalDecision): void {
    decisionCache.set(key, { decision, timestamp: Date.now() });

    // Cleanup old entries
    if (decisionCache.size > 1000) {
      const cutoff = Date.now() - CACHE_TTL_MS;
      for (const [k, v] of decisionCache) {
        if (v.timestamp < cutoff) {
          decisionCache.delete(k);
        }
      }
    }
  }

  private getDefaultApprovalDecision(): OPAApprovalDecision {
    return {
      allow: false,
      require_approval: true,
      required_approvals: 2,
      allowed_approver_roles: ['admin', 'security-admin', 'team-lead'],
      conditions: [],
      violations: [],
      policy_version: 'default',
    };
  }
}

export const opaClient = new OPAClient();
