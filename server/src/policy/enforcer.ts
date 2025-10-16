import { trace, Span } from '@opentelemetry/api';
import { Counter, Histogram } from 'prom-client';
import { redis } from '../subscriptions/pubsub';

const tracer = trace.getTracer('policy-enforcer', '24.2.0');

// Metrics
const policyDecisions = new Counter({
  name: 'policy_decisions_total',
  help: 'Total OPA policy decisions',
  labelNames: ['tenant_id', 'action', 'result'],
});

const policyLatency = new Histogram({
  name: 'policy_decision_latency_ms',
  help: 'OPA policy decision latency',
  buckets: [1, 5, 10, 25, 50, 100, 200, 500],
  labelNames: ['cached'],
});

const purposeViolations = new Counter({
  name: 'purpose_violations_total',
  help: 'Total purpose limitation violations',
  labelNames: ['tenant_id', 'required_purpose', 'provided_purpose'],
});

export type Purpose =
  | 'investigation'
  | 'benchmarking'
  | 'monitoring'
  | 'analytics';
export type Action = 'read' | 'write' | 'update' | 'delete' | 'ingest';

interface PolicyContext {
  tenantId: string;
  userId?: string;
  action: Action;
  resource?: string;
  purpose?: Purpose;
  clientIP?: string;
  userAgent?: string;
  timestamp?: Date;
}

interface PolicyDecision {
  allow: boolean;
  reason?: string;
  requiredPurpose?: Purpose;
  redactionRules?: string[];
  auditRequired?: boolean;
  ttlSeconds?: number;
}

interface ProvenanceEntry {
  id: string;
  tenantId: string;
  action: Action;
  resource?: string;
  actor: string;
  purpose: Purpose;
  decision: 'allow' | 'deny';
  reason?: string;
  timestamp: Date;
  clientIP?: string;
}

export class PolicyEnforcer {
  private readonly cachePrefix = 'policy_cache';
  private readonly defaultTTL = 300; // 5 minutes
  private readonly provenanceLog: ProvenanceEntry[] = [];

