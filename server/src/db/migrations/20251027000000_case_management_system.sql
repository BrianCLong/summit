CREATE SCHEMA IF NOT EXISTS maestro;

CREATE TABLE IF NOT EXISTS maestro.cases (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS maestro.case_tasks (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'standard',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to TEXT,
  assigned_by TEXT,
  due_date TIMESTAMPTZ,
  required_role_id TEXT,
  depends_on_task_ids TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  result_data JSONB DEFAULT '{}'::jsonb,
  assigned_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS maestro.case_participants (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(case_id, user_id, role_id)
);

CREATE TABLE IF NOT EXISTS maestro.case_approvals (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES maestro.case_tasks(id) ON DELETE SET NULL,
  approval_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  required_approvers INTEGER DEFAULT 1,
  required_role_id TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS maestro.case_approval_votes (
  id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL REFERENCES maestro.case_approvals(id) ON DELETE CASCADE,
  approver_user_id TEXT NOT NULL,
  decision TEXT NOT NULL, -- 'approved', 'rejected'
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  voted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maestro.case_slas (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
  sla_type TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  target_hours INTEGER NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  breached_at TIMESTAMPTZ,
  met_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS maestro.case_comments (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS maestro.chain_of_custody_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  location TEXT,
  notes TEXT,
  verification_hash TEXT
);
