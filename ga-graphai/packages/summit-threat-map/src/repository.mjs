export const insertThreatEventSql = `
INSERT INTO threat_event (
  source, source_event_id, observed_at, ip, asn, port, cve,
  exposure_state, compromise_state, severity, confidence,
  lat, lon, h3_index, evidence, raw_event
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,
  $8,$9,$10,$11,
  $12,$13,$14,$15::jsonb,$16::jsonb
)
ON CONFLICT (source, source_event_id) DO NOTHING;
`;

export function hexCellRiskSql(bucket = '1m') {
  const bucketCol = bucket === '5m' ? 'bucket_5m' : 'bucket_1m';
  return `
SELECT h3_index, event_count, exposed_count, compromised_count,
  (0.4 * exposed_count + 0.6 * compromised_count + 0.1 * max_severity) AS risk_score
FROM hex_cell_risk
WHERE ${bucketCol} BETWEEN $1 AND $2
`;
}

export const cellDrilldownSql = `
SELECT observed_at, source, ip, asn, port, cve, exposure_state, compromise_state, severity, confidence, evidence
FROM threat_event
WHERE h3_index = $1
  AND observed_at BETWEEN $2 AND $3
ORDER BY observed_at DESC
LIMIT $4;
`;
