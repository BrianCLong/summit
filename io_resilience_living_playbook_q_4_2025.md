# IO Resilience Living Playbook — Q4 2025

> A modular, versioned playbook to detect, disrupt, and document information operations (IO). Contains dashboard specs (TTD/TTM, narrative map, takedown status), runbooks, and a quarterly red‑team calendar. Keep this doc as the **source of truth** and link out to tickets, dashboards, and evidence lockers.

---

## 0) Scope & Objectives
- **Mission:** Reduce harm from coordinated influence operations by minimizing **Time‑to‑Detect (TTD)** and **Time‑to‑Mitigate (TTM)**, preserving brand/institutional trust, and documenting actions for legal/regulatory follow‑up.
- **Coverage:** Elections, disasters/public safety, finance/brand abuse, geopolitical conflicts, and critical‑infrastructure narratives.
- **Guardrails:** No real‑world suppression of rights; simulate with sandboxes; coordinate with Legal & Comms before public statements.

---

## 1) Operating Model (RACI & Cadence)
**RACI**
- **Intel/Trust & Safety (Owner):** triage, attribution hypotheses, dashboard curation.
- **Security Eng (Responsible):** detectors, pipelines, alerting, takedown tooling.
- **Comms (Consulted):** public statements, debunk cards, media handling.
- **Legal (Accountable):** platform notices, law‑enforcement liaison, evidence hold.
- **Product/Policy (Consulted):** enforcement policy, escalation criteria.

**Cadence**
- **Daily:** 15‑min IO stand‑up (overnight spikes, alerts, takedown queue).
- **Weekly:** Case review, KPI review (TTD/TTM, dwell time, coverage gaps).
- **Monthly:** Red/Blue retro, TTP refresh, detector A/B results.
- **Quarterly:** Full red‑team exercise cycle (see §8).

---

## 2) Data Model (Event & Evidence Schema)
Use a central **IOEvents** table and related **Entities, Claims, Media, Actions**. Suggested minimal schema:

```sql
-- Core events (one row per observation or detector alert)
CREATE TABLE IOEvents (
  id UUID PRIMARY KEY,
  observed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  platform TEXT,                -- e.g., X, Facebook, Reddit, Web, Telephony
  locale TEXT,                  -- e.g., en-US, fr-FR
  topic TEXT,                   -- election, disaster, finance, geopolitics
  story_id TEXT,                -- canonical narrative ID (see §5)
  detector TEXT,                -- rule name or model
  confidence NUMERIC,           -- 0..1
  severity INTEGER,             -- 1..5
  reach_estimate INTEGER,       -- audience size estimate
  url TEXT,
  account_handle TEXT,
  cluster_id TEXT,              -- narrative cluster assignment
  is_authority_impersonation BOOLEAN DEFAULT FALSE,
  is_synthetic_media BOOLEAN DEFAULT FALSE,
  jurisdiction TEXT,            -- for legal routes
  raw_ref TEXT                  -- pointer to blob storage / evidence
);

-- Actions taken
CREATE TABLE IOActions (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES IOEvents(id),
  action_type TEXT,             -- takedown_notice, comms_advisory, blocklist, LE_referral
  initiated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT,                  -- queued, sent, acknowledged, complete, failed
  provider TEXT,                -- telco, platform, registrar
  ticket_id TEXT,               -- JIRA/ServiceNow link
  outcome TEXT                  -- freeform summary
);

-- Media provenance (optional, ties to C2PA/manifest)
CREATE TABLE IOMedia (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES IOEvents(id),
  media_type TEXT,              -- audio, image, video
  sha256 TEXT,
  c2pa_present BOOLEAN,
  provenance_score NUMERIC      -- 0..1 (ensemble detector output)
);
```

---

## 3) Metrics (Formulas & Targets)
**Time‑to‑Detect (TTD):** first_observed_at → first_triage_at.  
**Time‑to‑Mitigate (TTM):** first_triage_at → containment_time (takedown acknowledged OR debunk published OR block active).  
**Dwell Time (Impersonation):** first_impersonation_seen → authenticated counter‑message published.  
**Narrative Reproduction Number (Rₙarr):** posts_in_window(t+Δ)/posts_in_window(t) for a cluster. Target **Rₙarr < 1** within 2 hours of playbook execution.  
**Coverage:** % of priority platforms/locales being monitored with functioning detectors.  
**Precision/Recall:** monthly evaluation using adjudicated sample.

