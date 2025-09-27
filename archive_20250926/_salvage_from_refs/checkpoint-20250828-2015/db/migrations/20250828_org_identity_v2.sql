-- SCIM bearer token & seat caps
ALTER TABLE org
  ADD COLUMN IF NOT EXISTS scim_token TEXT,
  ADD COLUMN IF NOT EXISTS seat_cap_total INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS seat_cap_privileged INT DEFAULT 25;

-- Approval SLA helper
CREATE INDEX IF NOT EXISTS idx_access_request_status ON access_request(status);
