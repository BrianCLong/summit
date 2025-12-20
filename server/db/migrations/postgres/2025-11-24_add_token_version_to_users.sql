-- Add token_version to users table for token revocation
ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
