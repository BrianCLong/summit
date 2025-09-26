# IO Resilience Deployment Kit — Seeds, Dashboards, Jira, Microsite

This kit gives you: seed data (CSV), ready-to-run SQL for **Postgres/BigQuery**, dashboard specs, **Jira Cloud** workflow + automation YAML (SLAs & escalations), and a **Debunk/Verify microsite** starter.

---

## 1) Seed Data (generated)
**Files** (already created for you):
- `/mnt/data/IOEvents_seed.csv` (220 rows)
- `/mnt/data/IOActions_seed.csv` (187 rows)
- `/mnt/data/IOMedia_seed.csv` (57 rows)

### 1.1 Postgres — create tables & load
```sql
-- Create schemas (from the Playbook)
CREATE TABLE IF NOT EXISTS IOEvents (
  id UUID PRIMARY KEY,
  observed_at TIMESTAMPTZ NOT NULL,
  platform TEXT,
  locale TEXT,
  topic TEXT,
  story_id TEXT,
  detector TEXT,
  confidence NUMERIC,
  severity INTEGER,
  reach_estimate INTEGER,
  url TEXT,
  account_handle TEXT,
  cluster_id TEXT,
  is_authority_impersonation BOOLEAN DEFAULT FALSE,
  is_synthetic_media BOOLEAN DEFAULT FALSE,
  jurisdiction TEXT,
  raw_ref TEXT
);
CREATE TABLE IF NOT EXISTS IOActions (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES IOEvents(id),
  action_type TEXT,
  initiated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT,
  provider TEXT,
  ticket_id TEXT,
  outcome TEXT
);
CREATE TABLE IF NOT EXISTS IOMedia (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES IOEvents(id),
  media_type TEXT,
  sha256 TEXT,
  c2pa_present BOOLEAN,
  provenance_score NUMERIC
);
```
**Load CSVs** (adjust pathing if running remotely):
```sql
-- psql meta-commands
\copy IOEvents  FROM '/mnt/data/IOEvents_seed.csv'  CSV HEADER;
\copy IOActions FROM '/mnt/data/IOActions_seed.csv' CSV HEADER;
\copy IOMedia   FROM '/mnt/data/IOMedia_seed.csv'   CSV HEADER;
```

### 1.2 BigQuery — create & load
```sql
-- StandardSQL: create datasets
CREATE SCHEMA IF NOT EXISTS `${project}.io_resilience`;
CREATE TABLE IF NOT EXISTS `${project}.io_resilience.IOEvents` (
  id STRING, observed_at TIMESTAMP, platform STRING, locale STRING, topic STRING,
  story_id STRING, detector STRING, confidence FLOAT64, severity INT64,
  reach_estimate INT64, url STRING, account_handle STRING, cluster_id STRING,
  is_authority_impersonation BOOL, is_synthetic_media BOOL, jurisdiction STRING, raw_ref STRING
);
CREATE TABLE IF NOT EXISTS `${project}.io_resilience.IOActions` (
  id STRING, event_id STRING, action_type STRING, initiated_at TIMESTAMP,
  completed_at TIMESTAMP, status STRING, provider STRING, ticket_id STRING, outcome STRING
);
CREATE TABLE IF NOT EXISTS `${project}.io_resilience.IOMedia` (
  id STRING, event_id STRING, media_type STRING, sha256 STRING,
  c2pa_present BOOL, provenance_score FLOAT64
);
```
**CLI loads**
```bash
bq load --autodetect --source_format=CSV ${project}:io_resilience.IOEvents  /mnt/data/IOEvents_seed.csv
bq load --autodetect --source_format=CSV ${project}:io_resilience.IOActions /mnt/data/IOActions_seed.csv
bq load --autodetect --source_format=CSV ${project}:io_resilience.IOMedia   /mnt/data/IOMedia_seed.csv
```

---

## 2) Dashboards (queries ready to paste)

### 2.1 TTD/TTM Overview (Postgres)
```sql
WITH times AS (
  SELECT e.id,
         MIN(e.observed_at) AS first_observed,
         MIN(a.initiated_at) FILTER (WHERE a.action_type IS NOT NULL) AS first_triage,
         MIN(a.completed_at) FILTER (WHERE a.status = 'complete') AS containment
  FROM IOEvents e
  LEFT JOIN IOActions a ON a.event_id = e.id
  GROUP BY e.id
)
SELECT date_trunc('hour', first_observed) AS bucket,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY (first_triage - first_observed)) AS median_ttd,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY (containment - first_triage)) AS median_ttm
FROM times
WHERE first_triage IS NOT NULL AND containment IS NOT NULL
GROUP BY 1
ORDER BY 1;
```
**BigQuery variant**
```sql
WITH times AS (
  SELECT e.id,
         MIN(e.observed_at) AS first_observed,
         MIN(a.initiated_at) AS first_triage,
         MIN(IF(a.status = 'complete', a.completed_at, NULL)) AS containment
  FROM `${project}.io_resilience.IOEvents` e
  LEFT JOIN `${project}.io_resilience.IOActions` a ON a.event_id = e.id
  GROUP BY e.id
)
SELECT TIMESTAMP_TRUNC(first_observed, HOUR) AS bucket,
       APPROX_QUANTILES(TIMESTAMP_DIFF(first_triage, first_observed, MINUTE), 2)[OFFSET(1)] AS median_ttd_minutes,
       APPROX_QUANTILES(TIMESTAMP_DIFF(containment, first_triage, MINUTE), 2)[OFFSET(1)] AS median_ttm_minutes
FROM times
WHERE first_triage IS NOT NULL AND containment IS NOT NULL
GROUP BY bucket
ORDER BY bucket;
```

