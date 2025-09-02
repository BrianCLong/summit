-- Example retention policy: purge audit_logs older than 180 days
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '180 days';
-- Purge user_sessions older than 90 days and revoked
DELETE FROM user_sessions WHERE expires_at < NOW() - INTERVAL '30 days';
-- Optional: purge mcp_sessions expired and revoked > 30 days
DELETE FROM mcp_sessions WHERE (exp IS NOT NULL AND exp < NOW()) AND (revoked_at IS NOT NULL) AND revoked_at < NOW() - INTERVAL '30 days';
