import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import Redis from 'ioredis';
import express from 'express';

interface CostMetrics {
  totalSpend: number;
  dailySpend: number;
  projectedMonthlySpend: number;
  budgetRemaining: number;
  spendByProvider: Record<string, number>;
  spendByTenant: Record<string, number>;
  costPerRun: number;
  costTrend: Array<{ date: string; amount: number }>;
}

interface PerformanceMetrics {
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  throughputRps: number;
  errorRate: number;
  successRate: number;
  latencyHeatmap: Array<{ timestamp: string; latency: number; count: number }>;
}

interface SLOMetrics {
  availability: { target: number; actual: number; budget: number };
  latency: { target: number; actual: number; budget: number };
  errorRate: { target: number; actual: number; budget: number };
  burnRate: number;
  timeToExhaustion: number; // hours
}

interface QueryBudgetMetrics {
  slowQueries: Array<{
    query: string;
    avgLatency: number;
    count: number;
    totalCost: number;
  }>;
  killsExecuted: number;
  budgetSaved: number;
}

export class FinOpsObservabilityService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async getCostMetrics(
    tenantId?: string,
    timeframe: string = '24h',
  ): Promise<CostMetrics> {
    const span = otelService.createSpan('finops.get_cost_metrics');

    try {
      const pool = getPostgresPool();

      // Build time filter
      let timeFilter = '';
      switch (timeframe) {
        case '1h':
          timeFilter = "created_at >= NOW() - INTERVAL '1 hour'";
          break;
        case '24h':
          timeFilter = "created_at >= NOW() - INTERVAL '24 hours'";
          break;
        case '7d':
          timeFilter = "created_at >= NOW() - INTERVAL '7 days'";
          break;
        case '30d':
          timeFilter = "created_at >= NOW() - INTERVAL '30 days'";
          break;
        default:
          timeFilter = "created_at >= NOW() - INTERVAL '24 hours'";
      }

      const params: any[] = [];
      if (tenantId) {
        params.push(tenantId);
      }

      const buildQuery = (baseQuery: string, useTenantFilter: boolean) => {
        let query = baseQuery;
        if (useTenantFilter && tenantId) {
          query += ` AND tenant_id = $${params.length}`;
        }
        return query;
      };

      // Total spend
      const totalSpendQuery = buildQuery(
        `
        SELECT COALESCE(SUM(amount_usd), 0) as total_spend
        FROM budget_spend 
        WHERE ${timeFilter}`,
        true,
      );
      const { rows: totalRows } = await pool.query(totalSpendQuery, params);

      // Daily spend
      const dailySpendQuery = buildQuery(
        `
        SELECT COALESCE(SUM(amount_usd), 0) as daily_spend
        FROM budget_spend 
        WHERE created_at >= CURRENT_DATE`,
        true,
      );
      const { rows: dailyRows } = await pool.query(dailySpendQuery, params);

      // Spend by provider
      const providerSpendQuery = buildQuery(
        `
        SELECT expert_type as provider, SUM(amount_usd) as amount
        FROM budget_spend 
        WHERE ${timeFilter}
        GROUP BY expert_type
        ORDER BY amount DESC`,
        true,
      );
      const { rows: providerRows } = await pool.query(
        providerSpendQuery,
        params,
      );

      // Spend by tenant (if not tenant-specific)
      let tenantSpend: Record<string, number> = {};
      if (!tenantId) {
        const { rows: tenantRows } = await pool.query(`
          SELECT tenant_id, SUM(amount_usd) as amount
          FROM budget_spend 
          WHERE ${timeFilter}
          GROUP BY tenant_id
          ORDER BY amount DESC
        `);
        tenantSpend = Object.fromEntries(
          tenantRows.map((row) => [row.tenant_id, parseFloat(row.amount)]),
        );
      }

      // Cost trend (last 7 days)
      const costTrendQuery = buildQuery(
        `
        SELECT DATE(created_at) as date, SUM(amount_usd) as amount
        FROM budget_spend 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date`,
        true,
      );
      const { rows: trendRows } = await pool.query(costTrendQuery, params);

      // Calculate projections and remaining budget
      const totalSpend = parseFloat(totalRows[0].total_spend || 0);
      const dailySpend = parseFloat(dailyRows[0].daily_spend || 0);
      const daysInMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      ).getDate();
      const projectedMonthlySpend = dailySpend * daysInMonth;

      // Get budget limit from config (default $5000/month)
      const monthlyBudget = parseFloat(process.env.MONTHLY_BUDGET || '5000');
      const budgetRemaining = Math.max(
        0,
        monthlyBudget - projectedMonthlySpend,
      );

      // Cost per run
      const { rows: runCountRows } = await pool.query(`
        SELECT COUNT(*) as run_count FROM run 
        WHERE ${timeFilter.replace('created_at', 'started_at')}
      `);
      const runCount = parseInt(runCountRows[0].run_count || 1);
      const costPerRun = totalSpend / runCount;

      span?.addSpanAttributes({
        'finops.total_spend': totalSpend,
        'finops.daily_spend': dailySpend,
        'finops.run_count': runCount,
        'finops.tenant_id': tenantId || 'all',
      });

      return {
        totalSpend,
        dailySpend,
        projectedMonthlySpend,
        budgetRemaining,
        spendByProvider: Object.fromEntries(
          providerRows.map((row) => [row.provider, parseFloat(row.amount)]),
        ),
        spendByTenant: tenantSpend,
        costPerRun,
        costTrend: trendRows.map((row) => ({
          date: row.date,
          amount: parseFloat(row.amount),
        })),
      };
    } catch (error: any) {
      console.error('Cost metrics query failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  async getPerformanceMetrics(
    timeframe: string = '1h',
  ): Promise<PerformanceMetrics> {
    const span = otelService.createSpan('finops.get_performance_metrics');

    try {
      const pool = getPostgresPool();

      // Get latency percentiles from serving metrics
      const { rows: latencyRows } = await pool.query(`
        SELECT 
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value) as p99
        FROM serving_metrics 
        WHERE metric_name = 'latency' 
        AND timestamp >= NOW() - INTERVAL '${timeframe === '1h' ? '1 hour' : '24 hours'}'
      `);

      // Get throughput
      const { rows: throughputRows } = await pool.query(`
        SELECT AVG(metric_value) as avg_throughput
        FROM serving_metrics 
        WHERE metric_name = 'throughputRps' 
        AND timestamp >= NOW() - INTERVAL '${timeframe === '1h' ? '1 hour' : '24 hours'}'
      `);

      // Get error rates from run events
      const { rows: errorRows } = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE kind LIKE '%error%') as error_count,
          COUNT(*) as total_events,
          (COUNT(*) FILTER (WHERE kind LIKE '%error%')) * 100.0 / COUNT(*) as error_rate
        FROM run_event 
        WHERE ts >= NOW() - INTERVAL '${timeframe === '1h' ? '1 hour' : '24 hours'}'
      `);

      // Latency heatmap data
      const { rows: heatmapRows } = await pool.query(`
        SELECT 
          DATE_TRUNC('minute', timestamp) as timestamp,
          AVG(metric_value) as latency,
          COUNT(*) as count
        FROM serving_metrics 
        WHERE metric_name = 'latency'
        AND timestamp >= NOW() - INTERVAL '${timeframe === '1h' ? '1 hour' : '24 hours'}'
        GROUP BY DATE_TRUNC('minute', timestamp)
        ORDER BY timestamp
      `);

      const latencyData = latencyRows[0] || {};
      const throughputData = throughputRows[0] || {};
      const errorData = errorRows[0] || {};

      return {
        p50Latency: parseFloat(latencyData.p50 || 0),
        p95Latency: parseFloat(latencyData.p95 || 0),
        p99Latency: parseFloat(latencyData.p99 || 0),
        throughputRps: parseFloat(throughputData.avg_throughput || 0),
        errorRate: parseFloat(errorData.error_rate || 0),
        successRate: Math.max(0, 100 - parseFloat(errorData.error_rate || 0)),
        latencyHeatmap: heatmapRows.map((row) => ({
          timestamp: row.timestamp,
          latency: parseFloat(row.latency),
          count: parseInt(row.count),
        })),
      };
    } catch (error: any) {
      console.error('Performance metrics query failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  async getSLOMetrics(): Promise<SLOMetrics> {
    const span = otelService.createSpan('finops.get_slo_metrics');

    try {
      // SLO targets (configurable)
      const availabilityTarget =
        parseFloat(process.env.SLO_AVAILABILITY_TARGET || '99.9') / 100;
      const latencyTarget = parseFloat(
        process.env.SLO_LATENCY_P95_TARGET || '1500',
      ); // ms
      const errorRateTarget = parseFloat(
        process.env.SLO_ERROR_RATE_TARGET || '1.0',
      ); // %

      // Get actual metrics for the last 30 days
      const pool = getPostgresPool();

      // Availability calculation
      const { rows: availabilityRows } = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'SUCCEEDED') as successful_runs,
          COUNT(*) as total_runs
        FROM run 
        WHERE started_at >= NOW() - INTERVAL '30 days'
      `);

      const actualAvailability =
        availabilityRows[0]?.total_runs > 0
          ? parseFloat(availabilityRows[0].successful_runs) /
            parseFloat(availabilityRows[0].total_runs)
          : 1.0;

      // P95 Latency
      const { rows: latencyRows } = await pool.query(`
        SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95_latency
        FROM serving_metrics 
        WHERE metric_name = 'latency' 
        AND timestamp >= NOW() - INTERVAL '30 days'
      `);

      const actualLatency = parseFloat(latencyRows[0]?.p95_latency || 0);

      // Error rate
      const { rows: errorRows } = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE kind LIKE '%error%') * 100.0 / COUNT(*) as error_rate
        FROM run_event 
        WHERE ts >= NOW() - INTERVAL '30 days'
      `);

      const actualErrorRate = parseFloat(errorRows[0]?.error_rate || 0);

      // Calculate error budgets (amount of unreliability we can tolerate)
      const availabilityBudget = Math.max(
        0,
        (availabilityTarget - actualAvailability) / (1 - availabilityTarget),
      );
      const latencyBudget = Math.max(
        0,
        (latencyTarget - actualLatency) / latencyTarget,
      );
      const errorBudget = Math.max(
        0,
        (errorRateTarget - actualErrorRate) / errorRateTarget,
      );

      // Calculate burn rate (how fast we're consuming error budget)
      const overallBurnRate =
        1 - Math.min(availabilityBudget, latencyBudget, errorBudget);

      // Time to exhaustion (simplified calculation)
      const timeToExhaustion =
        overallBurnRate > 0
          ? (Math.min(availabilityBudget, latencyBudget, errorBudget) /
              overallBurnRate) *
            24
          : Infinity;

      span?.addSpanAttributes({
        'slo.availability_actual': actualAvailability,
        'slo.latency_actual': actualLatency,
        'slo.error_rate_actual': actualErrorRate,
        'slo.burn_rate': overallBurnRate,
      });

      return {
        availability: {
          target: availabilityTarget,
          actual: actualAvailability,
          budget: availabilityBudget,
        },
        latency: {
          target: latencyTarget,
          actual: actualLatency,
          budget: latencyBudget,
        },
        errorRate: {
          target: errorRateTarget,
          actual: actualErrorRate,
          budget: errorBudget,
        },
        burnRate: overallBurnRate,
        timeToExhaustion: Math.min(timeToExhaustion, 168), // Cap at 1 week
      };
    } catch (error: any) {
      console.error('SLO metrics query failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  async getSlowQueryMetrics(): Promise<QueryBudgetMetrics> {
    const span = otelService.createSpan('finops.get_slow_query_metrics');

    try {
      const pool = getPostgresPool();

      // Get slow queries from audit logs
      const { rows: slowQueryRows } = await pool.query(`
        SELECT 
          LEFT(query, 100) as query_preview,
          AVG(duration_ms) as avg_latency,
          COUNT(*) as count,
          SUM(cost) as total_cost
        FROM query_audit 
        WHERE duration_ms > 5000  -- Queries slower than 5 seconds
        AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY LEFT(query, 100)
        ORDER BY total_cost DESC
        LIMIT 10
      `);

      // Get kill statistics
      const { rows: killRows } = await pool.query(`
        SELECT 
          COUNT(*) as kills_executed,
          COALESCE(SUM(estimated_cost_saved), 0) as budget_saved
        FROM query_kills
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);

      return {
        slowQueries: slowQueryRows.map((row) => ({
          query: row.query_preview + '...',
          avgLatency: parseFloat(row.avg_latency),
          count: parseInt(row.count),
          totalCost: parseFloat(row.total_cost || 0),
        })),
        killsExecuted: parseInt(killRows[0]?.kills_executed || 0),
        budgetSaved: parseFloat(killRows[0]?.budget_saved || 0),
      };
    } catch (error: any) {
      console.error('Slow query metrics failed:', error);
      return {
        slowQueries: [],
        killsExecuted: 0,
        budgetSaved: 0,
      };
    } finally {
      span?.end();
    }
  }

  async createAlert(
    condition: string,
    threshold: number,
    metric: string,
    tenantId?: string,
  ): Promise<void> {
    const pool = getPostgresPool();

    await pool.query(
      `
      INSERT INTO finops_alerts (condition_type, threshold_value, metric_name, tenant_id, created_at)
      VALUES ($1, $2, $3, $4, now())
    `,
      [condition, threshold, metric, tenantId],
    );
  }
}

