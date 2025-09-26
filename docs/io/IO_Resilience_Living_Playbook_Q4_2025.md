# IO Resilience Living Playbook — Q4 2025

> A modular, versioned playbook to detect, disrupt, and document information operations (IO). Keep this file as the source of truth and link out to tickets, dashboards, and evidence lockers.

---

## 0. Scope & Objectives

- **Mission:** Reduce harm from coordinated influence operations by minimizing **Time-to-Detect (TTD)** and **Time-to-Mitigate (TTM)**, preserving organizational trust, and documenting actions for legal or regulatory follow-up.
- **Coverage:** Elections, disasters/public safety, finance and brand abuse, geopolitical conflicts, and critical-infrastructure narratives.
- **Guardrails:** No real-world suppression of rights. Simulate with sandboxes and coordinate with Legal & Comms before public statements.

## 1. Operating Model (RACI & Cadence)

**RACI**

- **Intel/Trust & Safety (Owner):** triage, attribution hypotheses, dashboard curation.
- **Security Engineering (Responsible):** detectors, pipelines, alerting, takedown tooling.
- **Comms (Consulted):** public statements, debunk cards, media handling.
- **Legal (Accountable):** platform notices, law-enforcement liaison, evidence hold.
- **Product/Policy (Consulted):** enforcement policy, escalation criteria.

**Cadence**

- **Daily:** 15-minute IO stand-up (overnight spikes, alerts, takedown queue).
- **Weekly:** Case review and KPI review (TTD/TTM, dwell time, coverage gaps).
- **Monthly:** Red/Blue retro, TTP refresh, detector A/B results.
- **Quarterly:** Full red-team exercise cycle (see Section 8).

## 2. Data Model (Event & Evidence Schema)

Use a central **io_events** table with related **io_actions**, **io_media**, **io_forecasts**, and **io_provenance_assertions** tables. Suggested schema:

```sql
CREATE TABLE io_events (
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
  raw_ref TEXT,
  threat_vector TEXT,
  risk_score NUMERIC,
  anomaly_score NUMERIC,
  forecast_horizon_minutes INTEGER,
  predicted_reach INTEGER,
  provenance_confidence NUMERIC
);

CREATE TABLE io_actions (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES io_events(id),
  action_type TEXT,
  initiated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT,
  provider TEXT,
  ticket_id TEXT,
  outcome TEXT
);

CREATE TABLE io_media (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES io_events(id),
  media_type TEXT,
  sha256 TEXT,
  c2pa_present BOOLEAN,
  provenance_score NUMERIC
);

CREATE TABLE io_forecasts (
  id UUID PRIMARY KEY,
  cluster_id TEXT,
  story_id TEXT,
  horizon_minutes INTEGER NOT NULL,
  predicted_risk NUMERIC,
  predicted_reach INTEGER,
  confidence_interval NUMERIC,
  model_version TEXT,
  generated_at TIMESTAMPTZ NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  rationale TEXT
);

CREATE TABLE io_provenance_assertions (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES io_events(id),
  source TEXT,
  assertion_type TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  signature_hash TEXT,
  c2pa_manifest_url TEXT,
  score NUMERIC,
  notes TEXT
);
```

## 3. Metrics (Formulas & Targets)

- **Time-to-Detect (TTD):** `first_triage_at - first_observed_at`.
- **Time-to-Mitigate (TTM):** `containment_time - first_triage_at` (takedown acknowledged, debunk live, or block active).
- **Dwell Time (Impersonation):** `first_impersonation_seen - authenticated counter-message published`.
- **Narrative Reproduction Number (Rₙarr):** `posts_in_window(t+Δ) / posts_in_window(t)` per cluster. Target **Rₙarr < 1** within two hours of playbook execution.
- **Coverage:** Percentage of monitored platforms/locales with functioning detectors.
- **Precision/Recall:** Monthly evaluation using adjudicated samples.
- **Predictive Risk Score (Rᵣᵢₛₖ):** Aggregated from io_forecasts; treat **Rᵣᵢₛₖ ≥ 0.85** as auto-severity bump.
- **Provenance Health Index (PHI):** Derived from verified vs. pending assertions; flag PHI < 0.4 for provenance escalation.

**Initial Targets** (tune quarterly):

