import fetch from 'node-fetch';
import { neo } from '../db/neo4j';
import { pg } from '../db/pg';
import { getUser } from '../auth/context';
import { opa } from '../policy/opa';
import { policyEnforcer, Purpose, Action } from '../policy/enforcer';
import { redactionService } from '../redaction/redact';
import { gqlDuration, subscriptionFanoutLatency } from '../metrics';
import { makePubSub } from '../subscriptions/pubsub';
import Redis from 'ioredis';

const COHERENCE_EVENTS = 'COHERENCE_EVENTS';
const PROMETHEUS_BASE_URL = normalizePrometheusUrl(
  process.env.PROMETHEUS_URL || process.env.PROM_URL || ''
);

const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

type PromMetric = { name: string; value: number; labels: Record<string, unknown> };

function normalizePrometheusUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `http://${trimmed.replace(/^\/+/, '')}`;
}

function parseMaybeJson(value: unknown): unknown {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Failed to parse JSON value for compliance dashboard', error);
      return value;
    }
  }
  return value;
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function executePrometheusQuery(query: string): Promise<any[] | null> {
  if (!PROMETHEUS_BASE_URL) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const url = new URL('/api/v1/query', PROMETHEUS_BASE_URL);
    url.searchParams.set('query', query);
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Prometheus query failed: ${response.status} ${response.statusText}`);
    }
    const payload = (await response.json()) as { data?: { result?: any[] } };
    return payload?.data?.result ?? [];
  } catch (error) {
    console.warn('Prometheus query error', { error, query });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCompliancePromMetrics(
  tenantId: string
): Promise<{ metrics: PromMetric[]; success: boolean }> {
  if (!PROMETHEUS_BASE_URL) {
    return { metrics: [], success: false };
  }

  const descriptors = [
    {
      name: 'compliance_scan_failures_total',
      query: `sum(increase(compliance_scan_failures_total{tenant="${tenantId}"}[24h]))`,
    },
    {
      name: 'compliance_open_findings_total',
      query: `sum(compliance_open_findings_total{tenant="${tenantId}"})`,
    },
    {
      name: 'opa_policy_violations_total',
      query: `sum(increase(opa_policy_violations_total{tenant="${tenantId}"}[24h]))`,
    },
  ];

  let hasData = false;
  const metrics: PromMetric[] = [];

  for (const descriptor of descriptors) {
    const result = await executePrometheusQuery(descriptor.query);
    if (result && result.length > 0) {
      hasData = true;
      for (const sample of result) {
        const rawValue = Array.isArray(sample.value) ? sample.value[1] : sample.value;
        metrics.push({
          name: descriptor.name,
          value: toNumber(rawValue, 0),
          labels: sample.metric || { tenant: tenantId },
        });
      }
    } else {
      metrics.push({
        name: descriptor.name,
        value: 0,
        labels: { tenant: tenantId, source: 'prometheus-unavailable' },
      });
    }
  }

  return { metrics, success: hasData };
}

function buildFallbackPromMetrics(
  tenantId: string,
  securityScans: Array<{ status: string; criticalCount: number; highCount: number }>,
  policyValidations: Array<{ allow: boolean }>,
  openFindings: number
): PromMetric[] {
  const failedScans = securityScans.filter((scan) => scan.status.toLowerCase() !== 'passed').length;
  const policyViolations = policyValidations.filter((validation) => !validation.allow).length;

  return [
    {
      name: 'compliance_scan_failures_total',
      value: failedScans,
      labels: { tenant: tenantId, source: 'fallback' },
    },
    {
      name: 'compliance_open_findings_total',
      value: openFindings,
      labels: { tenant: tenantId, source: 'fallback' },
    },
    {
      name: 'opa_policy_violations_total',
      value: policyViolations,
      labels: { tenant: tenantId, source: 'fallback' },
    },
  ];
}

export const resolvers = {
  DateTime: new (require('graphql-iso-date').GraphQLDateTime)(),
  Query: {
    async complianceDashboard(_: any, { tenantId, limit = 20 }: any, ctx: any) {
      const user = getUser(ctx);
      const effectiveTenantId = tenantId || user?.tenant || 'default';
      const sanitizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

      opa.enforce('compliance:view', { tenantId: effectiveTenantId, user });

      let auditRows: any[] = [];
      try {
        auditRows = await pg.readMany(
          `
            SELECT a.id,
                   a.user_id,
                   a.action,
                   a.resource_type,
                   a.resource_id,
                   a.details,
                   a.ip_address,
                   a.user_agent,
                   a.created_at,
                   u.email AS user_email,
                   u.role AS user_role
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.user_id
            ORDER BY a.created_at DESC
            LIMIT $1
          `,
          [sanitizedLimit],
          { tenantId: effectiveTenantId }
        );
      } catch (error) {
        console.warn('Failed to load audit logs for compliance dashboard', { error });
      }

      const auditLogs = auditRows.map((row) => ({
        id: row.id,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        userId: row.user_id,
        userEmail: row.user_email,
        userRole: row.user_role,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        details: parseMaybeJson(row.details),
        createdAt: toIsoString(row.created_at),
      }));

      let securityRows: any[] = [];
      try {
        securityRows = await pg.readMany(
          `
            SELECT id,
                   tenant_id,
                   scan_type,
                   target,
                   status,
                   critical_count,
                   high_count,
                   medium_count,
                   low_count,
                   duration_seconds,
                   report_url,
                   metadata,
                   scanned_at
            FROM security_scan_reports
            WHERE tenant_id = $1
            ORDER BY scanned_at DESC
            LIMIT $2
          `,
          [effectiveTenantId, sanitizedLimit],
          { tenantId: effectiveTenantId }
        );
      } catch (error) {
        console.warn('Failed to load security scan reports for compliance dashboard', { error });
      }

      const securityScans = securityRows.map((row) => {
        const criticalCount = toNumber(row.critical_count, 0);
        const highCount = toNumber(row.high_count, 0);
        const mediumCount = toNumber(row.medium_count, 0);
        const lowCount = toNumber(row.low_count, 0);
        const totalFindings = criticalCount + highCount + mediumCount + lowCount;

        return {
          id: row.id,
          scanType: row.scan_type,
          target: row.target,
          status: typeof row.status === 'string' ? row.status : 'unknown',
          criticalCount,
          highCount,
          mediumCount,
          lowCount,
          totalFindings,
          durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : null,
          reportUrl: row.report_url,
          metadata: parseMaybeJson(row.metadata),
          scannedAt: toIsoString(row.scanned_at),
        };
      });

      let policyRows: any[] = [];
      try {
        policyRows = await pg.readMany(
          `
            SELECT id,
                   tenant_id,
                   policy,
                   decision,
                   allow,
                   reason,
                   metadata,
                   evaluated_at
            FROM opa_policy_decisions
            WHERE tenant_id = $1
            ORDER BY evaluated_at DESC
            LIMIT $2
          `,
          [effectiveTenantId, sanitizedLimit],
          { tenantId: effectiveTenantId }
        );
      } catch (error) {
        console.warn('Failed to load OPA policy decisions for compliance dashboard', { error });
      }

      const policyValidations = policyRows.map((row) => ({
        id: row.id,
        policy: row.policy,
        decision: row.decision,
        allow: Boolean(row.allow),
        reason: row.reason,
        metadata: parseMaybeJson(row.metadata),
        evaluatedAt: toIsoString(row.evaluated_at),
      }));

      const openFindings = securityScans.reduce(
        (total, scan) => total + scan.criticalCount + scan.highCount,
        0
      );

      const scanSuccessRate = securityScans.length
        ? securityScans.filter((scan) => scan.status.toLowerCase() === 'passed').length /
          securityScans.length
        : 1;

      const policyPassRate = policyValidations.length
        ? policyValidations.filter((validation) => validation.allow).length /
          policyValidations.length
        : 1;

      const { metrics: promMetrics, success: promSuccess } = await fetchCompliancePromMetrics(
        effectiveTenantId
      );

      const fallbackPromMetrics = buildFallbackPromMetrics(
        effectiveTenantId,
        securityScans,
        policyValidations,
        openFindings
      );

      return {
        generatedAt: new Date().toISOString(),
        auditLogs,
        securityScans,
        policyValidations,
        metrics: {
          openFindings,
          scanSuccessRate,
          policyPassRate,
          promMetrics: promSuccess ? promMetrics : fallbackPromMetrics,
        },
      };
    },
    async tenantCoherence(_: any, { tenantId }: any, ctx: any) {
      const end = gqlDuration.startTimer({ op: 'tenantCoherence' });
      try {
        const user = getUser(ctx);

        // Enhanced ABAC enforcement with purpose checking
        const policyDecision = await policyEnforcer.requirePurpose('investigation', {
          tenantId,
          userId: user?.id,
          action: 'read' as Action,
          resource: 'coherence_score',
          purpose: ctx.purpose as Purpose,
          clientIP: ctx.req?.ip,
          userAgent: ctx.req?.get('user-agent')
        });

        if (!policyDecision.allow) {
          throw new Error(`Access denied: ${policyDecision.reason}`);
        }

        if (redisClient) {
          const cacheKey = `tenantCoherence:${tenantId}`;
          const cachedResult = await redisClient.get(cacheKey);
          if (cachedResult) {
            console.log(`Cache hit for ${cacheKey}`);
            const parsed = JSON.parse(cachedResult);
            
            // Apply redaction to cached result
            if (policyDecision.redactionRules && policyDecision.redactionRules.length > 0) {
              const redactionPolicy = redactionService.createRedactionPolicy(
                policyDecision.redactionRules as any
              );
              return await redactionService.redactObject(parsed, redactionPolicy, tenantId);
            }
            
            return parsed;
          }
        }

        // Enhanced database query with tenant scoping
        const row = await pg.oneOrNone(
          'SELECT score, status, updated_at FROM coherence_scores WHERE tenant_id=$1', 
          [tenantId], 
          { region: user?.residency }
        );
        
        let result = { 
          tenantId, 
          score: row?.score ?? 0, 
          status: row?.status ?? 'UNKNOWN', 
          updatedAt: row?.updated_at ?? new Date().toISOString() 
        };

        // Apply redaction based on policy decision
        if (policyDecision.redactionRules && policyDecision.redactionRules.length > 0) {
          const redactionPolicy = redactionService.createRedactionPolicy(
            policyDecision.redactionRules as any
          );
          result = await redactionService.redactObject(result, redactionPolicy, tenantId);
        }

        if (redisClient) {
          const cacheKey = `tenantCoherence:${tenantId}`;
          const ttl = 60; 
          await redisClient.setex(cacheKey, ttl, JSON.stringify(result));
          console.log(`Cache set for ${cacheKey} with TTL ${ttl}s`);
        }

        return result;
      } finally {
        end();
      }
    }
  },
  Mutation: { 
    async publishCoherenceSignal(_: any, { input }: any, ctx: any) {
      const end = gqlDuration.startTimer({ op: 'publishCoherenceSignal' });
      try {
        const user = getUser(ctx);
        // S4.1 Fine-grained Scopes: Use coherence:write:self if user is publishing for their own tenantId
        const scope = user.tenant === input.tenantId ? 'coherence:write:self' : 'coherence:write';
        // S3.2 Residency Guard: Pass residency to OPA
        opa.enforce(scope, { tenantId: input.tenantId, user, residency: user.residency });

        const { tenantId, type, value, weight, source, ts } = input;
        const signalId = `${source}:${Date.now()}`;
        await neo.run(`MERGE (t:Tenant {tenant_id:$tenantId}) WITH t MERGE (s:Signal {signal_id:$signalId}) SET s.type=$type, s.value=$value, s.weight=$weight, s.source=$source, s.ts=$ts, s.tenant_id=$tenantId, s.provenance_id=$provenanceId MERGE (t)-[:EMITS]->(s)`, { tenantId, signalId, type, value, weight, source, ts: ts || new Date().toISOString(), provenanceId: 'placeholder' }, { region: user.residency }); // S3.1: Pass region hint

      if (redisClient) {
        const cacheKey = `tenantCoherence:${tenantId}`;
        await redisClient.del(cacheKey);
        console.log(`Cache invalidated for ${cacheKey}`);
      }

        const newSignal = { id: signalId, type, value, weight, source, ts: ts || new Date().toISOString() };
        ctx.pubsub.publish(COHERENCE_EVENTS, { coherenceEvents: newSignal });

        return true;
      } finally {
        end();
      }
    }
  },
  Subscription: {
    coherenceEvents: {
      subscribe: (_: any, __: any, ctx: any) => {
        const iterator = ctx.pubsub.asyncIterator([COHERENCE_EVENTS]);
        const start = process.hrtime.bigint();
        const wrappedIterator = (async function* () {
          for await (const payload of iterator) {
            const end = process.hrtime.bigint();
            const durationMs = Number(end - start) / 1_000_000;
            subscriptionFanoutLatency.observe(durationMs);
            yield payload;
          }
        })();
        return wrappedIterator;
      },
    },
  },
};