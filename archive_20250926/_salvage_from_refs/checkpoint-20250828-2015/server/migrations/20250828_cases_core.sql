-- Cases core tables
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, CLOSED
  priority TEXT,
  summary TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_created ON cases(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS case_members (
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'VIEWER', -- OWNER, EDITOR, VIEWER
  PRIMARY KEY (case_id, user_id)
);

CREATE TABLE IF NOT EXISTS case_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- OSINT_DOC, ENTITY, ALERT, NOTE
  ref_id TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  added_by TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_case_items_case_added ON case_items(case_id, added_at DESC);

CREATE TABLE IF NOT EXISTS case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  author_id TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_case_timeline_case_at ON case_timeline(case_id, at DESC);

