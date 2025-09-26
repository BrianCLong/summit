# IO Resilience Deployment Kit — Seeds, Dashboards, Jira, Microsite

This kit packages the essentials required to operationalize the IO Resilience module immediately: seed data, analytics queries, Jira automation, and a public “Verify Us” experience.

---

## 1. Seed Data

Synthetic datasets help teams light up dashboards before live telemetry is connected.

| File | Rows | Purpose |
| --- | --- | --- |
| `server/db/seeds/postgres/2025-09-25_io_resilience.sql` | 15 records | Populate events, actions, media, forecasts, and provenance assertions with representative narratives. |
| `docs/io/story_ids.yaml` | 9 story IDs | Canonical vocabulary for cross-platform narrative tracking (elections, finance, critical infrastructure). |

### 1.1. Postgres Load Commands

```sql
\i server/db/migrations/postgres/2025-09-25_io_resilience.sql
\i server/db/migrations/postgres/2025-10-02_io_resilience_predictive.sql
\i server/db/seeds/postgres/2025-09-25_io_resilience.sql
```

### 1.2. BigQuery Dataset Skeleton

```sql
CREATE SCHEMA IF NOT EXISTS `io_resilience`;
CREATE TABLE IF NOT EXISTS `io_resilience.io_events` (
  id STRING,
  observed_at TIMESTAMP,
  platform STRING,
  locale STRING,
  topic STRING,
  story_id STRING,
  detector STRING,
  confidence FLOAT64,
  severity INT64,
  reach_estimate INT64,
  url STRING,
  account_handle STRING,
  cluster_id STRING,
  is_authority_impersonation BOOL,
  is_synthetic_media BOOL,
  jurisdiction STRING,
  raw_ref STRING,
  threat_vector STRING,
  risk_score FLOAT64,
  anomaly_score FLOAT64,
  forecast_horizon_minutes INT64,
  predicted_reach INT64,
  provenance_confidence FLOAT64
);

CREATE TABLE IF NOT EXISTS `io_resilience.io_actions` (
  id STRING,
  event_id STRING,
  action_type STRING,
  initiated_at TIMESTAMP,
  completed_at TIMESTAMP,
  status STRING,
  provider STRING,
  ticket_id STRING,
  outcome STRING
);

CREATE TABLE IF NOT EXISTS `io_resilience.io_media` (
  id STRING,
  event_id STRING,
  media_type STRING,
  sha256 STRING,
  c2pa_present BOOL,
  provenance_score FLOAT64
);

CREATE TABLE IF NOT EXISTS `io_resilience.io_forecasts` (
  id STRING,
  cluster_id STRING,
  story_id STRING,
  horizon_minutes INT64,
  predicted_risk FLOAT64,
  predicted_reach INT64,
  confidence_interval FLOAT64,
  model_version STRING,
  generated_at TIMESTAMP,
  valid_from TIMESTAMP,
  valid_to TIMESTAMP,
  rationale STRING
);

CREATE TABLE IF NOT EXISTS `io_resilience.io_provenance_assertions` (
  id STRING,
  event_id STRING,
  source STRING,
  assertion_type STRING,
  verified BOOL,
  verified_by STRING,
  verified_at TIMESTAMP,
  signature_hash STRING,
  c2pa_manifest_url STRING,
  score FLOAT64,
  notes STRING
);
```

---

## 2. Dashboards

### 2.1. TTD/TTM Overview (Postgres)

```sql
WITH times AS (
  SELECT e.id,
         MIN(e.observed_at) AS first_observed,
         MIN(a.initiated_at) FILTER (WHERE a.action_type IS NOT NULL) AS first_triage,
         MIN(a.completed_at) FILTER (WHERE a.status = 'complete') AS containment
  FROM io_events e
  LEFT JOIN io_actions a ON a.event_id = e.id
  WHERE e.observed_at >= NOW() - INTERVAL '72 hours'
  GROUP BY e.id
)
SELECT date_trunc('hour', first_observed) AS bucket,
       EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY (first_triage - first_observed))) / 60 AS median_ttd_minutes,
       EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY (containment - first_triage))) / 60 AS median_ttm_minutes
FROM times
WHERE first_triage IS NOT NULL AND containment IS NOT NULL
GROUP BY 1
ORDER BY 1;
```

### 2.2. Narrative Map Rollup (Postgres)

```sql
SELECT cluster_id,
       topic,
       COUNT(*) AS items,
       COUNT(DISTINCT account_handle) AS actors,
       SUM(reach_estimate) AS reach,
       AVG(severity) AS avg_severity,
       MIN(observed_at) AS first_seen,
       MAX(observed_at) AS last_seen
FROM io_events
WHERE observed_at >= NOW() - INTERVAL '72 hours'
GROUP BY 1, 2
ORDER BY reach DESC;
```

