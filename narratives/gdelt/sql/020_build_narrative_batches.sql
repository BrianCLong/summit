DECLARE v_window_start TIMESTAMP DEFAULT TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 MINUTE);
DECLARE v_window_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP();
DECLARE v_slice_id STRING DEFAULT 'cyber-finance-en-60m';

INSERT INTO `summit.narrative_batches` (
  batch_id,
  slice_id,
  window_start,
  window_end,
  doc_ids,
  theme_terms,
  person_terms,
  org_terms,
  location_terms,
  emotion_aggregate,
  batch_manifest_sha256
)
WITH scoped AS (
  SELECT *
  FROM `summit.gkg_slices_raw`
  WHERE slice_id = v_slice_id
    AND window_start = v_window_start
    AND window_end = v_window_end
),
flat AS (
  SELECT
    document_identifier,
    SPLIT(IFNULL(v2themes, ''), ';') AS themes,
    SPLIT(IFNULL(v2persons, ''), ';') AS persons,
    SPLIT(IFNULL(v2organizations, ''), ';') AS orgs,
    SPLIT(IFNULL(v2locations, ''), ';') AS locations,
    SAFE_CAST(SPLIT(IFNULL(v2tone, '0'), ',')[OFFSET(0)] AS FLOAT64) AS tone
  FROM scoped
)
SELECT
  GENERATE_UUID() AS batch_id,
  v_slice_id AS slice_id,
  v_window_start AS window_start,
  v_window_end AS window_end,
  ARRAY(
    SELECT DISTINCT document_identifier
    FROM flat
    WHERE document_identifier IS NOT NULL
    LIMIT 50
  ) AS doc_ids,
  ARRAY(
    SELECT theme
    FROM (
      SELECT theme, COUNT(*) c
      FROM flat, UNNEST(themes) theme
      WHERE theme IS NOT NULL AND theme != ''
      GROUP BY theme
      ORDER BY c DESC, theme ASC
      LIMIT 20
    )
  ) AS theme_terms,
  ARRAY(
    SELECT person
    FROM (
      SELECT person, COUNT(*) c
      FROM flat, UNNEST(persons) person
      WHERE person IS NOT NULL AND person != ''
      GROUP BY person
      ORDER BY c DESC, person ASC
      LIMIT 20
    )
  ) AS person_terms,
  ARRAY(
    SELECT org
    FROM (
      SELECT org, COUNT(*) c
      FROM flat, UNNEST(orgs) org
      WHERE org IS NOT NULL AND org != ''
      GROUP BY org
      ORDER BY c DESC, org ASC
      LIMIT 20
    )
  ) AS org_terms,
  ARRAY(
    SELECT location
    FROM (
      SELECT location, COUNT(*) c
      FROM flat, UNNEST(locations) location
      WHERE location IS NOT NULL AND location != ''
      GROUP BY location
      ORDER BY c DESC, location ASC
      LIMIT 20
    )
  ) AS location_terms,
  TO_JSON(
    STRUCT(
      AVG(tone) AS tone_avg,
      STDDEV_POP(tone) AS tone_stddev
    )
  ) AS emotion_aggregate,
  TO_HEX(SHA256(CONCAT(v_slice_id, CAST(v_window_start AS STRING), CAST(v_window_end AS STRING)))) AS batch_manifest_sha256
FROM flat;
