# Ceremonial Opening

“Let shadows convene.” — By the Chair’s hand, in session.

# Purpose

Operationalize Cofer Black’s liaison-focused recommendations into the existing **FLL/DACM** & **Montes** stack: novelty gating, paper‑agent heuristics, deconfliction drills, and curated‑pipeline watch.

---

## 1) Data Model — Additions to FLL/DACM

```sql
-- Partner-level rolling metrics
CREATE TABLE partner_metrics (
  partner_id INT REFERENCES partners(partner_id),
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  high_impact_claims INT DEFAULT 0,
  validated_microfacts INT DEFAULT 0,
  novelty_index NUMERIC(4,3) GENERATED ALWAYS AS
    (CASE WHEN high_impact_claims>0 THEN validated_microfacts::NUMERIC/high_impact_claims ELSE 0 END) STORED,
  cadence_regular BOOLEAN DEFAULT FALSE,          -- periodic win cadence flag
  handler_fingerprint_cluster TEXT,               -- cluster label if present
  tasking_compliance_score NUMERIC(4,3) DEFAULT 0,
  paper_agent_score NUMERIC(4,3) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(partner_id, window_start, window_end)
);

-- Microfacts (verifiable novelties) tied to assertions
CREATE TABLE novelty_microfacts (
  microfact_id UUID PRIMARY KEY,
  partner_id INT REFERENCES partners(partner_id),
  assertion_id UUID REFERENCES assertions(assertion_id),
  description TEXT NOT NULL,
  requested_at TIMESTAMP DEFAULT NOW(),
  due_by TIMESTAMP,
  validated_at TIMESTAMP,                         -- set when independently validated
  validation_method TEXT,                         -- open-source check, internal sensor, liaison corroboration
  status TEXT DEFAULT 'requested'                 -- requested|received|validated|missed
);

-- Origin chains (sanitized)
CREATE TABLE origin_chain_submissions (
  submission_id UUID PRIMARY KEY,
  partner_id INT REFERENCES partners(partner_id),
  assertion_id UUID REFERENCES assertions(assertion_id),
  submitted_at TIMESTAMP DEFAULT NOW(),
  collection_mode TEXT,                           -- HUMINT|SIGINT|DOC|MISC (sanitized)
  collection_date DATE,
  provenance_summary TEXT,
  accepted BOOLEAN,
  reviewer_id TEXT,
  notes TEXT
);

-- Taskings sent to partners (innocuous)
CREATE TABLE partner_taskings (
  tasking_id UUID PRIMARY KEY,
  partner_id INT REFERENCES partners(partner_id),
  issued_at TIMESTAMP DEFAULT NOW(),
  due_by TIMESTAMP,
  payload_hash TEXT NOT NULL,                     -- hash of innocuous prompt
  channel TEXT,                                   -- liaison, cable, meeting
  objective TEXT,
  cohort_label TEXT                               -- for A/B divergence tests
);

CREATE TABLE partner_tasking_responses (
  response_id UUID PRIMARY KEY,
  tasking_id UUID REFERENCES partner_taskings(tasking_id),
  partner_id INT REFERENCES partners(partner_id),
  received_at TIMESTAMP,
  response_hash TEXT,
  latency_hours NUMERIC(6,2),
  quality_notes TEXT,
  detritus_score NUMERIC(4,3) DEFAULT 0           -- presence of human “mess” (typos, slang, asynchrony)
);

-- Deconfliction collisions (blinded)
CREATE TABLE deconflict_collisions (
  collision_id UUID PRIMARY KEY,
  window_start DATE,
  window_end DATE,
  blinded_key TEXT,                                -- HMAC(canonical_key)
  partners TEXT[],                                 -- involved partner ids masked
  divergence JSONB,                                -- fields that diverge (origin, timeline)
  severity SMALLINT,                               -- 1/2/3
  opened_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'open'
);

-- DACM heuristic flags
CREATE TABLE heuristic_flags (
  flag_id UUID PRIMARY KEY,
  assertion_id UUID REFERENCES assertions(assertion_id),
  rule_code TEXT,                                  -- PAPER_AGENT, HANDLER_FINGERPRINT, CADENCE_REGULARITY
  score NUMERIC(4,3),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 2) Algorithms & Scoring

### 2.1 Novelty Index (per 30‑day window)

- **Definition:** `novelty_index = validated_microfacts / high_impact_claims`.
- **Gate:** `preferred` tier requires `≥ 0.25`; `restricted` if `< 0.10` for two consecutive windows.

**Computation Sketch**

```python
# inputs: claims, microfacts
for partner in partners:
    claims = count_high_impact_claims(partner, window)
    novs   = count_validated_microfacts(partner, window)
    idx = novs/claims if claims else 0
    cadence = detect_periodic_success(partner, window)
    handler_cluster = cluster_format_lexical_tics(partner, window)
    update_partner_metrics(partner, idx, cadence, handler_cluster)
