DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 MINUTE);
DECLARE window_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP();
DECLARE slice_id STRING DEFAULT 'cyber-finance-en-60m';

INSERT INTO `summit.gkg_slices_raw` (
  slice_id,
  window_start,
  window_end,
  date_key,
  document_identifier,
  source_common_name,
  v2themes,
  v2persons,
  v2organizations,
  v2locations,
  v2tone,
  v2gcam
)
SELECT
  slice_id,
  window_start,
  window_end,
  CAST(DATE AS STRING) AS date_key,
  DocumentIdentifier,
  SourceCommonName,
  V2Themes,
  V2Persons,
  V2Organizations,
  V2Locations,
  V2Tone,
  V2GCAM
FROM `gdelt-bq.gdeltv2.gkg_partitioned`
WHERE DATE >= FORMAT_DATE('%Y%m%d', DATE(window_start))
  AND DATE <= FORMAT_DATE('%Y%m%d', DATE(window_end))
  AND SourceCommonName IS NOT NULL
  AND DocumentIdentifier IS NOT NULL
  AND V2Themes LIKE '%CYBER%'
  AND (V2Themes LIKE '%ECON_FINANCE%' OR V2Themes LIKE '%TAX%');