- Median **TTD ≤ 30 minutes** for high-severity cases; **TTM ≤ 2 hours**.
- **Impersonation dwell ≤ 60 minutes**.
- **Coverage ≥ 90%** of priority surfaces.

## 4. Dashboards (Specifications)

Implement in Grafana, Looker, or Mode—same queries, different skins.

### 4.1. TTD/TTM Overview

- Median TTD by topic (24h, 7d).
- Median TTM by provider (platform/telco/registrar).
- SLA breach list with ticket links.

```sql
WITH times AS (
  SELECT e.id,
         MIN(e.observed_at) AS first_observed,
         MIN(a.initiated_at) FILTER (WHERE a.action_type IS NOT NULL) AS first_triage,
         MIN(a.completed_at) FILTER (WHERE a.status = 'complete') AS containment
  FROM io_events e
  LEFT JOIN io_actions a ON a.event_id = e.id
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

### 4.2. Narrative Map Rollups

- Cluster-level nodes sized by reach and colored by topic.
- Table showing cluster_id, topic, items, unique actors, reach, severity, first_seen, last_seen.

```sql
SELECT cluster_id,
       topic,
       COUNT(*) AS items,
       COUNT(DISTINCT account_handle) AS actors,
       SUM(reach_estimate) AS reach,
       AVG(severity) AS avg_sev,
       MIN(observed_at) AS first_seen,
       MAX(observed_at) AS last_seen
FROM io_events
WHERE observed_at >= now() - INTERVAL '72 hours'
GROUP BY 1, 2
ORDER BY reach DESC;
```

### 4.3. Takedown Status Tracker

- Funnel by provider: queued → sent → acknowledged → complete.
- Oldest outstanding takedown age per provider.
- Outcome heatmap by action_type × provider.

```sql
SELECT provider,
       COUNT(*) FILTER (WHERE status = 'queued') AS queued,
       COUNT(*) FILTER (WHERE status = 'sent') AS sent,
       COUNT(*) FILTER (WHERE status = 'acknowledged') AS ack,
       COUNT(*) FILTER (WHERE status = 'complete') AS complete,
       MAX(now() - initiated_at) FILTER (WHERE status IN ('queued','sent')) AS oldest_outstanding
