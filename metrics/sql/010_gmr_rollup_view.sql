CREATE OR REPLACE VIEW metrics.gmr_rollup AS
SELECT
  COALESCE(cdc.ts_window_start, graph.ts_window_start) AS ts_window_start,
  COALESCE(cdc.ts_window_end, graph.ts_window_end) AS ts_window_end,
  COALESCE(cdc.tenant_id, graph.tenant_id) AS tenant_id,
  COALESCE(cdc.source, graph.source) AS source,
  cdc.cdc_rows_total,
  graph.graph_nodes_created,
  graph.graph_edges_created,
  graph.deduped_nodes,
  graph.rejected_edges,
  graph.rejection_reasons,
  cdc.pipeline_hash AS cdc_pipeline_hash,
  graph.pipeline_hash AS graph_pipeline_hash,
  CASE
    WHEN cdc.cdc_rows_total IS NULL THEN NULL
    WHEN cdc.cdc_rows_total = 0 THEN 0
    ELSE (COALESCE(graph.graph_nodes_created, 0) + COALESCE(graph.graph_edges_created, 0))::NUMERIC
      / NULLIF(cdc.cdc_rows_total, 0)
  END AS gmr,
  cdc.cdc_rows_total IS NULL AS missing_cdc,
  graph.graph_nodes_created IS NULL AND graph.graph_edges_created IS NULL AS missing_graph
FROM metrics.facts_cdc AS cdc
FULL OUTER JOIN metrics.facts_graph AS graph
  ON cdc.ts_window_start = graph.ts_window_start
  AND cdc.ts_window_end = graph.ts_window_end
  AND cdc.tenant_id = graph.tenant_id
  AND cdc.source = graph.source;
