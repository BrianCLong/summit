CREATE SCHEMA IF NOT EXISTS chm;

CREATE TABLE IF NOT EXISTS chm.taxonomy (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  level TEXT NOT NULL,
  downgrade_to TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS chm.rules (
  id SERIAL PRIMARY KEY,
  tag TEXT NOT NULL REFERENCES chm.taxonomy (code),
  residency TEXT NOT NULL,
  license TEXT NOT NULL,
  exportable BOOLEAN NOT NULL,
  rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chm.tags (
  id UUID PRIMARY KEY,
  document_id TEXT NOT NULL,
  tag_code TEXT NOT NULL REFERENCES chm.taxonomy (code),
  classification TEXT NOT NULL,
  derived_from TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chm.downgrade_requests (
  id UUID PRIMARY KEY,
  document_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  target_level TEXT NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chm.downgrade_approvals (
  request_id UUID REFERENCES chm.downgrade_requests (id),
  approver TEXT NOT NULL,
  approved_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (request_id, approver)
);

CREATE TABLE IF NOT EXISTS chm.export_requests (
  id UUID PRIMARY KEY,
  document_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  residency TEXT NOT NULL,
  license TEXT NOT NULL,
  destination TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chm.audit_receipts (
  id UUID PRIMARY KEY,
  document_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
