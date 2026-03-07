CREATE SCHEMA IF NOT EXISTS `summit`;

CREATE TABLE IF NOT EXISTS `summit.gkg_slices_raw` (
  slice_id STRING NOT NULL,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  date_key STRING NOT NULL,
  document_identifier STRING NOT NULL,
  source_common_name STRING,
  v2themes STRING,
  v2persons STRING,
  v2organizations STRING,
  v2locations STRING,
  v2tone STRING,
  v2gcam STRING,
  inserted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(window_start)
CLUSTER BY slice_id, source_common_name;

CREATE TABLE IF NOT EXISTS `summit.narrative_batches` (
  batch_id STRING NOT NULL,
  slice_id STRING NOT NULL,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  doc_ids ARRAY<STRING> NOT NULL,
  theme_terms ARRAY<STRING>,
  person_terms ARRAY<STRING>,
  org_terms ARRAY<STRING>,
  location_terms ARRAY<STRING>,
  emotion_aggregate JSON,
  batch_manifest_sha256 STRING,
  inserted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(window_start)
CLUSTER BY slice_id;

CREATE TABLE IF NOT EXISTS `summit.narrative_alerts` (
  alert_id STRING NOT NULL,
  batch_id STRING NOT NULL,
  slice_id STRING NOT NULL,
  alert_type STRING NOT NULL,
  magnitude FLOAT64 NOT NULL,
  baseline_window STRING NOT NULL,
  supporting_doc_ids ARRAY<STRING>,
  graph_snapshot_ref STRING,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY slice_id, alert_type;
