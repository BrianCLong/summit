"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSessionsTable = ensureSessionsTable;
exports.persistSession = persistSession;
exports.revokeSessionPersist = revokeSessionPersist;
const database_js_1 = require("../../config/database.js");
async function ensureSessionsTable() {
    const pool = (0, database_js_1.getPostgresPool)();
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
async function persistSession(sid, runId, scopes, servers, exp) {
    const pool = (0, database_js_1.getPostgresPool)();
    await ensureSessionsTable();
    await pool.query(`INSERT INTO mcp_sessions (sid, run_id, scopes, servers, exp)
     VALUES ($1, $2, $3, $4, to_timestamp($5))
     ON CONFLICT (sid) DO NOTHING`, [sid, runId, scopes, servers || [], exp || null]);
}
async function revokeSessionPersist(sid) {
    const pool = (0, database_js_1.getPostgresPool)();
    await ensureSessionsTable();
    await pool.query(`UPDATE mcp_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE sid = $1`, [sid]);
}
