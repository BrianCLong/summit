-- Migration: Add token blacklist and session revocation support
-- Purpose: Implement JWT token rotation and blacklist for OWASP compliance
-- Date: 2025-11-20

-- Add is_revoked column to user_sessions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_sessions'
    AND column_name = 'is_revoked'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN is_revoked BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create index on is_revoked for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked
  ON user_sessions(is_revoked) WHERE is_revoked = FALSE;

-- Create index on user_id and is_revoked for user session queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_revoked
  ON user_sessions(user_id, is_revoked);

-- Create token_blacklist table for revoking access tokens
CREATE TABLE IF NOT EXISTS token_blacklist (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(64) UNIQUE NOT NULL,  -- SHA-256 hash of the token
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,  -- When the original token would have expired
  reason VARCHAR(255),  -- Optional: reason for revocation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on token_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash
  ON token_blacklist(token_hash);

-- Create index on expires_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires
  ON token_blacklist(expires_at);

-- Add comments for documentation
COMMENT ON TABLE token_blacklist IS 'Stores blacklisted JWT access tokens (hashed) for security';
COMMENT ON COLUMN token_blacklist.token_hash IS 'SHA-256 hash of the revoked JWT token';
COMMENT ON COLUMN token_blacklist.expires_at IS 'When the token would naturally expire (for cleanup)';

COMMENT ON COLUMN user_sessions.is_revoked IS 'Whether this refresh token has been revoked (for token rotation)';

-- Create function to clean up expired blacklisted tokens (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_blacklist()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM token_blacklist
  WHERE expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_blacklist() IS 'Removes expired tokens from blacklist. Run daily via cron.';

-- Create function to clean up old revoked sessions (run weekly via cron)
CREATE OR REPLACE FUNCTION cleanup_revoked_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE is_revoked = TRUE
  AND expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_revoked_sessions() IS 'Removes old revoked sessions. Run weekly via cron.';
