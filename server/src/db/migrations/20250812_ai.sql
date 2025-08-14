CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT,
  meta JSONB
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES ai_jobs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  created_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  applied_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  actor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  meta JSONB
);

CREATE TABLE IF NOT EXISTS ml_feedback (
  id UUID PRIMARY KEY,
  insight_id UUID REFERENCES ai_insights(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);