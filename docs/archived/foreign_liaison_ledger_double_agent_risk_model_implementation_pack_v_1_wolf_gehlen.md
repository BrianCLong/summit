# Ceremonial Opening

“Let shadows convene.” — By the Chair’s hand, in session.

# Purpose

Stand up two capabilities, immediately usable:

1. **Foreign Liaison Ledger (FLL)** — a partner/source provenance and trust registry with chain‑of‑custody for every datum.
2. **Double‑Agent & Contradiction Model (DACM)** — automated detection and scoring of identity, chronology, capability, and provenance conflicts across compartments.

> Chair’s Guidance (Wolf): Archivally rich feeds are power only if they are **tested, contradicted, and provenance‑locked**. Build doubt into the design.

---

## 1) System Overview (Architecture at a Glance)

- **Ingestors**: ETL jobs per partner (CSV, JSON, STIX, API). All normalize to FLL JSON Schemas.
- **Provenance Service**: Content‑addressable store (SHA‑256) + append‑only event log.
- **Core Registry (SQL)**: Partners, Assets, Assertions, Evidence, ProvenanceEvents, Contradictions, AccessAudit.
- **Analyst Workbench**: Queues for “Needs Triage,” “Contradiction Review,” “Publish with Caveat.”
- **Risk Engine (DACM)**: Graph + rules + lightweight ML hooks (optional later). Emits alerts + scores.
- **Governance**: ABAC policies, reason‑for‑access prompts, and ombudsman review.

---

## 2) Data Model (SQL DDL — deploy day one)

```sql
-- Partners (liaison services / providers)
CREATE TABLE partners (
  partner_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_code CHAR(2),
  mou_ref TEXT,                     -- MoU or legal basis
  trust_tier SMALLINT DEFAULT 2,    -- 0=blocked,1=restricted,2=standard,3=preferred
  caveats TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assets (human/technical sources as represented by partner)
CREATE TABLE assets (
  asset_id UUID PRIMARY KEY,
  partner_id INT REFERENCES partners(partner_id),
  partner_asset_ref TEXT NOT NULL,  -- their identifier as provided
  canonical_person_key TEXT,        -- hashed biometrics or composite key
  status TEXT DEFAULT 'active',     -- active, latent, terminated, unknown
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  sensitivity_label TEXT,           -- e.g., S/REL, TS//SI//NOFORN
  notes TEXT
);

-- Assertions (claims made by partners or internal collectors)
CREATE TABLE assertions (
  assertion_id UUID PRIMARY KEY,
  asset_id UUID REFERENCES assets(asset_id),
  claim_type TEXT NOT NULL,         -- identity, location, capability, intent, report
  claim_payload JSONB NOT NULL,
  claim_time TIMESTAMP,             -- when the claim refers to
  reported_at TIMESTAMP DEFAULT NOW(),
  classification TEXT,
  provenance_hash TEXT NOT NULL,    -- content hash of payload+context
  reliability_score NUMERIC(3,2) DEFAULT 0.50,  -- running value 0..1
  caveats TEXT
);

-- Evidence (documents, intercepts, photos, receipts)
CREATE TABLE evidence (
  evidence_id UUID PRIMARY KEY,
  assertion_id UUID REFERENCES assertions(assertion_id),
  kind TEXT,                        -- doc, image, intercept, human_note, device_log
  uri TEXT,                         -- pointer into object store/DAM
  content_hash TEXT NOT NULL,
  collected_at TIMESTAMP,
  chain_prev TEXT,                  -- previous hash for append-only chain
  collector TEXT                    -- partner code or internal unit
);

-- Provenance events (chain-of-custody for assertions/evidence)
CREATE TABLE provenance_events (
  event_id UUID PRIMARY KEY,
  object_kind TEXT NOT NULL,        -- assertion|evidence
  object_id UUID NOT NULL,
  actor TEXT NOT NULL,              -- user/service
  action TEXT NOT NULL,             -- created|ingested|transformed|redacted|approved
  at TIMESTAMP DEFAULT NOW(),
  before_hash TEXT,
  after_hash TEXT NOT NULL,
  reason TEXT
);

-- Contradictions (findings from DACM)
CREATE TABLE contradictions (
  contradiction_id UUID PRIMARY KEY,
  severity SMALLINT NOT NULL,       -- 1=low 2=med 3=high
  rule_code TEXT NOT NULL,          -- e.g., ID_COLLISION, GEO_IMPOSSIBLE
  primary_assertion UUID REFERENCES assertions(assertion_id),
  conflicting_assertion UUID REFERENCES assertions(assertion_id),
  details JSONB NOT NULL,
  score NUMERIC(3,2) NOT NULL,      -- 0..1 deception/contradiction likelihood
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'open'        -- open|triaged|closed
);

-- Access audits (guardrails)
CREATE TABLE access_audit (
  audit_id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  object_kind TEXT NOT NULL,
  object_id UUID NOT NULL,
  action TEXT NOT NULL,             -- view|export|download
  at TIMESTAMP DEFAULT NOW(),
  justification TEXT                 -- reason-for-access prompt
);
```