**Targets (initial, tune quarterly):**
- **Median TTD ≤ 30m** for high‑severity cases; **TTM ≤ 2h**.
- **Impersonation dwell ≤ 60m**.
- **Coverage ≥ 90%** of priority surfaces.

---

## 4) Dashboards (Spec & Widgets)
Implement in Grafana/Looker/Mode—same queries, different skins.

### 4.1 TTD/TTM Overview
**Widgets**
- Median **TTD by topic** (24h, 7d) — line chart.
- Median **TTM by provider** (platform/telco/registrar) — bar chart.
- **SLA breaches** (count & list) — table with links to tickets.

**SQL (example, Postgres):**
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

### 4.2 Narrative Map
**Goal:** cluster semantically similar posts/URLs across platforms and languages; show cluster health and spread.

**Pipeline sketch:**
1) Ingest text/media metadata → normalize language → generate embeddings (e.g., `text-embedding-3` or local model).  
2) **HDBSCAN**/K‑Means clustering → assign `cluster_id`.  
3) Hourly rollups: volume, unique accounts, cross‑platform edges, Rₙarr.  
4) Graph widget: nodes = clusters (sized by reach), edges = overlap of accounts/links; color by topic/severity.

**Rollup SQL:**
```sql
SELECT
  cluster_id,
  topic,
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

### 4.3 Takedown Status Tracker
**Widgets**
- **By provider:** sent → acknowledged → completed (funnel).  
- **Oldest outstanding (age)** by provider.  
- **Outcome heatmap** by action_type × provider.

**SQL (aging):**
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

---

## 5) Narrative Canon (Story IDs)
Maintain a controlled vocabulary of **Story IDs** to make de‑duplication and reporting consistent. Start with:
- **Election‑Process‑Suppression/Voice‑Clone/Call‑Back‑CTA**  
- **Disaster‑Authority‑Blame/Agency‑Incompetence**  
- **Finance‑Fake‑Exec/Deepfake‑Video**  
- **Geopolitics‑Ukraine/Legitimacy‑Narratives**  
- **Geopolitics‑Taiwan/Deterrence‑Failure**  
- **Middle‑East/Humanitarian‑Obstruction‑Claims**

Store as YAML/JSON in repo; gate changes via review.

---

## 6) Playbooks (Runbook Snippets)

### 6.1 Authority‑Impersonation (Voice Clone)
**Trigger:** is_authority_impersonation = TRUE OR keyword match ("official alert", "urgent voting").
**Steps:**
1) Verify with **callback protocol**; raise severity to 5.  
2) File telco/VoIP provider complaint using prepared template; attach audio, hashes.  
3) Publish **signed advisory** on owned channels with callback number and unique phrase.  
4) Track TTD/TTM; close when call volume subsides and provider confirms block.
**SLA:** TTD ≤ 30m; TTM ≤ 2h.

### 6.2 Spoofed Media Site
**Trigger:** domain similarity score ≥ threshold OR referer from known clone nets.
**Steps:**
1) Snapshot site, WHOIS/TLS; add to IOEvents with cluster_id.  
2) Takedown route: registrar + hosting + CDN + search deindex.  
3) Debunk card with canonical source list; push to media partners.  
4) Monitor residual traffic; aim Rₙarr < 1 inside 2h.

### 6.3 Disaster Rumor (Shelter/Response)
**Trigger:** spike in disaster topic with authority‑blame keyword set.
**Steps:**
1) Cross‑check with EOCs and official feeds.  
2) Single‑URL canonical update; syndicate to local media/social.  
3) Request platform label/limit; archive evidence to case folder.  
4) Review after‑action within 24h.

### 6.4 Financial Pump & Fake‑Exec Video
**Trigger:** exec name + “announcement/leak” + rapid new accounts.
**Steps:**
1) Media provenance check; contact exchange/regulators if market moving.  
2) Company statement with signed assets; platform takedown.  
3) Investor‑relations FAQ; monitor price/volume anomalies.

---

## 7) Evidence & Chain‑of‑Custody
- Store raw captures (HTML, audio, video) under **immutable buckets** with SHA‑256 and time‑stamp.
- Generate daily **case manifests** (CSV/JSON) linking events → actions → outcomes.
- Legal requests tracked in IOActions with `jurisdiction` and `outcome`.

---

## 8) Quarterly Red‑Team Calendar (Q4‑2025 → Q3‑2026)
> Each quarter runs 3 exercises + 1 capstone, mapped to top risk surfaces. Tune dates to your team’s timezone.

### Q4‑2025
- **Week 2:** Exercise A — Voice‑Clone Election Alert (telco/takedown + comms).  
- **Week 5:** Exercise B — Spoofed‑Media Clone + Multilingual Drip (web/registrar/CDN).  
- **Week 8:** Exercise C — Disaster Rumor Surge (cross‑platform + local media).  
- **Week 11:** Capstone — Finance Deepfake CEO + Forged Memo (brand & markets).

### Q1‑2026
- **Week 3:** Botnet Consensus Manufacture (forum + micro‑influencers).  
- **Week 6:** Cross‑language Narrative Pivot (EN↔ES↔FR).  
- **Week 9:** Election Admin Hoax SMS + Webform.  
- **Week 12:** Capstone — Multi‑vector (voice + site + social + SMS).

### Q2‑2026
- **Week 2:** Infrastructure Scare (grid/water disinfo) tabletop.  
- **Week 5:** NGO/aid‑corridor misinformation drill.  
- **Week 8:** Deepfake regulator audio + press inquiry swarm.  
- **Week 11:** Capstone — Rapid Rₙarr Suppression race.

### Q3‑2026
- **Week 3:** Diaspora targeting + translation traps.  
- **Week 6:** Registrar churn/hard takedown scenario.  
- **Week 9:** Live‑ops shadow campaign (48h continuous red/blue).  
- **Week 12:** Capstone — Unknown unknowns (free‑play).

**Exercise Scoring (all):**
- TTD (median, p90), TTM (median, p90), SLA breach count, impersonation dwell, takedown dwell, Rₙarr after 2h, evidence completeness.

---

## 9) Templates
**A. Takedown Notice (Registrar/Host)**
```
Subject: Request for Action – Malicious Impersonation / Coordinated IO