```

### 2.2 PAPER_AGENT Heuristic (DACM)

`score = w1*instant_latency + w2*(1-detritus) + w3*handler_match + w4*(zero_contradictions)`

- Defaults: `w1=0.30, w2=0.25, w3=0.25, w4=0.20`.
- **Trigger:** open triage at `score ≥ 0.65`; label partner stream _fabrication‑risk_.

### 2.3 Tasking Compliance Score

`TCS = f(divergence, latency, novelty_yield)` measured across three innocuous tasks.

- **Healthy pattern:** variable latencies, partial answers, occasional human errors.
- **Suspect:** uniform, polished, sub‑hour responses across all tasks.

---

## 3) Deconfliction Drills (Hash‑Ring Trilateral)

### 3.1 Blinding Scheme

- Council keeps secret key `K`. For each canonical person key `C`, compute `B = HMAC_SHA256(K, C)`.
- Partners exchange **only** `B` values via Council broker; no raw identifiers shared across partners.

### 3.2 Weekly Flow

1. Ingest blinded keys from Partners A/B/C + minimal metadata (topic, first_seen).
2. Detect `B` collisions; open `deconflict_collisions` with divergence summary.
3. Escalate **High** if: 3‑way collision + conflicting origin chains.

### 3.3 Cold‑Start Day

- Internally mark a **no‑leak day**; log any partner reports that “foresee” draft outcomes ⇒ raise **Leakback/Recycle** flag.

---

## 4) Quiet‑Signals Enrichment

- Add cross‑medium correlation: `RF cadence` + `travel calendar` + `messaging last‑seen` + `badge access` + `shift`.
- Elevate to **C2.5** when ≥3 surfaces align within ±30 minutes, 4×/month.

---

## 5) Governance & MoU Language (excerpts)

**Standards Clause — Novelty & Origin**

> Preferred‑tier status requires delivery of at least one novel, verifiable microfact for every four high‑impact claims per 30 days, and willingness to furnish a sanitized origin chain upon request.

**Fabrication‑Risk Clause**

> Streams exhibiting uniform instant tasking compliance, absent human detritus, or repetitive handler fingerprints may be designated **fabrication‑risk**; distribution may be curtailed pending remediation.

**Deconfliction Participation**

> Partner agrees to blinded collision checks via Council broker; no sensitive identifiers exchanged partner‑to‑partner.

---

## 6) Analyst & Operator SOPs

- **Novelty Requests:** When a high‑impact claim lands, auto‑open a microfact ticket with a concrete, low‑risk verifiable and a 10‑day due date.
- **Origin Chain Triage:** Accept sanitized mode/date/summary; refuse hand‑waving. Two refusals → **Hands‑On Review**.
- **Escalation Ladder:** Silent Watch → Hands‑On Review → Sever & Sanitize (as defined below).

**Thresholds**

- **Silent Watch:** contradictions 0.60–0.80; novelty pending.
- **Hands‑On Review:** ≥3 missed microfacts **or** ≥2 origin refusals.
- **Sever & Sanitize:** persistent cadence regularity + 3‑way collisions after notice.

---

## 7) Dashboards

- **Curated Pipeline Watchlist:** partners with (cadence_regular OR handler_fingerprint_cluster) AND low novelty index.
- **Deconflict Heatmap:** blinded collisions by topic/time.
- **Tasking Compliance Panel:** latency variance, divergence quality, detritus score.

---

## 8) Communications Kits

**Standards Note (neutral tone)**

> “To improve inter-operability, we apply uniform quality metrics (novelty rate, origin clarity, and tasking compliance). Your current tiering is provisional and will be reviewed in 30 days against these metrics.”

**Sever & Sanitize Notice (final)**

> “Quality metrics indicate unremediated issues (fabrication‑risk indicators; unresolved deconfliction collisions). Until resolved, we will suspend intake of this stream. This is a technical determination and does not reflect on broader liaison equities.”

---

## 9) Tests & Acceptance

- Seed three innocuous tasks → **TCS** computed; PAPER_AGENT triage opens if pattern uniform.
- Inject handler‑style boilerplate across two “distinct” sources → handler_fingerprint_cluster detected.
- Run trilateral deconflict with synthetic blinded overlaps → High‑severity collision created.

---

## 10) Timeline (7/30/90)

- **7 days:** Turn on Novelty Index; schedule Cold‑Start Day; seed taskings.
- **30 days:** Complete trilateral drill; publish Liaison Red‑Flags Checklist; send standards note.
- **90 days:** Re‑tier partners by metrics; update MoUs; brief Council on tightened streams vs. attrition.

---

## 11) Close of Session

“Metrics before warmth; proof before praise. The pipeline will comply or wither.” — M. Wolf
