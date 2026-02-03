CREATE SCHEMA IF NOT EXISTS metrics;

CREATE TABLE IF NOT EXISTS metrics.facts_cdc (
  ts_window_start TIMESTAMPTZ NOT NULL,
  ts_window_end TIMESTAMPTZ NOT NULL,
  tenant_id TEXT NOT NULL,
  source TEXT NOT NULL,
  cdc_rows_total BIGINT NOT NULL CHECK (cdc_rows_total >= 0),
  pipeline_hash TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, source, ts_window_start, ts_window_end)
);

CREATE TABLE IF NOT EXISTS metrics.facts_graph (
  ts_window_start TIMESTAMPTZ NOT NULL,
  ts_window_end TIMESTAMPTZ NOT NULL,
  tenant_id TEXT NOT NULL,
  source TEXT NOT NULL,
  graph_nodes_created BIGINT NOT NULL CHECK (graph_nodes_created >= 0),
  graph_edges_created BIGINT NOT NULL CHECK (graph_edges_created >= 0),
  deduped_nodes BIGINT NOT NULL DEFAULT 0 CHECK (deduped_nodes >= 0),
  rejected_edges BIGINT NOT NULL DEFAULT 0 CHECK (rejected_edges >= 0),
  rejection_reasons JSONB NOT NULL DEFAULT '{}'::jsonb,
  pipeline_hash TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, source, ts_window_start, ts_window_end)
);

CREATE INDEX IF NOT EXISTS idx_facts_cdc_window
  ON metrics.facts_cdc (ts_window_start, ts_window_end);

CREATE INDEX IF NOT EXISTS idx_facts_graph_window
  ON metrics.facts_graph (ts_window_start, ts_window_end);

CREATE INDEX IF NOT EXISTS idx_facts_cdc_pipeline_hash
  ON metrics.facts_cdc (pipeline_hash);

CREATE INDEX IF NOT EXISTS idx_facts_graph_pipeline_hash
  ON metrics.facts_graph (pipeline_hash);
