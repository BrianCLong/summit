# Ceremonial Opening

“Let shadows convene.” — By the Chair’s hand, in session.

# Purpose

Operationalize the Council’s Montes remedies as deployable controls, workflows, and data structures. Objective: **reduce time‑to‑suspicion**, **raise cost of memory‑only exfiltration**, and **institutionalize contradiction & provenance for analysts**.

---

## 0) Threat Model (Montes Pattern)

- **Entry vector:** ideology‑motivated insider enters cleared role already recruited.
- **Modus:** memorization + offsite transcription; one‑way tasking channel; avoids obvious money/doc trails.
- **Blind spots exploited:** overreliance on polygraph; expertise halo; slow tip‑to‑case pipeline; weak provenance on analytic product.

---

## 1) Memory‑Exfil Controls (MEC)

### 1.1 Policy (excerpt)

- Tier‑A analysts must use **Secure Work Notes (SWN)** for every task touching classified sources. Notes are time‑boxed, auto‑saved, and **hash‑sealed** at close.
- **Randomized Read‑to‑Retell (R2R)**: Monthly, 10% of Tier‑A analysts are tasked to verbally reconstruct their last week’s key pulls under supervision, using only SWN; gaps trigger targeted review.
- **Session Boundaries**: No offline drafting of classified content. Personal devices banned from spill‑zones; RF‑quiet enforced.

### 1.2 Data Model (SQL)

```sql
CREATE TABLE analyst_sessions (
  session_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  doc_views INT DEFAULT 0,
  note_bytes INT DEFAULT 0,
  swn_hash TEXT,                      -- rolling hash of Secure Work Notes
  after_hours BOOLEAN DEFAULT FALSE
);

CREATE TABLE r2r_events (
  r2r_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  gap_index NUMERIC(3,2),             -- 0..1 fraction of unverifiable recall
  followup TEXT                       -- actions ordered
);

CREATE TABLE swn_notes (
  note_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id UUID REFERENCES analyst_sessions(session_id),
  created_at TIMESTAMP DEFAULT NOW(),
  size_bytes INT NOT NULL,
  hash TEXT NOT NULL,
  prev_hash TEXT,
  topic_tags TEXT[]
);
```

### 1.3 Detection (rules)

- **High doc_views + low note_bytes** (z‑score > 2 for peer group) ⇒ MEC Alert M1.
- **After‑hours churn** (>95th percentile nocturnal access) ⇒ MEC Alert M2.
- **R2R gap_index ≥ 0.30** ⇒ CI review + access curtailed until resolved.

---

## 2) Instruction‑Channel Hunting (ICH)

### 2.1 Surfaces

- **One‑way C2**: broadcast/anonymous inbox/stego posts.
- **RF/Traffic anomalies**: repeat RF bursts near facility; consistent check‑ins just before/after shifts.
- **Travel/Contact patterns**: recurring proximity with diplomatic/known cutouts.

### 2.2 Telemetry & Schemas

```sql
CREATE TABLE rf_anomalies (
  anomaly_id UUID PRIMARY KEY,
  sensor_id TEXT,
  observed_at TIMESTAMP,
  band_mhz NUMERIC(6,3),
  duration_ms INT,
  rssi NUMERIC(5,2),
  signature TEXT                     -- hashed spectral fingerprint
);

CREATE TABLE darknet_inbox_hits (
  hit_id UUID PRIMARY KEY,
  observed_at TIMESTAMP,
  channel TEXT,                      -- pastebin, onion board, dead-drop repo
  signature TEXT,                    -- perceptual hash of template
  match_score NUMERIC(3,2),
  url_ref TEXT
);
```

### 2.3 Correlation Rules

- **RF‑Shift Coupling**: If a user’s shift start/stop ±30m aligns with RF signature recurrence ≥ 4×/month ⇒ ICH Alert C1.
- **One‑Way Template Match**: darknet_inbox_hits match_score ≥ 0.85 for known cue formats + user travel within 24h ⇒ C2.

---

## 3) Bias‑Drift Red Team (BD‑RT)

### 3.1 Method

- Build a **baseline stance vector** per topic (multi‑source). Compare each analyst’s product stance using cosine/KL divergence.
- **Alert thresholds**: monthly divergence Δ ≥ 0.25 vs team median ⇒ BD‑RT review.

### 3.2 Tables

```sql
CREATE TABLE analytic_products (
  product_id UUID PRIMARY KEY,
  user_id TEXT,
  published_at TIMESTAMP,
  topic TEXT,
  stance_vector REAL[],               -- normalized
  provenance_hash TEXT NOT NULL
);

CREATE TABLE bias_drift_alerts (
  alert_id UUID PRIMARY KEY,
  user_id TEXT,
  topic TEXT,
  window_start TIMESTAMP,
  window_end TIMESTAMP,
  divergence REAL,
  status TEXT DEFAULT 'open'
);
```

### 3.3 SOP

