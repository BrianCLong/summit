import { Histogram } from 'prom-client';
import { getPostgresPool } from '../config/database.js';
import { dbUrls } from '../config.js';

// Define metrics
const canaryDuration = new Histogram({
  name: 'canary_check_duration_seconds',
  help: 'Duration of canary checks in seconds',
  labelNames: ['type', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const runCanary = async (): Promise<{ status: 'ok' | 'error', latencyMs: number, details?: any }> => {
  const start = process.hrtime();

  try {
    // Perform a simple DB query (PostgreSQL)
    const pool = getPostgresPool();
    // Use a lightweight query
    await pool.query('SELECT 1');

    // Check Neo4j connectivity if configured
    // (Skipping for now to keep the canary lightweight, assuming Postgres is critical path)

    const [seconds, nanoseconds] = process.hrtime(start);
    const durationSeconds = seconds + nanoseconds / 1e9;
    const latencyMs = durationSeconds * 1000;

    canaryDuration.observe({ type: 'postgres', status: 'success' }, durationSeconds);

    return { status: 'ok', latencyMs };
  } catch (error: any) {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationSeconds = seconds + nanoseconds / 1e9;
    canaryDuration.observe({ type: 'postgres', status: 'error' }, durationSeconds);

    console.error('Canary check failed:', error);
    return { status: 'error', latencyMs: durationSeconds * 1000, details: error.message };
  }
};
