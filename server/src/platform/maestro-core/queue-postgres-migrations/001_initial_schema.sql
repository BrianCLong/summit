CREATE TABLE IF NOT EXISTS maestro_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  sla_seconds INTEGER,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  next_run_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maestro_tasks_status_priority ON maestro_tasks (status, priority);
CREATE INDEX idx_maestro_tasks_next_run ON maestro_tasks (next_run_at) WHERE status = 'PENDING';
