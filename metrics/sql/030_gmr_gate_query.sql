WITH latest_window AS (
  SELECT max(ts_window_end) AS ts_window_end
  FROM metrics.gmr_rollup
  WHERE ts_window_end <= date_trunc('hour', now())
),
windowed AS (
  SELECT
    rollup.*,
    lag(COALESCE(rollup.graph_pipeline_hash, rollup.cdc_pipeline_hash)) OVER (
      PARTITION BY rollup.tenant_id, rollup.source
      ORDER BY rollup.ts_window_start
    ) AS previous_pipeline_hash
  FROM metrics.gmr_rollup AS rollup
  WHERE rollup.ts_window_end = (SELECT ts_window_end FROM latest_window)
),
scored AS (
  SELECT
    windowed.ts_window_start,
    windowed.ts_window_end,
    windowed.tenant_id,
    windowed.source,
    windowed.cdc_rows_total,
    windowed.graph_nodes_created,
    windowed.graph_edges_created,
    windowed.deduped_nodes,
    windowed.rejected_edges,
    windowed.rejection_reasons,
    windowed.gmr,
    windowed.missing_cdc,
    windowed.missing_graph,
    COALESCE(windowed.graph_pipeline_hash, windowed.cdc_pipeline_hash) AS pipeline_hash,
    windowed.previous_pipeline_hash,
    windowed.previous_pipeline_hash IS NOT NULL
      AND windowed.previous_pipeline_hash = COALESCE(windowed.graph_pipeline_hash, windowed.cdc_pipeline_hash)
      AS pipeline_hash_unchanged,
    baseline.median_30d,
    baseline.mad_30d,
    baseline.sample_count
  FROM windowed
  LEFT JOIN metrics.gmr_baseline AS baseline
    ON windowed.tenant_id = baseline.tenant_id
    AND windowed.source = baseline.source
)
SELECT jsonb_build_object(
  'ts_window_start', to_char(ts_window_start AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'ts_window_end', to_char(ts_window_end AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'tenant_id', tenant_id,
  'source', source,
  'cdc_rows_total', cdc_rows_total,
  'graph_nodes_created', graph_nodes_created,
  'graph_edges_created', graph_edges_created,
  'deduped_nodes', deduped_nodes,
  'rejected_edges', rejected_edges,
  'rejection_reasons', rejection_reasons,
  'gmr', gmr,
  'missing_cdc', missing_cdc,
  'missing_graph', missing_graph,
  'pipeline_hash', pipeline_hash,
  'previous_pipeline_hash', previous_pipeline_hash,
  'pipeline_hash_unchanged', pipeline_hash_unchanged,
  'median_30d', median_30d,
  'mad_30d', mad_30d,
  'sample_count', sample_count
) AS gmr_gate
FROM scored
ORDER BY tenant_id, source;
