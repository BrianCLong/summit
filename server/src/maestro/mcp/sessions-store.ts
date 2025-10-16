import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database.js';

export async function ensureSessionsTable() {
  const pool: Pool = getPostgresPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mcp_sessions (
      sid UUID PRIMARY KEY,
      run_id TEXT NOT NULL,
      scopes TEXT[] NOT NULL,
      servers TEXT[] DEFAULT '{}',
      iat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      exp TIMESTAMP,
      revoked_at TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_sessions_run ON mcp_sessions(run_id);
  `);
}

export async function persistSession(
  sid: string,
  runId: string,
  scopes: string[],
  servers?: string[],
  exp?: number,
) {
  const pool: Pool = getPostgresPool();
  await ensureSessionsTable();
  await pool.query(
    `INSERT INTO mcp_sessions (sid, run_id, scopes, servers, exp)
     VALUES ($1, $2, $3, $4, to_timestamp($5))
     ON CONFLICT (sid) DO NOTHING`,
    [sid, runId, scopes, servers || [], exp || null],
  );
}

export async function revokeSessionPersist(sid: string) {
  const pool: Pool = getPostgresPool();
  await ensureSessionsTable();
  await pool.query(
    `UPDATE mcp_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE sid = $1`,
    [sid],
  );
}
