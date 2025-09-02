-- Add fingerprint to mcp_servers
ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS fingerprint_sha256 TEXT;