### 2.2 Narrative Map Rollup
```sql
SELECT cluster_id, topic,
       COUNT(*) AS items,
       COUNT(DISTINCT account_handle) AS actors,
       SUM(reach_estimate) AS reach,
       AVG(severity) AS avg_sev,
       MIN(observed_at) AS first_seen,
       MAX(observed_at) AS last_seen
FROM IOEvents
WHERE observed_at >= now() - INTERVAL '72 hours'
GROUP BY 1,2
ORDER BY reach DESC;
```

### 2.3 Takedown Status Tracker
```sql
SELECT provider,
       COUNT(*) FILTER (WHERE status = 'queued') AS queued,
       COUNT(*) FILTER (WHERE status = 'sent') AS sent,
       COUNT(*) FILTER (WHERE status = 'acknowledged') AS ack,
       COUNT(*) FILTER (WHERE status = 'complete') AS complete,
       MAX(now() - initiated_at) FILTER (WHERE status IN ('queued','sent')) AS oldest_outstanding
FROM IOActions
GROUP BY provider
ORDER BY complete DESC;
```

**Widget guidance**:
- TTD/TTM lines; SLA breach table (thresholds: TTD>30m sev≥4, TTM>120m sev≥4).
- Narrative graph: clusters as nodes (size=reach, color=topic) with hover cards linking to example URLs.
- Takedown funnel by provider + aged backlog list.

---

## 3) Jira Cloud — Workflow, SLAs, and Auto‑Escalations

### 3.1 Issue Types & Fields
- **IO Case** (Story), **Takedown** (Task), **Public Advisory** (Task), **Evidence Request** (Sub‑task).
- Custom fields: **Story ID (select)**, **Cluster ID (text)**, **Severity (1–5)**, **Jurisdiction (select)**, **TTD Minutes (number)**, **TTM Minutes (number)**.

### 3.2 Workflow (IO Case)
```
Open → Triage → Mitigating → Monitoring → Closed
[Guardrails: only Legal can close if action_type ∈ {LE_referral}]
```

### 3.3 Automation (YAML — Jira Cloud)
```yaml
version: 1
rules:
  - name: Auto-create takedown tasks for high severity
    event: issue_created
    if:
      all:
        - issue.issueType = "IO Case"
        - issue.customfield_severity >= 4
    then:
      - create_issues:
          - project: ${PROJECT_KEY}
            type: Task
            summary: "Takedown: ${issue.summary}"
            fields:
              parent: ${issue.key}
              customfield_story_id: ${issue.customfield_story_id}
      - add_comment: "Auto-created takedown task due to severity >=4"

  - name: Escalate if TTD > 30m
    event: schedule
    schedule: "*/5 * * * *"
    jql: "project = ${PROJECT_KEY} AND issuetype = 'IO Case' AND status = Triage"
    actions:
      - if:
          any:
            - smartvalue: "{{now.diff(issue.created).minutes}} > 30"
        then:
          - assign: "@oncall-intel"
          - send_slack: "#io-warroom" "TTD breach on {{issue.key}} — triage now"

  - name: Close loop when takedown complete
    event: issue_updated
    if:
      all:
        - issue.issueType = "Takedown"
        - issue.status CHANGED TO Done
    then:
      - for: parent
        actions:
          - transition: Monitoring
```

### 3.4 SLAs (JSM — JSON extract)
```json
{
  "slas": [
    {
      "name": "TTD",
      "start": "issue.created",
      "stop": "status CHANGED TO Triage",
      "goal": {"sev>=4": "30m", "default": "60m"}
    },
    {
      "name": "TTM",
      "start": "status CHANGED TO Triage",
      "stop": "status CHANGED TO Mitigating",
      "goal": {"sev>=4": "120m", "default": "240m"}
    }
  ]
}
```

---

## 4) Debunk Cards & “Verify Us” Microsite (starter)
> Drop this into your web repo. Framework‑agnostic HTML provided; a React variant is included below.