FROM io_actions
GROUP BY provider
ORDER BY complete DESC;
```

### 4.4. Predictive Risk Outlook

- Latest risk forecast per story_id with confidence interval bands.
- Highlight forecasts expiring within the next hour.

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
  WHERE generated_at >= now() - INTERVAL '24 hours'
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

### 4.5. Provenance Health Matrix

- Verified vs. pending assertions per story with PHI gauge.
- Flag stories whose PHI < 0.4 or with more pending than verified items.

```sql
WITH scoped AS (
  SELECT e.story_id,
         a.verified,
         a.score,
         a.verified_at
  FROM io_events e
  JOIN io_provenance_assertions a ON a.event_id = e.id
  WHERE e.observed_at >= now() - INTERVAL '24 hours'
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

## 5. Narrative Canon (Story IDs)

Maintain a controlled vocabulary of **Story IDs** for consistent deduplication and reporting.

```yaml
- Election-Process-Suppression/Voice-Clone/Call-Back-CTA
- Disaster-Authority-Blame/Agency-Incompetence
- Finance-Fake-Exec/Deepfake-Video
- Geopolitics-Ukraine/Legitimacy-Narratives
- Geopolitics-Taiwan/Deterrence-Failure
- Middle-East/Humanitarian-Obstruction-Claims
```

Store this list under version control and gate changes through review.

## 6. Playbooks (Runbook Snippets)

### 6.1. Authority Impersonation (Voice Clone)

1. Trigger: `is_authority_impersonation = true` or keyword match (“official alert”, “urgent voting”).
2. Verify via callback protocol; raise severity to 5.
3. File telco/VoIP provider complaint using template with audio hashes.
4. Publish signed advisory on owned channels with callback number and unique phrase.
5. Track TTD/TTM; close when call volume subsides and provider confirms block.

**SLA:** TTD ≤ 30 minutes, TTM ≤ 2 hours.

### 6.2. Spoofed Media Site

1. Trigger: domain similarity score ≥ threshold or referer from known clone networks.
2. Snapshot site, WHOIS/TLS; add to io_events with cluster_id.
3. File takedown requests (registrar + hosting + CDN + search).
4. Publish debunk card with canonical source list; push to media partners.
5. Monitor residual traffic; target Rₙarr < 1 inside two hours.

### 6.3. Disaster Rumor (Shelter/Response)

1. Trigger: spike in disaster topic with authority blame keywords.
2. Cross-check with EOCs and official feeds.
3. Publish single URL canonical update; syndicate to local media and social.
4. Request platform labels/limits; archive evidence to case folder.
5. Review after-action within 24 hours.

### 6.4. Financial Pump & Fake Executive Video

1. Trigger: executive name + “announcement/leak” + rapid new accounts.
2. Perform media provenance checks; alert exchanges/regulators if market-moving.
3. Release signed investor communications; request platform takedowns.
4. Publish investor FAQ; monitor price/volume anomalies.

## 7. Evidence & Chain of Custody

- Store raw captures (HTML, audio, video) in immutable storage with SHA-256 hashes and timestamps.
- Generate daily case manifests linking events to actions and outcomes.
- Track legal requests with jurisdiction, action type, and status.

## 8. Quarterly Red-Team Calendar (Q4 2025 → Q3 2026)

Each quarter includes three thematic drills plus a capstone. Tune dates to team availability.

### Q4 2025

- Week 2: Voice clone election alert.
- Week 5: Spoofed media clone + multilingual drip.
- Week 8: Disaster rumor surge.
- Week 11: Finance deepfake CEO + forged memo (capstone).

### Q1 2026

- Week 3: Botnet consensus manufacture (forums + micro-influencers).
- Week 6: Cross-language narrative pivot (EN ↔ ES ↔ FR).
- Week 9: Election admin hoax SMS + webform.
- Week 12: Multi-vector capstone (voice + site + social + SMS).

### Q2 2026

- Week 2: Critical infrastructure scare tabletop.
- Week 5: NGO/aid-corridor misinformation drill.
- Week 8: Deepfake regulator audio + press inquiry swarm.
- Week 11: Rapid Rₙarr suppression race (capstone).

### Q3 2026

- Week 3: Diaspora targeting + translation traps.
- Week 6: Registrar churn/hard takedown scenario.
- Week 9: Live-ops shadow campaign (48-hour continuous red/blue).
- Week 12: Unknown unknowns free-play (capstone).

**Exercise scoring:** Track TTD (median/p90), TTM (median/p90), SLA breaches, impersonation dwell, takedown dwell, Rₙarr at two hours, evidence completeness.

## 9. Templates

**Takedown Notice (Registrar/Host)**

```
Subject: Request for Action – Malicious Impersonation / Coordinated IO

To: <provider abuse contact>
We identified content hosted at <URL/IP> that impersonates <org> and is part of a coordinated information operation. Evidence bundle: <link>. Jurisdiction: <country>. We request removal or access limitation under <policy/law>. Please confirm receipt and action.
```

**Public Advisory (Signed)**

```
We are aware of misleading messages purporting to be from <org>. Official updates are published at <domain>. Verify via <hotline>. This message is signed with key <fingerprint>.
```

**Debunk Card Skeleton**

- Claim
- Verdict
- Evidence (links, hashes)
- Who to contact
- Last updated
- Signature

## 10. Tooling Backlog

- Domain look-alike scanner with homoglyph detection; alert to Slack/Jira.
- Audio fingerprinting and voice-clone detector ensemble.
- Cross-platform clusterer (embeddings + HDBSCAN) with Story ID assistant.
- C2PA manifest signer for owned media; verifier widget in dashboards.

## 11. Implementation Notes

- Gate detector threshold updates behind feature flags.
- Version playbooks and require Legal review for changes.
- Mix tabletop and live exercises to avoid overfitting.

## 12. Appendix (Demo Data Seeds)

- Seed io_events with ~200 synthetic rows across six Story IDs for dashboard testing.
- Provide sample takedown flows (registrar/telco/platform) for run-throughs.
- Maintain change log at the top of this file when updates ship.

---

**Maintenance:** Update Story IDs and SLAs monthly. Archive superseded sections instead of deleting. Track revisions in version control for auditability.
