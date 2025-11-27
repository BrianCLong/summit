import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database';
import {
  FactRun, FactTask, FactSecurity, FactOps,
  KPIDefinition, KPIValue, Forecast, RiskAssessment
} from './types';

export class SummitsightDataService {
  private pool: Pool;

  constructor() {
    this.pool = getPostgresPool();
  }

  // --- Ingestion Methods ---

  async recordRun(run: FactRun): Promise<void> {
    const query = `
      INSERT INTO summitsight_fact_runs
      (run_id, tenant_id, workflow_name, start_time, end_time, duration_ms, status, cost_usd, outcome_summary)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (fact_id) DO NOTHING
    `;
    await this.pool.query(query, [
      run.run_id, run.tenant_id, run.workflow_name, run.start_time,
      run.end_time, run.duration_ms, run.status, run.cost_usd, run.outcome_summary
    ]);
  }

  async recordTask(task: FactTask): Promise<void> {
    const query = `
      INSERT INTO summitsight_fact_tasks
      (run_id, tenant_id, task_type, agent_id, model_used, input_tokens, output_tokens, cost_usd, latency_ms, status, error_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
    await this.pool.query(query, [
      task.run_id, task.tenant_id, task.task_type, task.agent_id, task.model_used,
      task.input_tokens, task.output_tokens, task.cost_usd, task.latency_ms, task.status, task.error_code
    ]);
  }

  async recordSecurityEvent(event: FactSecurity): Promise<void> {
    const query = `
      INSERT INTO summitsight_fact_security
      (tenant_id, event_type, severity, source, description, risk_score, detected_at, resolved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await this.pool.query(query, [
      event.tenant_id, event.event_type, event.severity, event.source,
      event.description, event.risk_score, event.detected_at, event.resolved_at
    ]);
  }

  async recordOpsMetric(ops: FactOps): Promise<void> {
    const query = `
      INSERT INTO summitsight_fact_ops
      (tenant_id, metric_type, value, unit, context, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await this.pool.query(query, [
      ops.tenant_id, ops.metric_type, ops.value, ops.unit, ops.context, ops.timestamp
    ]);
  }

  // --- KPI Methods ---

  async getKPIDefinitions(category?: string): Promise<KPIDefinition[]> {
    let query = `SELECT * FROM summitsight_kpi_registry`;
    const params: any[] = [];
    if (category) {
      query += ` WHERE category = $1`;
      params.push(category);
    }
    const res = await this.pool.query(query, params);
    return res.rows;
  }

  async getKPIValues(kpiId: string, tenantId?: string, period: string = 'daily', limit: number = 30): Promise<KPIValue[]> {
    let query = `
      SELECT * FROM summitsight_kpi_values
      WHERE kpi_id = $1 AND period = $2
    `;
    const params: any[] = [kpiId, period];
    let idx = 3;

    if (tenantId) {
      query += ` AND tenant_id = $${idx}`;
      params.push(tenantId);
      idx++;
    } else {
        query += ` AND tenant_id IS NULL`;
    }

    query += ` ORDER BY time_bucket DESC LIMIT $${idx}`;
    params.push(limit);

    const res = await this.pool.query(query, params);
    return res.rows;
  }

  async saveKPIValue(value: KPIValue): Promise<void> {
    const query = `
      INSERT INTO summitsight_kpi_values
      (kpi_id, tenant_id, time_bucket, period, value, dimension_filters)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `;
    // Note: Conflict handling might need to be smarter (update) in prod, but keeping simple for MVP
    await this.pool.query(query, [
      value.kpi_id, value.tenant_id, value.time_bucket, value.period, value.value, value.dimension_filters
    ]);
  }

  // --- Forecast & Risk ---

  async getForecasts(kpiId: string, tenantId?: string): Promise<Forecast[]> {
    let query = `SELECT * FROM summitsight_forecasts WHERE kpi_id = $1`;
    const params: any[] = [kpiId];
    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    } else {
        query += ` AND tenant_id IS NULL`;
    }
    query += ` ORDER BY forecast_date ASC`;
    const res = await this.pool.query(query, params);
    return res.rows;
  }

  async saveForecast(forecast: Forecast): Promise<void> {
    const query = `
      INSERT INTO summitsight_forecasts
      (kpi_id, tenant_id, forecast_date, predicted_value, confidence_interval_lower, confidence_interval_upper, model_version)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await this.pool.query(query, [
      forecast.kpi_id, forecast.tenant_id, forecast.forecast_date, forecast.predicted_value,
      forecast.confidence_interval_lower, forecast.confidence_interval_upper, forecast.model_version
    ]);
  }

  async getRiskAssessment(tenantId: string): Promise<RiskAssessment[]> {
    const query = `
      SELECT * FROM summitsight_risk_assessments
      WHERE tenant_id = $1
      ORDER BY assessed_at DESC
      LIMIT 10
    `;
    const res = await this.pool.query(query, [tenantId]);
    return res.rows;
  }

  async saveRiskAssessment(risk: RiskAssessment): Promise<void> {
    const query = `
        INSERT INTO summitsight_risk_assessments
        (tenant_id, risk_category, risk_score, factors, assessed_at)
        VALUES ($1, $2, $3, $4, $5)
    `;
    await this.pool.query(query, [
        risk.tenant_id, risk.risk_category, risk.risk_score, risk.factors, risk.assessed_at
    ]);
  }

  // --- Aggregation Queries for Metrics Engine ---

  async aggregateDailyRunStats(tenantId: string, date: string) {
    // Helper to get raw counts for a day
    const query = `
      SELECT
        COUNT(*) as count,
        AVG(duration_ms) as avg_duration,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failures,
        SUM(cost_usd) as total_cost
      FROM summitsight_fact_runs
      WHERE tenant_id = $1
      AND start_time >= $2::timestamp
      AND start_time < ($2::timestamp + INTERVAL '1 day')
    `;
    const res = await this.pool.query(query, [tenantId, date]);
    return res.rows[0];
  }

  async aggregateDeploymentStats(tenantId: string, date: string): Promise<number> {
      // Logic: Count ops metrics where metric_type = 'deployment'
      const query = `
          SELECT COUNT(*) as count
          FROM summitsight_fact_ops
          WHERE tenant_id = $1
          AND metric_type = 'deployment'
          AND timestamp >= $2::timestamp
          AND timestamp < ($2::timestamp + INTERVAL '1 day')
      `;
      const res = await this.pool.query(query, [tenantId, date]);
      return Number(res.rows[0]?.count || 0);
  }

  async aggregateChangeFailStats(tenantId: string, date: string): Promise<number> {
      // Calculate % of deployments that were failures or followed by 'rollback'
      const query = `
          WITH deployments AS (
              SELECT count(*) as total FROM summitsight_fact_ops
              WHERE tenant_id = $1 AND metric_type = 'deployment'
              AND timestamp >= $2::timestamp AND timestamp < ($2::timestamp + INTERVAL '1 day')
          ),
          failures AS (
              SELECT count(*) as total FROM summitsight_fact_ops
              WHERE tenant_id = $1 AND metric_type = 'deployment_failure'
              AND timestamp >= $2::timestamp AND timestamp < ($2::timestamp + INTERVAL '1 day')
          )
          SELECT
            CASE
                WHEN d.total = 0 THEN 0
                ELSE (CAST(f.total AS FLOAT) / d.total) * 100
            END as rate
          FROM deployments d, failures f
      `;
      const res = await this.pool.query(query, [tenantId, date]);
      return Number(res.rows[0]?.rate || 0);
  }

  async aggregateIncidentStats(tenantId: string, date: string): Promise<number> {
      const query = `
          SELECT COUNT(*) as count
          FROM summitsight_fact_security
          WHERE tenant_id = $1
          AND detected_at >= $2::timestamp
          AND detected_at < ($2::timestamp + INTERVAL '1 day')
      `;
      const res = await this.pool.query(query, [tenantId, date]);
      return Number(res.rows[0]?.count || 0);
  }
}
