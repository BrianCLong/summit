-- AI Jobs and Insights Tables
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

-- Indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_jobs_kind ON ai_jobs(kind);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_jobs_created_at ON ai_jobs(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_status ON ai_insights(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_kind ON ai_insights(kind);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_job_id ON ai_insights(job_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_type ON audit_events(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_actor_id ON audit_events(actor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_feedback_insight_id ON ml_feedback(insight_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_feedback_decision ON ml_feedback(decision);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_feedback_created_at ON ml_feedback(created_at);