// API Router
export function createFinOpsRouter(): express.Router {
  const router = express.Router();
  const service = new FinOpsObservabilityService();

  router.get('/cost-metrics', async (req, res) => {
    try {
      const { tenantId, timeframe } = req.query as any;
      const metrics = await service.getCostMetrics(tenantId, timeframe);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/performance-metrics', async (req, res) => {
    try {
      const { timeframe } = req.query as any;
      const metrics = await service.getPerformanceMetrics(timeframe);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/slo-metrics', async (req, res) => {
    try {
      const metrics = await service.getSLOMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/slow-queries', async (req, res) => {
    try {
      const metrics = await service.getSlowQueryMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/alerts', async (req, res) => {
    try {
      const { condition, threshold, metric, tenantId } = req.body;
      await service.createAlert(condition, threshold, metric, tenantId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export const FINOPS_SCHEMA = `
CREATE TABLE IF NOT EXISTS query_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT,
  query TEXT NOT NULL,
  duration_ms INT NOT NULL,
  cost DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS query_kills (
  id BIGSERIAL PRIMARY KEY,
  query_id BIGINT,
  reason TEXT,
  estimated_cost_saved DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finops_alerts (
  id BIGSERIAL PRIMARY KEY,
  condition_type TEXT NOT NULL,
  threshold_value DECIMAL(10,4),
  metric_name TEXT NOT NULL,
  tenant_id TEXT,
  triggered_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS query_audit_duration_idx ON query_audit (duration_ms DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS finops_alerts_triggered_idx ON finops_alerts (triggered_at, resolved_at) WHERE triggered_at IS NOT NULL;
`;

export const finOpsService = new FinOpsObservabilityService();
