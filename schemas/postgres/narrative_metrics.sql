CREATE TABLE IF NOT EXISTS narrative_run (
  run_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pipeline_version TEXT NOT NULL,
  model_versions JSONB NOT NULL,
  input_window_start TIMESTAMPTZ,
  input_window_end TIMESTAMPTZ,
  stamp_ref TEXT
);

CREATE TABLE IF NOT EXISTS narrative_metric (
  run_id TEXT NOT NULL REFERENCES narrative_run(run_id),
  narrative_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  metric_dim JSONB,
  PRIMARY KEY (run_id, narrative_id, metric_name)
);

CREATE TABLE IF NOT EXISTS narrative_transition (
  run_id TEXT NOT NULL REFERENCES narrative_run(run_id),
  narrative_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  rationale JSONB,
  PRIMARY KEY (run_id, narrative_id, from_state, to_state)
);

CREATE TABLE IF NOT EXISTS narrative_handoff (
  run_id TEXT NOT NULL REFERENCES narrative_run(run_id),
  narrative_id TEXT NOT NULL,
  from_tier TEXT,
  to_tier TEXT,
  handoff_score DOUBLE PRECISION NOT NULL,
  community_id TEXT,
  provenance_id TEXT NOT NULL,
  PRIMARY KEY (run_id, narrative_id, provenance_id)
);