### 2.3. Takedown Status Tracker (Postgres)

```sql
SELECT provider,
       COUNT(*) FILTER (WHERE status = 'queued') AS queued,
       COUNT(*) FILTER (WHERE status = 'sent') AS sent,
       COUNT(*) FILTER (WHERE status = 'acknowledged') AS acknowledged,
       COUNT(*) FILTER (WHERE status = 'complete') AS complete,
       MAX(NOW() - initiated_at) FILTER (WHERE status IN ('queued','sent')) AS oldest_outstanding
FROM io_actions
GROUP BY provider
ORDER BY complete DESC;
```

### 2.4. Predictive Risk Outlook (Postgres)

```sql
WITH scoped AS (
  SELECT story_id,
         horizon_minutes,
         predicted_risk,
         predicted_reach,
         confidence_interval,
         model_version,
         generated_at,
         COALESCE(valid_to, valid_from + (horizon_minutes || ' minutes')::interval) AS expires_at,
         ROW_NUMBER() OVER (PARTITION BY story_id ORDER BY generated_at DESC) AS rn
  FROM io_forecasts
  WHERE generated_at >= NOW() - INTERVAL '48 hours'
)
SELECT story_id,
       horizon_minutes,
       predicted_risk,
       predicted_reach,
       confidence_interval,
       model_version,
       generated_at,
       expires_at
FROM scoped
WHERE rn = 1
ORDER BY predicted_risk DESC;
```

### 2.5. Provenance Coverage (Postgres)

```sql
WITH scoped AS (
  SELECT e.story_id,
         a.verified,
         a.score,
         a.verified_at
  FROM io_events e
  JOIN io_provenance_assertions a ON a.event_id = e.id
  WHERE e.observed_at >= NOW() - INTERVAL '48 hours'
)
SELECT story_id,
       COUNT(*) FILTER (WHERE verified) AS verified_count,
       COUNT(*) FILTER (WHERE NOT verified) AS pending_count,
       COALESCE(AVG(score), 0) AS average_score,
       MAX(verified_at) AS last_verified_at
FROM scoped
GROUP BY story_id
ORDER BY average_score ASC;
```

---

## 3. Jira Cloud Automation & SLAs

### 3.1. Issue Types & Fields

- **IO Case (Story):** overarching investigation.
- **Takedown (Task):** provider-specific request with SLA clock.
- **Public Advisory (Task):** communications deliverable.
- **Evidence Request (Sub-task):** data pulls or additional verification.

Custom fields:

- Story ID (select)
- Cluster ID (text)
- Severity (1–5 integer)
- Jurisdiction (select)
- TTD Minutes (number)
- TTM Minutes (number)

### 3.2. Workflow (IO Case)

```
Open → Triage → Mitigating → Monitoring → Closed
```

Only Legal may transition cases to `Closed` when any associated action is a law-enforcement referral.

### 3.3. Automation (YAML)

See `ops/jira/io/automation.yaml` for copy/paste into Jira Cloud.

### 3.4. SLA Configuration (JSON)

See `ops/jira/io/slas.json` for JSON import. Targets: TTD 30 minutes (sev ≥ 4) / 60 minutes (default); TTM 120 minutes (sev ≥ 4) / 240 minutes (default).

---

## 4. Debunk Cards & Verify Microsite

Two implementation paths:

1. **Static HTML** under `public/verify/index.html`.
2. **React page** `client/src/pages/VerifyUs.tsx` (ships with IntelGraph theme & nav integration).

Both variants expose:

- Signing key fingerprints.
- Hotline/callback workflow reminders.
- Debunk cards for priority narratives (voting time changes, disaster shelter closures, fake executive statements).

---

## 5. Rollout Checklist (30 Days)

1. Apply the Postgres migration and seed files in dev → stage → prod.
2. Wire dashboards using Section 2 SQL; validate with sample data.
3. Import Jira automation & SLA configurations; map to project custom fields.
4. Publish `/verify` page and add DNS TXT record with signing key fingerprint.
5. Run Exercises 1 & 2 from the playbook to capture baseline TTD/TTM metrics.
6. Subscribe to MTAC, Meta Threat Reporting, and NATO StratCom updates; feed into intel backlog.

---

## 6. Contacts & Ownership

- **Playbook Owner:** Trust & Safety Intelligence Lead.
- **Technical Owner:** Security Engineering (IO Detection squad).
- **Comms Liaison:** Corporate Communications Director.
- **Legal Liaison:** Regulatory Counsel (Telecom & Elections).

Document updates require a two-person review (one from Intel/T&S, one from Legal).
