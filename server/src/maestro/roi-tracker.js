"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentROITracker = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../config/database.js");
class AgentROITracker {
    pool;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    async recordMetric(agentId, metricType, value, context) {
        const id = (0, crypto_1.randomUUID)();
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
    async getMetrics(agentId) {
        const query = `
      SELECT * FROM agent_roi_metrics
      WHERE agent_id = $1
      ORDER BY recorded_at DESC
    `;
        const res = await this.pool.query(query, [agentId]);
        return res.rows.map(this.mapRowToMetric);
    }
    async getAggregatedROI(tenantId) {
        // Returns total value per metric type for the tenant
        const query = `
      SELECT m.metric_type, SUM(m.value) as total_value
      FROM agent_roi_metrics m
      JOIN agents a ON m.agent_id = a.id
      WHERE a.tenant_id = $1
      GROUP BY m.metric_type
    `;
        const res = await this.pool.query(query, [tenantId]);
        const totals = {};
        res.rows.forEach(row => {
            totals[row.metric_type] = parseFloat(row.total_value);
        });
        return totals;
    }
    mapRowToMetric(row) {
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
exports.agentROITracker = new AgentROITracker();
