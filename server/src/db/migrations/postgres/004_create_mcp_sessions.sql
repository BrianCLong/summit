-- Create mcp_sessions table for persisted sessions
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

