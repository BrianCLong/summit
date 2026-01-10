-- Observability run spans, aggregates, and tree storage
CREATE TABLE IF NOT EXISTS obs_raw_spans (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  tenant_id TEXT,
  span_id TEXT NOT NULL,
  parent_span_id TEXT,
  stage TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('queue', 'exec', 'io', 'compute', 'external')),
  status TEXT NOT NULL CHECK (status IN ('ok', 'error')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}',
  resources JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obs_raw_spans_run_id ON obs_raw_spans (run_id);
CREATE INDEX IF NOT EXISTS idx_obs_raw_spans_trace_id ON obs_raw_spans (trace_id);
CREATE INDEX IF NOT EXISTS idx_obs_raw_spans_tenant ON obs_raw_spans (tenant_id);
CREATE INDEX IF NOT EXISTS idx_obs_raw_spans_start_time ON obs_raw_spans (start_time);

CREATE TABLE IF NOT EXISTS obs_run_aggregates (
  run_id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  tenant_id TEXT,
  total_duration_ms BIGINT NOT NULL,
  queue_wait_ms BIGINT NOT NULL,
  exec_ms BIGINT NOT NULL,
  best_case_duration_ms BIGINT NOT NULL,
  wasted_queue_ms BIGINT NOT NULL,
  critical_path_stages TEXT[] NOT NULL DEFAULT '{}',
  error_count INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obs_run_aggregates_finished_at ON obs_run_aggregates (finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_obs_run_aggregates_status ON obs_run_aggregates (status);
CREATE INDEX IF NOT EXISTS idx_obs_run_aggregates_wasted ON obs_run_aggregates (wasted_queue_ms DESC);
CREATE INDEX IF NOT EXISTS idx_obs_run_aggregates_tenant ON obs_run_aggregates (tenant_id);

CREATE TABLE IF NOT EXISTS obs_run_tree (
  run_id TEXT PRIMARY KEY,
  tenant_id TEXT,
  tree JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
