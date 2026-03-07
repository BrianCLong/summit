import { Redis } from 'ioredis';
import { createHash } from 'crypto';
import { sanitizeCypherQuery, enforceTenantInCypher } from './guard';

export interface GraphQueryContext {
  userId: string;
  tenantId: string;
  role?: string;
  classification?: string;
  purpose?: string;
}

export interface FirewallDecision {
  allowed: boolean;
  reason?: string;
  cacheHit: boolean;
  executionTimeMs: number;
  sanitizedQuery?: string;
}

export class GraphQueryFirewall {
  private redis: Redis | null = null;
  private readonly CACHE_TTL = 300; // 5 minutes cache for policy decisions

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL;
    if (url) {
      try {
        this.redis = new Redis(url);
      } catch (err) {
        console.warn('Could not initialize Redis for GraphQueryFirewall, proceeding without cache', err);
      }
    }
  }

  /**
   * Evaluates a Cypher query against OPA policies and CEP patterns
   */
  public async evaluateQuery(
    query: string,
    context: GraphQueryContext
  ): Promise<FirewallDecision> {
    const startTime = performance.now();
    let sanitizedQuery: string;

    try {
      sanitizedQuery = sanitizeCypherQuery(query);
    } catch (e: any) {
       return this.deny(`Sanitization failed: ${e.message}`, startTime);
    }

    // 1. Check Redis cache first (Sub-50ms overhead requirement)
    const queryHash = this.hashQuery(sanitizedQuery, context);
    const cacheKey = `firewall:decision:${queryHash}`;

    if (this.redis) {
      try {
        const cachedResult = await this.redis.get(cacheKey);
        if (cachedResult) {
          if (cachedResult === 'ALLOW') {
              return {
                  allowed: true,
                  cacheHit: true,
                  executionTimeMs: performance.now() - startTime,
                  sanitizedQuery
              };
          } else {
             return {
                 allowed: false,
                 reason: 'Cached policy denial',
                 cacheHit: true,
                 executionTimeMs: performance.now() - startTime
             };
          }
        }
      } catch (err) {
        console.error('Redis cache error during firewall evaluation:', err);
        // Fail open on cache error, but continue to full evaluation
      }
    }

    // 2. Perform NL -> Cypher anomaly detection
    if (this.detectAnomalousPatterns(sanitizedQuery)) {
      return this.denyAndCache(cacheKey, 'Anomalous traversal pattern detected', startTime);
    }

    // 3. CEP Guards: Evaluate for suspicious traversal patterns
    if (this.detectSuspiciousTraversals(sanitizedQuery)) {
      return this.denyAndCache(cacheKey, 'Suspicious unbounded traversal pattern (CEP guard)', startTime);
    }

    // 4. Purpose and Data Classification Policy Evaluation
    // This simulates calling OPA or CEP v2 layer
    if (!await this.evaluatePolicy(sanitizedQuery, context)) {
      return this.denyAndCache(cacheKey, 'Policy violation: Purpose or classification mismatch', startTime);
    }

    // 5. Tenant Isolation Validation (leveraging existing guard)
    try {
        enforceTenantInCypher(sanitizedQuery, context.tenantId);
    } catch (e: any) {
        return this.denyAndCache(cacheKey, `Tenant isolation violation: ${e.message}`, startTime);
    }

    // 6. Cache and allow
    await this.cacheDecision(cacheKey, 'ALLOW');

    return {
      allowed: true,
      cacheHit: false,
      executionTimeMs: performance.now() - startTime,
      sanitizedQuery
    };
  }

  private hashQuery(query: string, context: GraphQueryContext): string {
    const data = `${query}:${context.userId}:${context.tenantId}:${context.role || 'none'}:${context.classification || 'none'}:${context.purpose || 'none'}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private detectAnomalousPatterns(query: string): boolean {
    // Check for weird NL to Cypher artifacts like excessive cartesian products without WHERE
    const cartesianPattern = /MATCH\s+\([a-zA-Z0-9_]*\)\s*,\s*\([a-zA-Z0-9_]*\)\s+(?!WHERE)/i;
    if (cartesianPattern.test(query)) {
        return true;
    }

    // Check for mass deletion
    if (/MATCH\s+\([a-zA-Z0-9_]*\)\s+(DETACH\s+)?DELETE/i.test(query) && !query.toUpperCase().includes('WHERE')) {
        return true;
    }

    return false;
  }

  private detectSuspiciousTraversals(query: string): boolean {
    // Flag unbounded variable-length paths like [*]
    if (/\[\s*\*\s*\]/.test(query)) {
      return true;
    }

    // Flag excessively long variable length paths like [*1..100]
    const longPathMatch = /\[\s*\*\s*\d*\s*\.\.\s*(\d+)\s*\]/.exec(query);
    if (longPathMatch && parseInt(longPathMatch[1]) > 10) {
      return true;
    }

    return false;
  }

  private async evaluatePolicy(query: string, context: GraphQueryContext): Promise<boolean> {
    // In a real implementation, this would call OPA
    // Simulate dynamic policies (purpose, tenant isolation, data classification)

    // Example: If querying highly classified data without appropriate clearance
    if (query.includes('classification') && query.includes('TS/SCI') && context.classification !== 'TS/SCI') {
      return false;
    }

    // Example: Purpose-based access control (e.g., cannot modify certain labels if purpose isn't authorized)
    if (query.toUpperCase().includes('SET') && context.purpose === 'read-only') {
        return false;
    }

    return true;
  }

  private deny(reason: string, startTime: number): FirewallDecision {
    return {
      allowed: false,
      reason,
      cacheHit: false,
      executionTimeMs: performance.now() - startTime
    };
  }

  private async denyAndCache(cacheKey: string, reason: string, startTime: number): Promise<FirewallDecision> {
    await this.cacheDecision(cacheKey, 'DENY');
    return this.deny(reason, startTime);
  }

  private async cacheDecision(key: string, decision: 'ALLOW' | 'DENY'): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.set(key, decision, 'EX', this.CACHE_TTL);
      } catch (err) {
        console.error('Failed to cache firewall decision:', err);
      }
    }
  }
}
