-- Switchboard governance graph schema
-- Captures people, roles, systems, approvals, changes, incidents, and receipts

CREATE TABLE IF NOT EXISTS switchboard_people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  handle TEXT NOT NULL,
  email TEXT,
  title TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, handle)
);

CREATE TABLE IF NOT EXISTS switchboard_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  policy_guard TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS switchboard_role_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES switchboard_roles(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES switchboard_people(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by TEXT,
  UNIQUE (role_id, person_id)
);

CREATE TABLE IF NOT EXISTS switchboard_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  surface TEXT,
  criticality TEXT DEFAULT 'standard' CHECK (criticality IN ('standard','high','mission-critical')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS switchboard_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  system_id UUID REFERENCES switchboard_systems(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  change_type TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'standard' CHECK (risk_level IN ('standard','high','critical')),
  requested_by UUID REFERENCES switchboard_people(id) ON DELETE SET NULL,
  context JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','executing','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_switchboard_changes_tenant_status ON switchboard_changes (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_switchboard_changes_system ON switchboard_changes (system_id);

CREATE TABLE IF NOT EXISTS switchboard_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  change_id UUID NOT NULL REFERENCES switchboard_changes(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES switchboard_people(id) ON DELETE SET NULL,
  approver_role_id UUID REFERENCES switchboard_roles(id) ON DELETE SET NULL,
  policy_rule TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','escalated')),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_switchboard_approvals_change ON switchboard_approvals (change_id, status);

CREATE TABLE IF NOT EXISTS switchboard_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  approval_id UUID REFERENCES switchboard_approvals(id) ON DELETE CASCADE,
  change_id UUID REFERENCES switchboard_changes(id) ON DELETE CASCADE,
  receipt_type TEXT NOT NULL DEFAULT 'approval',
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  issued_by TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS switchboard_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  system_id UUID REFERENCES switchboard_systems(id) ON DELETE SET NULL,
  change_id UUID REFERENCES switchboard_changes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','mitigated','resolved','closed')),
  summary TEXT,
  timeline JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_switchboard_incidents_status ON switchboard_incidents (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_switchboard_incidents_change ON switchboard_incidents (change_id);

-- Event hooks for outbox/event-bus publishing
CREATE TABLE IF NOT EXISTS switchboard_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  retries INT NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_switchboard_events_topic ON switchboard_events (topic) WHERE processed_at IS NULL;
