import { Pool } from 'pg';
import { randomUUID as uuidv4 } from 'crypto';
import { getPostgresPool } from '../config/database.js';
import { AgentROIMetric } from '../governance/types.js';

class AgentROITracker {
  private pool: Pool;

  constructor() {
    this.pool = getPostgresPool();
  }

  async recordMetric(
    agentId: string,
    metricType: string,
    value: number,
    context?: Record<string, any>
  ): Promise<AgentROIMetric> {
    const id = uuidv4();
    const query = `
      INSERT INTO agent_roi_metrics (
        id, agent_id, metric_type, value, context
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      id,
      agentId,
      metricType,
      value,
      context ? JSON.stringify(context) : null,
    ];

    const res = await this.pool.query(query, values);
    return this.mapRowToMetric(res.rows[0]);
  }

  async getMetrics(agentId: string): Promise<AgentROIMetric[]> {
    const query = `
      SELECT * FROM agent_roi_metrics
      WHERE agent_id = $1
      ORDER BY recorded_at DESC
    `;
    const res = await this.pool.query(query, [agentId]);
    return res.rows.map(this.mapRowToMetric);
  }

  async getAggregatedROI(tenantId: string): Promise<Record<string, number>> {
    // Returns total value per metric type for the tenant
    const query = `
      SELECT m.metric_type, SUM(m.value) as total_value
      FROM agent_roi_metrics m
      JOIN agents a ON m.agent_id = a.id
      WHERE a.tenant_id = $1
      GROUP BY m.metric_type
    `;
    const res = await this.pool.query(query, [tenantId]);

    const totals: Record<string, number> = {};
    res.rows.forEach(row => {
      totals[row.metric_type] = parseFloat(row.total_value);
    });
    return totals;
  }

  private mapRowToMetric(row: any): AgentROIMetric {
    return {
      id: row.id,
      agentId: row.agent_id,
      metricType: row.metric_type,
      value: parseFloat(row.value),
      context: row.context,
      recordedAt: row.recorded_at,
    };
  }
}

export const agentROITracker = new AgentROITracker();