---

## 3) Normalized JSON Schemas (for ingestors)

**`asset.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Asset",
  "type": "object",
  "required": ["partner_id", "partner_asset_ref"],
  "properties": {
    "asset_id": { "type": "string", "format": "uuid" },
    "partner_id": { "type": "integer" },
    "partner_asset_ref": { "type": "string" },
    "canonical_person_key": { "type": "string" },
    "status": { "type": "string" },
    "first_seen": { "type": "string", "format": "date-time" },
    "last_seen": { "type": "string", "format": "date-time" },
    "sensitivity_label": { "type": "string" },
    "notes": { "type": "string" }
  }
}
```

**`assertion.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Assertion",
  "type": "object",
  "required": ["asset_id", "claim_type", "claim_payload", "provenance_hash"],
  "properties": {
    "assertion_id": { "type": "string", "format": "uuid" },
    "asset_id": { "type": "string", "format": "uuid" },
    "claim_type": {
      "type": "string",
      "enum": ["identity", "location", "capability", "intent", "report"]
    },
    "claim_payload": { "type": "object" },
    "claim_time": { "type": "string", "format": "date-time" },
    "reported_at": { "type": "string", "format": "date-time" },
    "classification": { "type": "string" },
    "provenance_hash": { "type": "string" },
    "reliability_score": { "type": "number", "minimum": 0, "maximum": 1 },
    "caveats": { "type": "string" }
  }
}
```

**`provenance_event.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ProvenanceEvent",
  "type": "object",
  "required": ["object_kind", "object_id", "actor", "action", "after_hash"],
  "properties": {
    "event_id": { "type": "string", "format": "uuid" },
    "object_kind": { "type": "string" },
    "object_id": { "type": "string", "format": "uuid" },
    "actor": { "type": "string" },
    "action": { "type": "string" },
    "at": { "type": "string", "format": "date-time" },
    "before_hash": { "type": "string" },
    "after_hash": { "type": "string" },
    "reason": { "type": "string" }
  }
}
```

---

## 4) Chain‑of‑Custody & Hashing (how to provenance‑lock)

**Canonical hash input** = `canonicalize(JSON(payload)) + "|" + ISO8601(claim_time) + "|" + partner_id + "|" + asset_id`

**Append‑only chain**: For each new Evidence entry, set `chain_prev = previous(content_hash)` and recompute `after_hash` in `provenance_events`. Any mutation forces a new event with a new hash; you never overwrite.

**Collision defense**: Use `SHA‑256` and maintain a secondary `BLAKE3` hash; alert if mismatch.

---

## 5) Double‑Agent & Contradiction Model (DACM)

### 5.1 Contradiction Types (rules to enable immediately)

- **ID_COLLISION**: Two partners claim the same canonical_person_key with incompatible biographics.
- **GEO_IMPOSSIBLE**: Same subject placed in locations that exceed plausible transit between `t1` and `t2`.
- **CAPABILITY_MISMATCH**: Claimed skills/devices contradict physical/linguistic/technical constraints.
- **RECYCLED_ASSET**: Different partner_asset_ref map to same canonical key but diverge on origin/handler chains.
- **REPORT_LOOP**: An assertion’s evidence ultimately cites derived reports from itself (circular sourcing).
- **TIMELINE_DISCONTINUITY**: Asset reported active after termination or before first_seen.

### 5.2 Scoring

`score = 1 - Π(1 - w_i * e_i)` where `e_i` is normalized error for each rule (0..1) and `w_i` is rule weight (default: ID=0.35, GEO=0.20, CAP=0.20, LOOP=0.15, TIME=0.10). Thresholds: **Low ≥0.30**, **Med ≥0.60**, **High ≥0.80**.

### 5.3 Pseudocode (drop‑in tasks)

