-- Reporting materialized views to keep analytic queries off OLTP tables
-- Views focus on fast case/entity rollups with lock-safe refresh tooling.

CREATE SCHEMA IF NOT EXISTS maestro;
SET search_path TO maestro, public;

CREATE TABLE IF NOT EXISTS maestro.mv_refresh_status (
  view_name TEXT PRIMARY KEY,
  last_started_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_duration_ms INTEGER,
  rows_last_refreshed BIGINT DEFAULT 0,
  last_status TEXT DEFAULT 'pending',
  last_error TEXT,
  staleness_budget_seconds INTEGER DEFAULT 900,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE maestro.mv_refresh_status IS 'Operational metadata for reporting materialized view refreshes';

-- Entity activity by type/day to power growth + distribution charts
CREATE MATERIALIZED VIEW IF NOT EXISTS maestro.mv_reporting_entity_activity AS
SELECT
  DATE_TRUNC('day', created_at) AS bucket_day,
  type,
  COUNT(*) AS entity_count,
  MIN(created_at) AS first_seen_at,
  MAX(created_at) AS last_seen_at
FROM entities
GROUP BY bucket_day, type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_reporting_entity_activity_bucket_type
  ON maestro.mv_reporting_entity_activity(bucket_day, type);

-- Case snapshot rollup (entity links + evidence) keyed by case
CREATE MATERIALIZED VIEW IF NOT EXISTS maestro.mv_reporting_case_snapshot AS
WITH evidence AS (
  SELECT
    CASE
      WHEN sm.case_id ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
        THEN sm.case_id::uuid
      ELSE NULL
    END AS case_id,
    sm.manifest_type,
    COALESCE(array_length(sm.evidence_ids, 1), 0) AS evidence_count
  FROM signed_manifests sm
  WHERE sm.case_id IS NOT NULL
),
evidence_agg AS (
  SELECT
    case_id,
    jsonb_object_agg(manifest_type, evidence_sum) AS evidence_counts
  FROM (
    SELECT case_id, manifest_type, SUM(evidence_count) AS evidence_sum
    FROM evidence
    WHERE case_id IS NOT NULL
    GROUP BY case_id, manifest_type
  ) e
  GROUP BY case_id
),
entity_refs AS (
  SELECT
    case_id,
    COUNT(*) FILTER (WHERE is_active) AS active_entities,
    MAX(added_at) AS last_linked_at
  FROM maestro.case_graph_references
  GROUP BY case_id
),
transitions AS (
  SELECT
    case_id,
    COUNT(*) AS transition_count,
    MAX(transitioned_at) AS last_transition_at
  FROM maestro.case_state_history
  GROUP BY case_id
)
SELECT
  c.id AS case_id,
  c.tenant_id,
  c.status,
  c.priority,
  DATE_TRUNC('day', c.created_at) AS created_day,
  COALESCE(tr.transition_count, 0) AS transition_count,
  COALESCE(tr.last_transition_at, c.updated_at, c.created_at) AS last_transition_at,
  COALESCE(er.active_entities, 0) AS linked_entity_count,
  er.last_linked_at,
  COALESCE(ea.evidence_counts, '{}'::jsonb) AS evidence_counts,
  c.updated_at AS last_case_update
FROM maestro.cases c
LEFT JOIN transitions tr ON tr.case_id = c.id
LEFT JOIN entity_refs er ON er.case_id = c.id
LEFT JOIN evidence_agg ea ON ea.case_id = c.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_reporting_case_snapshot_case
  ON maestro.mv_reporting_case_snapshot(case_id);

-- Case timeline rollups (status transitions per day)
CREATE MATERIALIZED VIEW IF NOT EXISTS maestro.mv_reporting_case_timeline AS
SELECT
  h.case_id,
  c.tenant_id,
  DATE_TRUNC('day', h.transitioned_at) AS event_day,
  COUNT(*) AS transition_count,
  COUNT(*) FILTER (WHERE h.to_status IS NOT NULL) AS status_change_count,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT h.to_status), NULL) AS statuses_seen,
  MIN(h.transitioned_at) AS first_transition_at,
  MAX(h.transitioned_at) AS last_transition_at
