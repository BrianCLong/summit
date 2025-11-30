CREATE TABLE IF NOT EXISTS maestro_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  task_id UUID,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maestro_events_tenant ON maestro_events (tenant_id, timestamp DESC);
CREATE INDEX idx_maestro_events_task ON maestro_events (task_id);
