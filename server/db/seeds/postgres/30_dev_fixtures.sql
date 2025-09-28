CREATE SCHEMA IF NOT EXISTS devkit;

CREATE TABLE IF NOT EXISTS devkit.cases (
  case_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  owner TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devkit.entities (
  entity_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  risk_score NUMERIC(4,2) NOT NULL DEFAULT 0
);

TRUNCATE TABLE devkit.cases;
TRUNCATE TABLE devkit.entities;

INSERT INTO devkit.cases (case_id, title, status, priority, owner, created_at) VALUES
  ('CASE-001', 'Supply chain anomaly triage', 'open', 'high', 'analyst.alex', '2025-02-24T15:00:00Z'),
  ('CASE-002', 'Insider risk follow-up', 'in_review', 'medium', 'analyst.bianca', '2025-02-24T16:45:00Z'),
  ('CASE-003', 'Financial exposure sweep', 'open', 'low', 'analyst.cameron', '2025-02-25T08:10:00Z')
ON CONFLICT (case_id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  owner = EXCLUDED.owner,
  created_at = EXCLUDED.created_at;

INSERT INTO devkit.entities (entity_id, entity_type, display_name, risk_score) VALUES
  ('org-aurora', 'organization', 'Aurora Dynamics', 0.71),
  ('vendor-magnus', 'vendor', 'Magnus Materials', 0.63),
  ('analyst.alex', 'user', 'Alex Rivera', 0.12)
ON CONFLICT (entity_id) DO UPDATE SET
  entity_type = EXCLUDED.entity_type,
  display_name = EXCLUDED.display_name,
  risk_score = EXCLUDED.risk_score;
