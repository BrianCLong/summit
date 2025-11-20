-- Golden Dataset for E2E Tests - PostgreSQL
-- Deterministic test data for smoke tests

-- Create schema
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'medium',
  created_by UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  type VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert golden test data
INSERT INTO organizations (id, name, tier) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test Organization', 'enterprise'),
  ('00000000-0000-0000-0000-000000000002', 'Demo Org', 'professional');

INSERT INTO users (id, email, name, role) VALUES
  ('10000000-0000-0000-0000-000000000001', 'admin@test.com', 'Admin User', 'admin'),
  ('10000000-0000-0000-0000-000000000002', 'analyst@test.com', 'Test Analyst', 'user'),
  ('10000000-0000-0000-0000-000000000003', 'readonly@test.com', 'Read Only User', 'read');

INSERT INTO cases (id, title, status, priority, created_by, organization_id) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Golden Test Case Alpha', 'open', 'high', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Golden Test Case Beta', 'closed', 'medium', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'Golden Test Case Gamma', 'open', 'low', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');

INSERT INTO evidence (id, case_id, type, description, metadata) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'document', 'Test Evidence Document', '{"source": "upload", "verified": true}'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'image', 'Test Evidence Image', '{"format": "png", "size": 1024}'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'video', 'Test Evidence Video', '{"duration": 120, "format": "mp4"}');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_organization ON cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(type);