  async enforce(context: PolicyContext): Promise<PolicyDecision> {
    return tracer.startActiveSpan('policy.enforce', async (span: Span) => {
      span.setAttributes({
        tenant_id: context.tenantId,
        action: context.action,
        purpose: context.purpose || 'none',
      });

      const startTime = Date.now();

      try {
        // Check cache first
        const cacheKey = this.buildCacheKey(context);
        const cached = await this.getFromCache(cacheKey);

        if (cached) {
          policyLatency.observe({ cached: 'true' }, Date.now() - startTime);
          return cached;
        }

        // Evaluate policy
        const decision = await this.evaluatePolicy(context);

        // Cache decision if TTL specified
        if (decision.ttlSeconds && decision.ttlSeconds > 0) {
          await this.setCache(cacheKey, decision, decision.ttlSeconds);
        }

        // Record provenance
        await this.recordProvenance(context, decision);

        policyLatency.observe({ cached: 'false' }, Date.now() - startTime);
        policyDecisions.inc({
          tenant_id: context.tenantId,
          action: context.action,
          result: decision.allow ? 'allow' : 'deny',
        });

        span.setAttributes({
          decision: decision.allow ? 'allow' : 'deny',
          reason: decision.reason || '',
        });

        return decision;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });

        // Fail secure - deny on error
        const failsafeDecision: PolicyDecision = {
          allow: false,
          reason: 'Policy evaluation failed',
          auditRequired: true,
        };

        await this.recordProvenance(context, failsafeDecision);
        return failsafeDecision;
      } finally {
        span.end();
      }
    });
  }

  async requirePurpose(
    purpose: Purpose,
    context: PolicyContext,
  ): Promise<PolicyDecision> {
    if (!context.purpose) {
      purposeViolations.inc({
        tenant_id: context.tenantId,
        required_purpose: purpose,
        provided_purpose: 'none',
      });

      return {
        allow: false,
        reason: `Purpose required: ${purpose}`,
        requiredPurpose: purpose,
        auditRequired: true,
      };
    }

    if (context.purpose !== purpose) {
      purposeViolations.inc({
        tenant_id: context.tenantId,
        required_purpose: purpose,
        provided_purpose: context.purpose,
      });

      return {
        allow: false,
        reason: `Purpose mismatch: required ${purpose}, provided ${context.purpose}`,
        requiredPurpose: purpose,
        auditRequired: true,
      };
    }

    // Purpose matches - delegate to main policy evaluation
    return this.enforce(context);
  }

  private async evaluatePolicy(
    context: PolicyContext,
  ): Promise<PolicyDecision> {
    // Simplified policy logic - in production this would call OPA
    const decision: PolicyDecision = {
      allow: true,
      ttlSeconds: this.defaultTTL,
    };

    // Basic tenant isolation
    if (!context.tenantId) {
      decision.allow = false;
      decision.reason = 'Tenant ID required';
      return decision;
    }

    // Purpose-based access control
    if (context.action === 'ingest' || context.action === 'write') {
      if (!context.purpose) {
        decision.allow = false;
        decision.reason = 'Purpose required for write operations';
        decision.requiredPurpose = 'investigation';
        return decision;
      }
    }

    // Resource-specific rules
    if (context.resource && context.resource.includes('sensitive')) {
      decision.redactionRules = ['pii', 'financial'];
      decision.auditRequired = true;
    }

    // High-risk actions require audit
    if (context.action === 'delete') {
      decision.auditRequired = true;
      decision.ttlSeconds = 60; // Shorter cache for destructive operations
    }

    return decision;
  }

  private buildCacheKey(context: PolicyContext): string {
    const keyParts = [
      context.tenantId,
      context.userId || 'anonymous',
      context.action,
      context.resource || 'default',
      context.purpose || 'none',
    ];
    return `${this.cachePrefix}:${keyParts.join(':')}`;
  }

  private async getFromCache(key: string): Promise<PolicyDecision | null> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as PolicyDecision;
      }
    } catch (error) {
      console.error('Policy cache read error:', error);
    }
    return null;
  }

  private async setCache(
    key: string,
    decision: PolicyDecision,
    ttl: number,
  ): Promise<void> {
    try {
      await redis.setWithTTL(key, JSON.stringify(decision), ttl);
    } catch (error) {
      console.error('Policy cache write error:', error);
    }
  }

  private async recordProvenance(
    context: PolicyContext,
    decision: PolicyDecision,
  ): Promise<void> {
    const entry: ProvenanceEntry = {
      id: `prov_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      tenantId: context.tenantId,
      action: context.action,
      resource: context.resource,
      actor: context.userId || 'anonymous',
      purpose: context.purpose || 'investigation',
      decision: decision.allow ? 'allow' : 'deny',
      reason: decision.reason,
      timestamp: new Date(),
      clientIP: context.clientIP,
    };

    // In-memory for now - in production would write to audit database
    this.provenanceLog.push(entry);

    // Keep only last 10000 entries in memory
    if (this.provenanceLog.length > 10000) {
      this.provenanceLog.splice(0, 1000);
    }

    console.log('Policy provenance:', JSON.stringify(entry));
  }

  getProvenanceLog(tenantId?: string, limit: number = 100): ProvenanceEntry[] {
    let filtered = this.provenanceLog;

    if (tenantId) {
      filtered = filtered.filter((entry) => entry.tenantId === tenantId);
    }

    return filtered.slice(-limit).reverse(); // Most recent first
  }

  async clearCache(pattern?: string): Promise<void> {
    // In production would use Redis SCAN to find and delete keys
    console.log('Policy cache cleared:', pattern || 'all');
  }

  getPolicyStats(): Record<string, any> {
    return {
      cachePrefix: this.cachePrefix,
      defaultTTL: this.defaultTTL,
      provenanceEntries: this.provenanceLog.length,
      timestamp: new Date().toISOString(),
    };
  }
}

export const policyEnforcer = new PolicyEnforcer();
