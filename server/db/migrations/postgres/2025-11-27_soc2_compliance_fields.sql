-- Migration to add fields required for SOC2 compliance evidence generation

-- Add MFA, status, and deactivation tracking to the users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Create a table to track periodic access reviews, a key SOC2 control
CREATE TABLE IF NOT EXISTS access_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  review_period_start TIMESTAMPTZ NOT NULL,
  review_period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS access_reviews_reviewer_idx ON access_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS access_reviews_period_idx ON access_reviews(review_period_start, review_period_end);

-- Add a column to user_roles to track review status
ALTER TABLE user_roles
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_review_id UUID REFERENCES access_reviews(id);

COMMENT ON COLUMN users.mfa_enabled IS 'Evidence for SOC2 CC6.1 - MFA status';
COMMENT ON COLUMN users.deactivated_at IS 'Evidence for SOC2 CC6.2 - Deprovisioning timeliness';
COMMENT ON TABLE access_reviews IS 'Evidence for SOC2 CC6.1 - Regular access reviews';
