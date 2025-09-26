-- MFA tables to support time-based one-time passwords
CREATE TABLE IF NOT EXISTS user_mfa_factors (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  enrolled_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_mfa_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('AUTH', 'SETUP')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_mfa_challenges_user_idx ON user_mfa_challenges(user_id);
CREATE INDEX IF NOT EXISTS user_mfa_challenges_expires_idx ON user_mfa_challenges(expires_at);

CREATE TABLE IF NOT EXISTS mfa_role_policies (
  role TEXT PRIMARY KEY,
  require_mfa BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