FROM maestro.case_state_history h
JOIN maestro.cases c ON c.id = h.case_id
GROUP BY h.case_id, c.tenant_id, event_day;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_reporting_case_timeline_day
  ON maestro.mv_reporting_case_timeline(case_id, event_day);

-- Populate views once post-create (non-concurrent ok at creation time)
REFRESH MATERIALIZED VIEW maestro.mv_reporting_entity_activity;
REFRESH MATERIALIZED VIEW maestro.mv_reporting_case_snapshot;
REFRESH MATERIALIZED VIEW maestro.mv_reporting_case_timeline;

-- Lock-safe refresh function with basic observability
CREATE OR REPLACE FUNCTION maestro.refresh_reporting_materialized_views()
RETURNS TABLE (
  view_name TEXT,
  refreshed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  row_count BIGINT,
  status TEXT,
  error TEXT
) AS $$
DECLARE
  view_list CONSTANT TEXT[] := ARRAY[
    'maestro.mv_reporting_entity_activity',
    'maestro.mv_reporting_case_snapshot',
    'maestro.mv_reporting_case_timeline'
  ];
  v TEXT;
  start_ts TIMESTAMPTZ;
  use_concurrent BOOLEAN;
BEGIN
  -- Honor override to disable  in lower-fidelity environments (e.g., pg-mem)
  use_concurrent :=
    COALESCE(NULLIF(current_setting('maestro.reporting_refresh_concurrent', TRUE), ''), 'on') <> 'off';

  FOREACH v IN ARRAY view_list LOOP
    start_ts := clock_timestamp();
    refreshed_at := NULL;
    duration_ms := NULL;
    row_count := NULL;
    status := 'ok';
    error := NULL;

    BEGIN
      IF use_concurrent THEN
        EXECUTE format('REFRESH MATERIALIZED VIEW  %s', v);
      ELSE
        EXECUTE format('REFRESH MATERIALIZED VIEW %s', v);
      END IF;

      EXECUTE format('SELECT COUNT(*) FROM %s', v) INTO row_count;
      refreshed_at := clock_timestamp();
      duration_ms := CEIL(EXTRACT(EPOCH FROM refreshed_at - start_ts) * 1000)::INTEGER;

      INSERT INTO maestro.mv_refresh_status AS s (
        view_name, last_started_at, last_refreshed_at, last_success_at,
        last_duration_ms, rows_last_refreshed, last_status, last_error, updated_at
      )
      VALUES (v, start_ts, refreshed_at, refreshed_at, duration_ms, row_count, 'ok', NULL, clock_timestamp())
      ON CONFLICT (view_name) DO UPDATE SET
        last_started_at = EXCLUDED.last_started_at,
        last_refreshed_at = EXCLUDED.last_refreshed_at,
        last_success_at = EXCLUDED.last_success_at,
        last_duration_ms = EXCLUDED.last_duration_ms,
        rows_last_refreshed = EXCLUDED.rows_last_refreshed,
        last_status = EXCLUDED.last_status,
        last_error = EXCLUDED.last_error,
        updated_at = EXCLUDED.updated_at;
    EXCEPTION WHEN OTHERS THEN
      refreshed_at := clock_timestamp();
      duration_ms := CEIL(EXTRACT(EPOCH FROM refreshed_at - start_ts) * 1000)::INTEGER;
      status := 'error';
      error := SQLERRM;

      INSERT INTO maestro.mv_refresh_status AS s (
        view_name, last_started_at, last_refreshed_at, last_duration_ms,
        rows_last_refreshed, last_status, last_error, updated_at
      )
      VALUES (v, start_ts, refreshed_at, duration_ms, row_count, status, error, clock_timestamp())
      ON CONFLICT (view_name) DO UPDATE SET
        last_started_at = EXCLUDED.last_started_at,
        last_refreshed_at = EXCLUDED.last_refreshed_at,
        last_duration_ms = EXCLUDED.last_duration_ms,
        rows_last_refreshed = EXCLUDED.rows_last_refreshed,
        last_status = EXCLUDED.last_status,
        last_error = EXCLUDED.last_error,
        updated_at = EXCLUDED.updated_at;
    END;

    view_name := v;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION maestro.refresh_reporting_materialized_views IS
  'Refreshes reporting MVs with  when available and records rows/duration/status.';
