CREATE OR REPLACE VIEW metrics.gmr_baseline AS
WITH recent AS (
  SELECT
    ts_window_start,
    ts_window_end,
    tenant_id,
    source,
    gmr
  FROM metrics.gmr_rollup
  WHERE gmr IS NOT NULL
    AND ts_window_start >= now() - interval '30 days'
),
median_cte AS (
  SELECT
    tenant_id,
    source,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY gmr) AS median_30d,
    count(*) AS sample_count
  FROM recent
  GROUP BY tenant_id, source
),
mad_cte AS (
  SELECT
    recent.tenant_id,
    recent.source,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY abs(recent.gmr - median_cte.median_30d)) AS mad_30d
  FROM recent
  JOIN median_cte
    ON recent.tenant_id = median_cte.tenant_id
    AND recent.source = median_cte.source
  GROUP BY recent.tenant_id, recent.source, median_cte.median_30d
)
SELECT
  median_cte.tenant_id,
  median_cte.source,
  median_cte.median_30d,
  mad_cte.mad_30d,
  median_cte.sample_count
FROM median_cte
JOIN mad_cte
  ON median_cte.tenant_id = mad_cte.tenant_id
  AND median_cte.source = mad_cte.source;
