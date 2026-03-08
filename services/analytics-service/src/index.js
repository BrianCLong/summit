"use strict";
/**
 * Summit Analytics Service
 *
 * Provides advanced analytics capabilities including:
 * - Statistical analysis
 * - Trend analysis
 * - Predictive analytics
 * - Real-time dashboards
 * - Report generation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const pool = new pg_1.Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'warehouse',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password',
});
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'analytics' });
});
// Analytics endpoints
app.post('/api/v1/analytics/aggregate', async (req, res) => {
    try {
        const { table, measure, dimension, aggregation } = req.body;
        const result = await pool.query(`
      SELECT ${dimension}, ${aggregation}(${measure}) as value
      FROM ${table}
      GROUP BY ${dimension}
      ORDER BY value DESC
    `);
        res.json({ data: result.rows });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/analytics/timeseries', async (req, res) => {
    try {
        const { table, measure, timeColumn, interval } = req.body;
        const result = await pool.query(`
      SELECT
        date_trunc('${interval}', ${timeColumn}) as period,
        SUM(${measure}) as total,
        AVG(${measure}) as average,
        COUNT(*) as count
      FROM ${table}
      GROUP BY period
      ORDER BY period
    `);
        res.json({ data: result.rows });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Analytics service listening on port ${PORT}`);
});
exports.default = app;
