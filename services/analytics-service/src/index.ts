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

// ============================================================================
// SECURITY: Credential Validation
// ============================================================================

function requireSecret(name: string, value: string | undefined, minLength: number = 16): string {
  if (!value) {
    console.error(`FATAL: ${name} environment variable is required but not set`);
    console.error(`Set ${name} in your environment or .env file`);
    process.exit(1);
  }

  if (value.length < minLength) {
    console.error(`FATAL: ${name} must be at least ${minLength} characters`);
    console.error(`Current length: ${value.length}`);
    process.exit(1);
  }

  const insecureValues = ['password', 'secret', 'changeme', 'default', 'postgres'];
  if (insecureValues.some(v => value.toLowerCase().includes(v))) {
    console.error(`FATAL: ${name} is set to an insecure default value`);
    console.error(`Use a strong, unique secret (e.g., generated via: openssl rand -base64 32)`);
    process.exit(1);
  }

  return value;
}

import express from 'express';
import { Pool } from 'pg';

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'warehouse',
  user: process.env.POSTGRES_USER || 'postgres',
  password: requireSecret('POSTGRES_PASSWORD', process.env.POSTGRES_PASSWORD, 16),
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
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
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
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Analytics service listening on port ${PORT}`);
});

export default app;