To: <provider abuse contact>
We have identified content hosted at <URL/IP> that impersonates <org> and is part of a coordinated information operation. Evidence bundle: <link>. Jurisdiction: <country>. We request removal or access limitation under <policy/law>. Please confirm receipt and action.
```

**B. Public Advisory (Signed)**
```
We are aware of misleading messages purporting to be from <org>. Official updates are only published at <domain>. If you received a call/text, please verify via <hotline>. This message is signed with key <fingerprint>.
```

**C. Debunk Card**
- Claim, Verdict, Evidence (links), Who to Contact, Last Updated, Signature.

---

## 10) Backlog (Detectors & Tooling)
- **Domain look‑alike scanner** with homoglyph detection; alert to Slack/Jira.
- **Audio fingerprinting** and **voice‑clone detector** ensemble.
- **Cross‑platform clusterer** (embeddings + HDBSCAN) with Story‑ID labeling assistant.
- **C2PA manifest signer** for owned media; verifier widget in dashboards.

---

## 11) Implementation Notes
- Use feature flags for detectors; log version & threshold per alert.
- Keep **Playbooks** directory versioned; changes require Intel + Legal review.
- Schedule quarterly **tabletop + live** mixes; rotate scenarios to avoid overfitting.

---

## 12) Appendix — Demo Data Seeds
- Seed `IOEvents` with 200 synthetic rows across 6 Story IDs for dashboard testing.
- Provide 8 sample takedown flows (registrar/telco/platform) for run‑throughs.

> **Maintenance:** Update Story IDs and SLAs monthly; archive superseded sections instead of deleting. Keep a change log at the top of this document.

