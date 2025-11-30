/**
 * Admin Studio GraphQL Resolvers
 */

import { Pool } from 'pg';
import { createClient } from 'redis';
import { SlowQueryKiller } from '@intelgraph/slow-query-killer';
import { MetricsExporter } from '@intelgraph/metrics-exporter';
import { PubSub } from 'graphql-subscriptions';

export interface Context {
  db: Pool;
  redis: ReturnType<typeof createClient>;
  slowQueryKiller: SlowQueryKiller;
  metrics: MetricsExporter;
  pubsub: PubSub;
  user?: {
    id: string;
    tenantId: string;
    roles: string[];
  };
}

export const resolvers = {
  Query: {
    async tenantBudget(
      _parent: any,
      args: { id?: string; tenantId?: string; period?: string },
      ctx: Context
    ) {
      const { id, tenantId, period } = args;

      let query = 'SELECT * FROM tenant_budget WHERE 1=1';
      const params: any[] = [];

      if (id) {
        query += ' AND id = $' + (params.length + 1);
        params.push(id);
      }
      if (tenantId) {
        query += ' AND tenant_id = $' + (params.length + 1);
        params.push(tenantId);
      }
      if (period) {
        query += ' AND period = $' + (params.length + 1);
        params.push(period.toLowerCase());
      }

      query += ' LIMIT 1';

      const result = await ctx.db.query(query, params);
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        period: row.period.toUpperCase(),
        limit: parseFloat(row.limit_dollars),
        current: parseFloat(row.current_dollars),
        remaining: parseFloat(row.limit_dollars) - parseFloat(row.current_dollars),
        utilizationPercent:
          (parseFloat(row.current_dollars) / parseFloat(row.limit_dollars)) * 100,
        resetAt: row.reset_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async tenantBudgets(
      _parent: any,
      args: { limit?: number; offset?: number; tenantId?: string },
      ctx: Context
    ) {
      const { limit = 50, offset = 0, tenantId } = args;

      let query = 'SELECT * FROM tenant_budget';
      const params: any[] = [];

      if (tenantId) {
        query += ' WHERE tenant_id = $1';
        params.push(tenantId);
      }

      query += ' ORDER BY updated_at DESC LIMIT $' + (params.length + 1);
      params.push(limit);
      query += ' OFFSET $' + (params.length + 1);
      params.push(offset);

      const result = await ctx.db.query(query, params);

      return result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        period: row.period.toUpperCase(),
        limit: parseFloat(row.limit_dollars),
        current: parseFloat(row.current_dollars),
        remaining: parseFloat(row.limit_dollars) - parseFloat(row.current_dollars),
        utilizationPercent:
          (parseFloat(row.current_dollars) / parseFloat(row.limit_dollars)) * 100,
        resetAt: row.reset_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },

    async budgetLedgerEntries(
      _parent: any,
      args: {
        tenantId: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
      },
      ctx: Context
    ) {
      const { tenantId, startDate, endDate, limit = 100, offset = 0 } = args;

      let query = 'SELECT * FROM budget_ledger WHERE tenant_id = $1';
      const params: any[] = [tenantId];

      if (startDate) {
        query += ' AND created_at >= $' + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND created_at <= $' + (params.length + 1);
        params.push(endDate);
      }

      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
      params.push(limit);
      query += ' OFFSET $' + (params.length + 1);
      params.push(offset);

      const result = await ctx.db.query(query, params);

      return result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        operation: row.operation,
        estimatedCost: parseFloat(row.estimated_cost),
        actualCost: row.actual_cost ? parseFloat(row.actual_cost) : null,
        resourceType: row.resource_type,
        metadata: row.metadata || {},
        createdAt: row.created_at,
      }));
    },

    async qosOverrides(
      _parent: any,
      args: { tenantId?: string; active?: boolean },
      ctx: Context
    ) {
      const { tenantId, active = true } = args;

      let query = 'SELECT * FROM qos_overrides WHERE 1=1';
      const params: any[] = [];

      if (tenantId) {
        query += ' AND tenant_id = $' + (params.length + 1);
        params.push(tenantId);
      }
      if (active) {
        query += ' AND expires_at > NOW()';
      }

      query += ' ORDER BY created_at DESC';

      const result = await ctx.db.query(query, params);

      return result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        expert: row.expert,
        exploreMax: parseFloat(row.explore_max),
        expiresAt: row.expires_at,
        reason: row.reason,
        actor: row.actor,
        createdAt: row.created_at,
      }));
    },

    async tenantNotices(
      _parent: any,
      args: {
        tenantId: string;
        acknowledged?: boolean;
        severity?: string;
      },
      ctx: Context
    ) {
      const { tenantId, acknowledged, severity } = args;

      let query = 'SELECT * FROM tenant_notices WHERE tenant_id = $1';
      const params: any[] = [tenantId];

      if (acknowledged !== undefined) {
        query += ' AND acknowledged = $' + (params.length + 1);
        params.push(acknowledged);
      }
      if (severity) {
        query += ' AND severity = $' + (params.length + 1);
        params.push(severity.toLowerCase());
      }

      query += ' ORDER BY created_at DESC';

      const result = await ctx.db.query(query, params);

      return result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        noticeType: row.notice_type,
        message: row.message,
        severity: row.severity.toUpperCase(),
        acknowledged: row.acknowledged,
        createdAt: row.created_at,
        acknowledgedAt: row.acknowledged_at,
      }));
    },

    async runningQueries(
      _parent: any,
      args: {
        tenantId?: string;
        database?: string;
        status?: string;
      },
      ctx: Context
    ) {
      let queries = ctx.slowQueryKiller.getRunningQueries(args.tenantId);

      if (args.database) {
        queries = queries.filter(
          (q) => q.database.toLowerCase() === args.database?.toLowerCase()
        );
      }

      return queries.map((q) => {
        const executionTimeMs = Date.now() - q.startTime.getTime();
        const killResult = ctx.slowQueryKiller.shouldKillQuery(q.queryId);

        return {
          queryId: q.queryId,
          tenantId: q.tenantId,
          database: q.database.toUpperCase(),
          query: q.query,
          estimatedCost: q.estimatedCost,
          complexity: q.complexity,
          executionTimeMs,
          costIncurred: killResult.costIncurred,
          status: killResult.killed
            ? 'SHOULD_KILL'
            : executionTimeMs > 3000
              ? 'WARNING'
              : 'RUNNING',
          startedAt: q.startTime,
        };
      });
    },

    async slowQueryStats(
      _parent: any,
      args: { tenantId?: string; period?: string },
      ctx: Context
    ) {
      const stats = ctx.slowQueryKiller.getStats();

      // TODO: Calculate percentiles from actual query data
      return {
        ...stats,
        avgExecutionTimeMs: 1250, // Placeholder
        p95ExecutionTimeMs: 3000, // Placeholder
        p99ExecutionTimeMs: 5000, // Placeholder
      };
    },

    async serviceHealth(_parent: any, args: { service?: string }, ctx: Context) {
      // TODO: Implement actual health checks
      const services = args.service
        ? [args.service]
        : ['api', 'graph-api', 'copilot', 'neo4j', 'postgres', 'redis'];

      return services.map((service) => ({
        service,
        status: 'HEALTHY',
        uptime: process.uptime(),
        lastCheck: new Date(),
        details: {},
      }));
    },

    async systemMetrics(_parent: any, _args: any, ctx: Context) {
      const memoryUsage = process.memoryUsage();

      return {
        cpuUsagePercent: 0, // Would need os.cpus() monitoring
        memoryUsageBytes: memoryUsage.heapUsed,
        memoryUsagePercent:
          (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        activeConnections: 0, // Would need to track
        requestRate: 0, // Would need metrics
        errorRate: 0, // Would need metrics
        p95LatencyMs: 0, // Would need metrics
      };
    },

    async costMetrics(
      _parent: any,
      args: {
        tenantId: string;
        period?: string;
        startDate?: Date;
        endDate?: Date;
      },
      ctx: Context
    ) {
      const { tenantId, startDate, endDate } = args;

      let query = `
        SELECT
          operation,
          resource_type,
          SUM(COALESCE(actual_cost, estimated_cost)) as total_cost,
          COUNT(*) as request_count
        FROM budget_ledger
        WHERE tenant_id = $1
      `;
      const params: any[] = [tenantId];

      if (startDate) {
        query += ' AND created_at >= $' + (params.length + 1);
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND created_at <= $' + (params.length + 1);
        params.push(endDate);
      }

      query += ' GROUP BY operation, resource_type';

      const result = await ctx.db.query(query, params);

      const costByOperation: Record<string, number> = {};
      const costByResource: Record<string, number> = {};
      let totalCost = 0;
      let requestCount = 0;

      for (const row of result.rows) {
        const cost = parseFloat(row.total_cost);
        const count = parseInt(row.request_count);

        costByOperation[row.operation] =
          (costByOperation[row.operation] || 0) + cost;
        costByResource[row.resource_type] =
          (costByResource[row.resource_type] || 0) + cost;

        totalCost += cost;
        requestCount += count;
      }

      return {
        tenantId,
        period: args.period?.toUpperCase() || 'DAY',
        totalCost,
        costByOperation,
        costByResource,
        requestCount,
        avgCostPerRequest: requestCount > 0 ? totalCost / requestCount : 0,
      };
    },

    async aggregatedCostMetrics(
      _parent: any,
      args: { period?: string; topN?: number },
      ctx: Context
    ) {
      const { topN = 10 } = args;

      const query = `
        SELECT
          tenant_id,
          SUM(COALESCE(actual_cost, estimated_cost)) as total_cost,
          COUNT(*) as request_count
        FROM budget_ledger
        WHERE created_at >= NOW() - INTERVAL '1 day'
        GROUP BY tenant_id
        ORDER BY total_cost DESC
        LIMIT $1
      `;

      const result = await ctx.db.query(query, [topN]);

      return result.rows.map((row) => ({
        tenantId: row.tenant_id,
        period: 'DAY',
        totalCost: parseFloat(row.total_cost),
        costByOperation: {},
        costByResource: {},
        requestCount: parseInt(row.request_count),
        avgCostPerRequest:
          parseFloat(row.total_cost) / parseInt(row.request_count),
      }));
    },

    async featureFlags(_parent: any, args: { name?: string }, ctx: Context) {
      // Feature flags stored in Redis
      const keys = await ctx.redis.keys('feature_flag:*');
      const flags = [];

      for (const key of keys) {
        const data = await ctx.redis.get(key);
        if (data) {
          const flag = JSON.parse(data);
          if (!args.name || flag.name === args.name) {
            flags.push(flag);
          }
        }
      }

      return flags;
    },

    async featureFlag(_parent: any, args: { name: string }, ctx: Context) {
      const data = await ctx.redis.get(`feature_flag:${args.name}`);
      return data ? JSON.parse(data) : null;
    },

    async connectorJobs(
      _parent: any,
      args: {
        connectorType?: string;
        status?: string;
        limit?: number;
        offset?: number;
      },
      ctx: Context
    ) {
      // Placeholder - would integrate with actual connector job system
      return [];
    },

    async sloAdherence(
      _parent: any,
      args: { service?: string; sloName?: string },
      ctx: Context
    ) {
      // Placeholder - would integrate with actual SLO tracking
      return [];
    },
  },

  Mutation: {
    async setTenantBudget(
      _parent: any,
      args: { tenantId: string; period: string; limit: number },
      ctx: Context
    ) {
      const { tenantId, period, limit } = args;

      const query = `
        INSERT INTO tenant_budget (tenant_id, period, limit_dollars, current_dollars, reset_at)
        VALUES ($1, $2, $3, 0, NOW() + INTERVAL '1 ${period.toLowerCase()}')
        ON CONFLICT (tenant_id, period)
        DO UPDATE SET
          limit_dollars = $3,
          updated_at = NOW()
        RETURNING *
      `;

      const result = await ctx.db.query(query, [
        tenantId,
        period.toLowerCase(),
        limit,
      ]);

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        period: row.period.toUpperCase(),
        limit: parseFloat(row.limit_dollars),
        current: parseFloat(row.current_dollars),
        remaining: parseFloat(row.limit_dollars) - parseFloat(row.current_dollars),
        utilizationPercent:
          (parseFloat(row.current_dollars) / parseFloat(row.limit_dollars)) * 100,
        resetAt: row.reset_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async recordSpending(
      _parent: any,
      args: {
        tenantId: string;
        operation: string;
        estimatedCost: number;
        actualCost?: number;
        resourceType: string;
        metadata?: any;
      },
      ctx: Context
    ) {
      const { tenantId, operation, estimatedCost, actualCost, resourceType, metadata } = args;

      const query = `
        INSERT INTO budget_ledger (
          tenant_id, operation, estimated_cost, actual_cost, resource_type, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await ctx.db.query(query, [
        tenantId,
        operation,
        estimatedCost,
        actualCost || null,
        resourceType,
        metadata || {},
      ]);

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        operation: row.operation,
        estimatedCost: parseFloat(row.estimated_cost),
        actualCost: row.actual_cost ? parseFloat(row.actual_cost) : null,
        resourceType: row.resource_type,
        metadata: row.metadata || {},
        createdAt: row.created_at,
      };
    },

    async createQOSOverride(
      _parent: any,
      args: {
        tenantId: string;
        expert?: string;
        exploreMax: number;
        ttlMinutes: number;
        reason: string;
      },
      ctx: Context
    ) {
      const { tenantId, expert, exploreMax, ttlMinutes, reason } = args;
      const actor = ctx.user?.id || 'system';

      const query = `
        INSERT INTO qos_overrides (
          tenant_id, expert, explore_max, expires_at, reason, actor
        )
        VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval, $5, $6)
        RETURNING *
      `;

      const result = await ctx.db.query(query, [
        tenantId,
        expert || null,
        exploreMax,
        ttlMinutes,
        reason,
        actor,
      ]);

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        expert: row.expert,
        exploreMax: parseFloat(row.explore_max),
        expiresAt: row.expires_at,
        reason: row.reason,
        actor: row.actor,
        createdAt: row.created_at,
      };
    },

    async extendQOSOverride(
      _parent: any,
      args: { id: string; extendMinutes: number; reason: string },
      ctx: Context
    ) {
      const { id, extendMinutes, reason } = args;
      const actor = ctx.user?.id || 'system';

      const query = `
        UPDATE qos_overrides
        SET
          expires_at = expires_at + ($1 || ' minutes')::interval,
          reason = reason || '; extended by ' || $2 || ' for ' || $3,
          updated_at = NOW()
        WHERE id = $4 AND expires_at > NOW()
        RETURNING *
      `;

      const result = await ctx.db.query(query, [extendMinutes, actor, reason, id]);

      if (result.rows.length === 0) {
        throw new Error('QOS override not found or expired');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        expert: row.expert,
        exploreMax: parseFloat(row.explore_max),
        expiresAt: row.expires_at,
        reason: row.reason,
        actor: row.actor,
        createdAt: row.created_at,
      };
    },

    async deleteQOSOverride(_parent: any, args: { id: string }, ctx: Context) {
      const result = await ctx.db.query('DELETE FROM qos_overrides WHERE id = $1', [
        args.id,
      ]);
      return result.rowCount > 0;
    },

    async acknowledgeTenantNotice(_parent: any, args: { id: string }, ctx: Context) {
      const query = `
        UPDATE tenant_notices
        SET acknowledged = true, acknowledged_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await ctx.db.query(query, [args.id]);

      if (result.rows.length === 0) {
        throw new Error('Tenant notice not found');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        noticeType: row.notice_type,
        message: row.message,
        severity: row.severity.toUpperCase(),
        acknowledged: row.acknowledged,
        createdAt: row.created_at,
        acknowledgedAt: row.acknowledged_at,
      };
    },

    async killQuery(_parent: any, args: { queryId: string }, ctx: Context) {
      // Emit event to kill query
      ctx.pubsub.publish('KILL_QUERY', { queryId: args.queryId });
      return true;
    },

    async setTenantQueryBudget(
      _parent: any,
      args: {
        tenantId: string;
        maxExecutionTimeMs: number;
        maxCostDollars: number;
        maxConcurrentQueries?: number;
        maxComplexity?: number;
      },
      ctx: Context
    ) {
      ctx.slowQueryKiller.setTenantBudget(args.tenantId, args);
      return true;
    },

    async toggleFeatureFlag(
      _parent: any,
      args: { name: string; enabled: boolean },
      ctx: Context
    ) {
      const key = `feature_flag:${args.name}`;
      const existing = await ctx.redis.get(key);
      const flag = existing ? JSON.parse(existing) : { name: args.name };

      flag.enabled = args.enabled;
      flag.updatedAt = new Date().toISOString();

      await ctx.redis.set(key, JSON.stringify(flag));

      return flag;
    },

    async updateFeatureFlagRollout(
      _parent: any,
      args: {
        name: string;
        rolloutPercent: number;
        tenantWhitelist?: string[];
        tenantBlacklist?: string[];
      },
      ctx: Context
    ) {
      const key = `feature_flag:${args.name}`;
      const existing = await ctx.redis.get(key);
      const flag = existing ? JSON.parse(existing) : { name: args.name };

      flag.rolloutPercent = args.rolloutPercent;
      flag.tenantWhitelist = args.tenantWhitelist || [];
      flag.tenantBlacklist = args.tenantBlacklist || [];
      flag.updatedAt = new Date().toISOString();

      await ctx.redis.set(key, JSON.stringify(flag));

      return flag;
    },

    async retryConnectorJob(_parent: any, args: { id: string }, ctx: Context) {
      // Placeholder - would integrate with actual connector job system
      throw new Error('Not implemented');
    },

    async cancelConnectorJob(_parent: any, args: { id: string }, ctx: Context) {
      // Placeholder - would integrate with actual connector job system
      throw new Error('Not implemented');
    },
  },

  Subscription: {
    budgetUtilizationChanged: {
      subscribe: (_parent: any, args: { tenantId: string }, ctx: Context) => {
        return ctx.pubsub.asyncIterator([`BUDGET_CHANGED_${args.tenantId}`]);
      },
    },

    queryWarnings: {
      subscribe: (_parent: any, args: { tenantId?: string }, ctx: Context) => {
        const topic = args.tenantId
          ? `QUERY_WARNING_${args.tenantId}`
          : 'QUERY_WARNING';
        return ctx.pubsub.asyncIterator([topic]);
      },
    },

    queryKills: {
      subscribe: (_parent: any, args: { tenantId?: string }, ctx: Context) => {
        const topic = args.tenantId ? `QUERY_KILL_${args.tenantId}` : 'QUERY_KILL';
        return ctx.pubsub.asyncIterator([topic]);
      },
    },

    systemMetricsUpdated: {
      subscribe: (_parent: any, _args: any, ctx: Context) => {
        return ctx.pubsub.asyncIterator(['SYSTEM_METRICS']);
      },
    },
  },
};