- Quarterly panel (CI + SME + opposing‑view SME) reviews drift cases; products with unresolved circular sourcing get **publish‑with‑caveat** label.

---

## 4) Continuous Evaluation (CE) Modernization

### 4.1 Signals & Weights

- **Peer Concern** (+0.25), **Unexplained Foreign Contact** (+0.30), **Anomalous RF/Traffic Coupling** (+0.20), **MEC M1/M2** (+0.15), **Financial Stress** (+0.10).

### 4.2 Score

`CE_score = Σ(w_i * s_i)`; **Review ≥ 0.50**, **Restrict ≥ 0.70** (temporary access reduction, supervisor interview).

### 4.3 Access Policy Snippet (ABAC)

```yaml
- id: restrict-high-ce
  effect: deny
  subject: CE_score >= 0.70
  action: view
  resource: classification in ['S','TS']
```

---

## 5) Tip‑to‑Case Fast Track (T2C‑72)

### 5.1 SLA

- **Intake**: credentialed tip auto‑acks in 2h; triage within 12h.
- **Fusion Cell**: CI + HR + Security convene in 24h.
- **Provisional Measures**: within 72h (monitoring, access narrowing, interview schedule).

### 5.2 Forms & Workflow

- **Tip Form v1**: structured fields (subject, behaviors, dates, corroborants); reporter protection options.
- **Case Log**: every action signed & timestamped; disclosure minimization as default.

---

## 6) Extend FLL/DACM to Analysts (Product Provenance)

### 6.1 Tables

```sql
CREATE TABLE product_sources (
  product_id UUID REFERENCES analytic_products(product_id),
  assertion_id UUID,                   -- from FLL.assertions
  role TEXT,                           -- primary|corroborant|context
  UNIQUE(product_id, assertion_id)
);

CREATE TABLE product_contradictions (
  pc_id UUID PRIMARY KEY,
  product_id UUID,
  rule_code TEXT,                      -- CIRCULAR, UNCORROBORATED, OUTDATED
  score NUMERIC(3,2),
  details JSONB,
  status TEXT DEFAULT 'open'
);
```

### 6.2 Rules

- **CIRCULAR**: product cites sources that ultimately chain to the product’s own prior work.
- **UNCORROBORATED**: no independent corroborant within 30 days for critical claims.
- **OUTDATED**: key source last updated > 365 days in fast‑moving topic.

---

## 7) Damage Containment Playbook (DCP)

### 7.1 Immediate

- Freeze subject’s accounts; preserve volatile data; initiate **Touch Map** query.

### 7.2 Touch Map (SQL sketch)

```sql
-- List assets, products, and partners touched by suspect in last 24 months
SELECT a.user_id, ap.product_id, ps.assertion_id, p.name AS partner
FROM analyst_sessions a
LEFT JOIN analytic_products ap ON ap.user_id = a.user_id
LEFT JOIN product_sources ps ON ps.product_id = ap.product_id
LEFT JOIN partners p ON p.partner_id = (SELECT partner_id FROM assertions WHERE assertion_id = ps.assertion_id)
WHERE a.user_id = $SUSPECT AND a.started_at >= NOW() - INTERVAL '24 months';
```

### 7.3 Officer Safety

- If **any** product_sources map to human assets with exposure risk, trigger **OP‑SEVERE**: halt operations, notify field, relocate as required.

---

## 8) Dashboards & Metrics

- **Time‑to‑Suspicion (TTS)** median.
- % analysts with **M1/M2 alerts** per month.
- **CE_score** distribution, actions taken.
- **Bias‑Drift** cases opened/closed; average divergence.
- **Product Contras**: circular sourcing rate.

---

## 9) Two‑Week Sprint Plan

**Days 1–2**: Create new tables (MEC, ICH, BD‑RT, CE); integrate with existing FLL/DACM schema.

**Days 3–4**: SWN secure notes service + hash chain; R2R scheduler + UI.

**Days 5–6**: RF anomaly & inbox collectors (stubs allowed); correlation rules C1/C2.

**Days 7–8**: Bias‑drift baseline & divergence job; panel workflow.

**Days 9–10**: CE aggregator + ABAC hook; T2C‑72 forms and case log.

**Stretch**: Product_contradictions detectors; Touch Map queries & OP‑SEVERE drill.

---

## 10) Acceptance Tests

- Plant a **memory‑only dry run** → M1/M2 fires within 7 days.
- Simulate one‑way cue pattern → C1 correlates with shift times ≥ 80% precision.
- Inject circular sourcing into test product → product_contradictions[CIRCULAR] = true.
- T2C‑72 triage ticket to provisional measures in ≤ 72h (clocked).

---

## 11) Training & Comms

- 30‑minute brief for all Tier‑A analysts; emphasize **provenance over volume**.
- CI Office Hours weekly; clear safe‑tip channels.
- Celebrate contradiction finds; adjust incentives to reward doubt.

---

**Close of Session**
“Ordered and set in motion. Where memory once hid betrayal, we now bind it to provenance, contradiction, and time.” — M. Wolf
