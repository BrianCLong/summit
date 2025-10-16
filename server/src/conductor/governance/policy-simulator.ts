// server/src/conductor/governance/policy-simulator.ts

import { Pool } from 'pg';
import Redis from 'ioredis';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface AccessLogEntry {
  timestamp: Date;
  actor: string;
  tenant: string;
  resource: string;
  action: string;
  context: Record<string, any>;
  granted: boolean;
}

interface PolicySimulationResult {
  totalRequests: number;
  currentPolicy: {
    allowed: number;
    denied: number;
    denialReasons: Record<string, number>;
  };
  newPolicy: {
    allowed: number;
    denied: number;
    denialReasons: Record<string, number>;
  };
  impactSummary: {
    newDenials: AccessLogEntry[];
    newAllows: AccessLogEntry[];
    riskScore: number;
  };
}

export class PolicySimulator {
  private pool: Pool;
  private redis: ReturnType<typeof createClient>;
  private opaUrl: string;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.redis = createClient({ url: process.env.REDIS_URL });
    this.opaUrl = process.env.OPA_URL || 'http://localhost:8181';
  }

  /**
   * Run policy simulation against last N days of access logs
   */
  async simulatePolicyChange(
    newPolicyBundle: string,
    lookbackDays: number = 30,
    sampleSize: number = 10000,
  ): Promise<PolicySimulationResult> {
    const startTime = Date.now();

    try {
      // Fetch recent access logs with sampling
      const accessLogs = await this.fetchAccessLogs(lookbackDays, sampleSize);
      logger.info(
        `Policy simulation: analyzing ${accessLogs.length} access log entries`,
      );

      // Test current policy
      const currentResults = await this.testPolicyAgainstLogs(null, accessLogs);

      // Test new policy
      const newResults = await this.testPolicyAgainstLogs(
        newPolicyBundle,
        accessLogs,
      );

      // Calculate impact
      const impactSummary = this.calculateImpact(
        accessLogs,
        currentResults,
        newResults,
      );

      const result: PolicySimulationResult = {
        totalRequests: accessLogs.length,
        currentPolicy: {
          allowed: currentResults.filter((r) => r.allowed).length,
          denied: currentResults.filter((r) => !r.allowed).length,
          denialReasons: this.aggregateDenialReasons(currentResults),
        },
        newPolicy: {
          allowed: newResults.filter((r) => r.allowed).length,
          denied: newResults.filter((r) => !r.allowed).length,
          denialReasons: this.aggregateDenialReasons(newResults),
        },
        impactSummary,
      };

      // Record metrics
      prometheusConductorMetrics.recordOperationalMetric(
        'policy_simulation_duration',
        Date.now() - startTime,
      );
      prometheusConductorMetrics.recordOperationalMetric(
        'policy_simulation_risk_score',
        impactSummary.riskScore,
      );

      return result;
    } catch (error) {
      logger.error('Policy simulation failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Validate tag propagation integrity end-to-end
   */
  async validateTagPropagation(
    tenantId: string,
    sampleSize: number = 100,
  ): Promise<{
    passed: number;
    failed: number;
    violations: Array<{
      entityId: string;
      expectedTags: Record<string, any>;
      actualTags: Record<string, any>;
      missingTags: string[];
      inconsistentTags: string[];
    }>;
  }> {
    try {
      const client = await this.pool.connect();

      // Sample entities across the ingestion → graph → export pipeline
      const sampleQuery = `
        SELECT 
          e.id,
          e.tags as actual_tags,
          s.expected_tags,
          e.updated_at
        FROM entities e 
        LEFT JOIN entity_tag_expectations s ON e.id = s.entity_id
        WHERE e.tenant_id = $1 
        AND e.updated_at > NOW() - INTERVAL '7 days'
        ORDER BY RANDOM() 
        LIMIT $2
      `;

      const result = await client.query(sampleQuery, [tenantId, sampleSize]);
      client.release();

      let passed = 0;
      let failed = 0;
      const violations = [];

      for (const row of result.rows) {
        const actualTags = row.actual_tags || {};
        const expectedTags = row.expected_tags || {};

        const missingTags = [];
        const inconsistentTags = [];

        // Check for missing required tags
        for (const [key, value] of Object.entries(expectedTags)) {
          if (!(key in actualTags)) {
            missingTags.push(key);
          } else if (actualTags[key] !== value) {
            inconsistentTags.push(key);
          }
        }

        if (missingTags.length === 0 && inconsistentTags.length === 0) {
          passed++;
        } else {
          failed++;
          violations.push({
            entityId: row.id,
            expectedTags,
            actualTags,
            missingTags,
            inconsistentTags,
          });
        }
      }

      logger.info(`Tag propagation validation completed`, {
        tenantId,
        passed,
        failed,
        violationCount: violations.length,
      });

      return { passed, failed, violations };
    } catch (error) {
      logger.error('Tag propagation validation failed', {
        error: error.message,
        tenantId,
      });
      throw error;
    }
  }

  private async fetchAccessLogs(
    lookbackDays: number,
    sampleSize: number,
  ): Promise<AccessLogEntry[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT 
          timestamp,
          actor,
          tenant,
          object_id as resource,
          action,
          details as context,
          (details->>'granted')::boolean as granted
        FROM audit_log 
        WHERE at > NOW() - INTERVAL '${lookbackDays} days'
        AND action LIKE '%_access'
        ORDER BY RANDOM()
        LIMIT $1
      `;

      const result = await client.query(query, [sampleSize]);
      return result.rows.map((row) => ({
        timestamp: row.timestamp,
        actor: row.actor,
        tenant: row.tenant,
        resource: row.resource,
        action: row.action,
        context: row.context,
        granted: row.granted,
      }));
    } finally {
      client.release();
    }
  }

  private async testPolicyAgainstLogs(
    policyBundle: string | null,
    logs: AccessLogEntry[],
  ): Promise<Array<{ allowed: boolean; reason?: string }>> {
    const results = [];

    for (const log of logs) {
      try {
        const input = {
          subject: {
            sub: log.actor,
            tenant: log.tenant,
            roles: log.context.roles || [],
            clearance: log.context.clearance || 0,
          },
          action: log.action,
          resource: {
            type: log.context.resourceType || 'unknown',
            tenant: log.tenant,
            tags: log.context.tags || {},
          },
          context: {
            purpose: log.context.purpose || 'unspecified',
            request_id: log.context.requestId || '',
          },
        };

        // Use temporary policy bundle if provided
        const opaEndpoint = policyBundle
          ? `${this.opaUrl}/v1/data/intelgraph/authz/simulate`
          : `${this.opaUrl}/v1/data/intelgraph/authz`;

        const response = await fetch(opaEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input,
            ...(policyBundle && { bundle: policyBundle }),
          }),
        });

        if (!response.ok) {
          results.push({ allowed: false, reason: 'opa_error' });
          continue;
        }

        const { result } = await response.json();
        results.push({
          allowed: result?.allow || false,
          reason: result?.explanations || result?.deny_reason,
        });
      } catch (error) {
        logger.warn('Policy test failed for log entry', {
          error: error.message,
          log,
        });
        results.push({ allowed: false, reason: 'test_error' });
      }
    }

    return results;
  }

  private calculateImpact(
    logs: AccessLogEntry[],
    currentResults: Array<{ allowed: boolean; reason?: string }>,
    newResults: Array<{ allowed: boolean; reason?: string }>,
  ) {
    const newDenials: AccessLogEntry[] = [];
    const newAllows: AccessLogEntry[] = [];

    for (let i = 0; i < logs.length; i++) {
      const wasAllowed = currentResults[i]?.allowed;
      const willBeAllowed = newResults[i]?.allowed;

      if (wasAllowed && !willBeAllowed) {
        newDenials.push(logs[i]);
      } else if (!wasAllowed && willBeAllowed) {
        newAllows.push(logs[i]);
      }
    }

    // Calculate risk score based on impact severity
    let riskScore = 0;
    riskScore += newDenials.length * 2; // Denying previously allowed access is risky
    riskScore -= newAllows.length * 1; // Allowing previously denied access is less risky
    riskScore = Math.max(0, Math.min(100, (riskScore / logs.length) * 100));

    return {
      newDenials,
      newAllows,
      riskScore,
    };
  }

  private aggregateDenialReasons(
    results: Array<{ allowed: boolean; reason?: string }>,
  ): Record<string, number> {
    const reasons: Record<string, number> = {};

    for (const result of results) {
      if (!result.allowed && result.reason) {
        reasons[result.reason] = (reasons[result.reason] || 0) + 1;
      }
    }

    return reasons;
  }
}