### 4.1 Static HTML (brandable)
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Verify Us — <Your Org></title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"/>
  <style>
    .card{border:1px solid #e5e7eb;border-radius:16px;padding:1rem;margin:1rem 0}
    .muted{color:#6b7280;font-size:.9rem}
    .badge{padding:.25rem .5rem;border-radius:999px;border:1px solid #d1d5db}
    .sig{font-family:monospace;word-break:break-all}
  </style>
</head>
<body>
<main class="container">
  <h1>Verify Us</h1>
  <p>Official updates originate only from <strong>https://yourdomain.tld</strong> and our verified accounts below. Signed assets carry C2PA manifests and PGP signatures.</p>
  <section class="card">
    <h3>Signing Keys</h3>
    <p class="muted">Rotate quarterly. Publish fingerprints here and in DNS TXT records.</p>
    <ul>
      <li>PGP Fingerprint: <span class="sig">3F23 8C8E 9B77 1A2C 0D11  7A2E 1F9A 44E1 DC55 9AAB</span></li>
      <li>X.509 KeyID: <span class="sig">4c:f2:89:ba:1a:77:2c:11</span></li>
    </ul>
  </section>
  <section class="card">
    <h3>Official Accounts</h3>
    <ul>
      <li>X/Twitter: @yourorg</li>
      <li>Facebook: /yourorg</li>
      <li>Hotline: +1-800-YOUR-ORG (voice callback verification)</li>
    </ul>
  </section>
  <section class="card">
    <h3>Debunk Cards</h3>
    <article class="card">
      <header><span class="badge">Election</span> Voting time changed via robocall</header>
      <p><strong>Verdict:</strong> False. We never call to change voting times. Verify via the hotline above.</p>
      <p><strong>Evidence:</strong> Audio hash: <span class="sig">f1c2...9a</span> • Case: IO-1423 • Last updated: 2025-09-25</p>
    </article>
    <article class="card">
      <header><span class="badge">Disaster</span> Shelters closed due to contamination</header>
      <p><strong>Verdict:</strong> False. Official shelter status is on this page: <a href="#">/shelters</a>.</p>
      <p><strong>Evidence:</strong> Links to EOC bulletins • Case: IO-1567</p>
    </article>
  </section>
</main>
</body>
</html>
```

### 4.2 React component (Tailwind ready)
```tsx
import React from "react";
export default function VerifyUs() {
  const keys = [
    {label: "PGP Fingerprint", value: "3F23 8C8E 9B77 1A2C 0D11  7A2E 1F9A 44E1 DC55 9AAB"},
    {label: "X.509 KeyID", value: "4c:f2:89:ba:1a:77:2c:11"},
  ];
  const cards = [
    {tag: "Election", title: "Voting time changed via robocall", verdict: "False.", details: "We never call to change voting times.", caseId: "IO-1423", updated: "2025-09-25"},
    {tag: "Disaster", title: "Shelters closed due to contamination", verdict: "False.", details: "See official shelter status.", caseId: "IO-1567", updated: "2025-09-25"},
  ];
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Verify Us</h1>
      <p className="text-gray-600 mb-6">Official updates originate only from <b>https://yourdomain.tld</b>. Assets are signed (C2PA/PGP). Hotline: +1‑800‑YOUR‑ORG.</p>

      <section className="rounded-2xl border p-4 mb-6">
        <h3 className="text-xl font-semibold mb-2">Signing Keys</h3>
        <ul className="space-y-1">
          {keys.map(k => (
            <li key={k.label} className="font-mono text-sm break-all"><b>{k.label}:</b> {k.value}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border p-4 mb-6">
        <h3 className="text-xl font-semibold mb-2">Debunk Cards</h3>
        <div className="space-y-4">
          {cards.map(c => (
            <div key={c.title} className="rounded-2xl border p-4">
              <div className="text-sm inline-flex items-center gap-2 mb-2"><span className="px-2 py-0.5 border rounded-full">{c.tag}</span></div>
              <h4 className="text-lg font-semibold">{c.title}</h4>
              <p><b>Verdict:</b> {c.verdict} {c.details}</p>
              <p className="text-gray-500 text-sm">Case: {c.caseId} • Last updated: {c.updated}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

---

## 5) Next Steps (quick wire‑up)
1) **Load seeds** into Postgres/BigQuery using §1.  
2) **Create dashboards** with §2 queries; add filters: topic, story_id, provider, severity.  
3) **Import Jira** automation YAML (§3.3), create custom fields (§3.1), and attach SLAs (§3.4).  
4) **Publish microsite** (static HTML or React) under `/verify` on your domain; add DNS TXT with PGP fingerprint; add C2PA to official images.  
5) **Run a mini‑exercise** (voice‑clone or spoof site) and watch TTD/TTM tiles populate.

> Ping me with your exact stack (managed Postgres vs. AlloyDB, or BigQuery dataset name; Jira Cloud site URL), and I’ll tailor field IDs, webhooks, and CI scripts to your environment.