```python
# Input: list[Assertion]
# Output: list[Contradiction]

def id_collision(assertions):
    out = []
    by_key = {}
    for a in assertions:
        key = a.claim_payload.get('canonical_person_key') or a.claim_payload.get('subject_key')
        if not key:
            continue
        by_key.setdefault(key, []).append(a)
    for key, group in by_key.items():
        bios = {(g.claim_payload.get('dob'), g.claim_payload.get('pob'), g.claim_payload.get('nationality')) for g in group}
        if len(bios) > 1:
            out.append(make_contradiction('ID_COLLISION', group))
    return out

def geo_impossible(assertions, max_kmh=900):
    out = []
    by_subject = group_by_subject(assertions)
    for subj, claims in by_subject.items():
        claims = sorted(claims, key=lambda c: c.claim_time)
        for i in range(len(claims)-1):
            d = haversine_km(claims[i].claim_payload['latlon'], claims[i+1].claim_payload['latlon'])
            dt_h = hours_between(claims[i].claim_time, claims[i+1].claim_time)
            if dt_h > 0 and (d / dt_h) > max_kmh:
                out.append(make_contradiction('GEO_IMPOSSIBLE', [claims[i], claims[i+1]], details={"km": d, "h": dt_h}))
    return out

# Combine, weight, and emit
contradictions = id_collision(A) + geo_impossible(A) + ...
for c in contradictions:
    c.score = weight(c)
    c.severity = 1 if c.score < 0.6 else (2 if c.score < 0.8 else 3)
    persist(c)
```

### 5.4 Quiet‑Signals Monitoring

- **Regularity detectors**: Fixed cadence of “wins” from one partner’s feed → mark as staged pipeline.
- **Lexical twins**: Near‑duplicate phrasing across languages → recycled reporting.
- **Latency cliffs**: Abrupt drop in time‑to‑report → planted proof or internal leak.

---

## 6) Analyst Workflow (SOP)

1. **Ingest**: Normalize partner drop → validate against JSON schema → compute hashes → write `assertions` + `evidence` + `provenance_events`.
2. **Auto‑screen**: DACM runs rules; contradictions open triage tickets with default caveats.
3. **Triage Board**: Two‑person integrity check (collector vs. counterintelligence). Resolve or escalate.
4. **Publication**: No external dissemination without **Claim Ledger** extract listing provenance hashes and explicit caveats.
5. **Retrospective**: Monthly reliability streaks per partner; adjust `trust_tier` automatically with human override.

---

## 7) Governance & Guardrails

- **ABAC (example)**

```yaml
policies:
  - id: analyst-can-view-SREL
    effect: allow
    subject: role == 'analyst'
    action: view
    resource: classification in ['S/REL', 'C/REL'] and partner.trust_tier >= 1
  - id: export-requires-justification
    effect: allow
    subject: role in ['analyst','lead'] and justification != null
    action: export
    resource: any
  - id: no-download-TS
    effect: deny
    subject: any
    action: download
    resource: classification == 'TS//SI//NOFORN'
```

- **Tripwires**: Alert on bulk views by single user, viewing one asset >5× in 24h, or cross‑compartment joins without ticket.
- **Ombuds Review**: Random 5% sampling of analyst decisions per month.

---

## 8) Metrics that Matter (Dashboard)

- Partner reliability trend (90‑day EMA).
- Mean time to contradiction closure.
- % assertions published with caveats.
- Quiet‑signals index by partner.
- Duplicate asset ratio (suspected RECYCLED_ASSET).

---

## 9) Implementation Backlog (2‑week sprint plan)

**Day 1–2**: Stand up DB with DDL; seed partners; wire hash functions.

**Day 3–5**: Build JSON validation + ingestors (one partner as pilot). Implement ID_COLLISION, GEO_IMPOSSIBLE.

**Day 6–8**: Triage board UI (basic), access audits, ABAC policies.

**Day 9–10**: Add REPORT_LOOP detector; publish claim‑ledger export; create reliability streaks job.

**Stretch**: BLAKE3 secondary hash; lexical‑twin detector; latency‑cliff monitor; ML hooks.

---

## 10) Operating Notes (Wolf)

- **Never** accept a “gift archive” without its chain‑of‑custody and contradiction map.
- Publish **with caveats by default**; remove caveats only after independent corroboration.
- Reward the analyst who finds the contradiction, not the one who files the most reports.

> Close of Session: “Seen and ordered. Doubt institutionalized; trust earned.” — M. Wolf
