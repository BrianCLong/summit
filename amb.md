# Ceremonial Opening

“Let shadows convene.” — By the Chair’s hand, in session.

# Purpose

Integrate **Ambassador H. E. “Tony” Motley** as a _diplomatic hygiene & tip‑channels_ advisor under strict guardrails, and operationalize his lane: protect posts from covert tasking patterns, improve safe‑tip pathways, and insulate analysis from policy‑pressure bias.

---

## 1) Read‑In Scope (Conditional — Approved)

- **Role:** External advisor on **Embassy CI hygiene**, **representational‑event risk**, **safe‑tip design for diplomats & LES**, and **policy‑pressure mitigation**.
- **Boundaries:** Exec briefs, schemas, synthetic scenarios; **no live asset identities**, no ongoing ops timelines. ORCON, watermarked, 72‑hour read‑only credential.
- **Conflict Check:** Current affiliations and foreign engagements disclosed; recusals documented.

---

## 2) Advisory Questions (Tasking for Motley)

1. Which embassy rhythms (calls, receptions, motor‑pool patterns) most often conceal one‑way **instruction channels**?
2. How to formalize **safe‑tip channels** at post that protect diplomats/LES while avoiding rumor mills?
3. What **counter‑pressure rituals** can preserve analytic integrity when policy heat rises?
4. Which **host‑nation liaison practices** are most prone to paper agents and curated leak pipelines from a diplomatic vantage?

**Deliverables**

- **Embassy CI Hygiene Checklist v1** (post leadership)
- **Safe‑Tip SOP v1** (for diplomats & LES)
- **Reception & Courtesy‑Call Risk Guide v1** (event hygiene)
- **Policy‑Pressure Insulation Note v1** (for front offices)

---

## 3) Data & Telemetry (Additions)

```sql
-- Embassy event calendar (structured)
CREATE TABLE post_events (
  event_id UUID PRIMARY KEY,
  post_code TEXT NOT NULL,              -- e.g., BRASILIA, LIMA
  event_type TEXT,                      -- reception, courtesy_call, demarche, country_team
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  attendees TEXT[],                     -- titles/roles only; no PII beyond role
  host TEXT,
  notes TEXT
);

-- Representational contact logs (sanitized)
CREATE TABLE representational_contacts (
  contact_id UUID PRIMARY KEY,
  post_code TEXT,
  event_id UUID REFERENCES post_events(event_id),
  counterpart_org TEXT,                 -- ministry, SOE, media, liaison, NGO
  followup_expected BOOLEAN,
  followup_due DATE,
  outcome TEXT
);

-- Tip channel submissions (diplomats/LES)
CREATE TABLE tip_channel_submissions (
  tip_id UUID PRIMARY KEY,
  post_code TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  role_band TEXT,                       -- FS, LES, DCM, etc.
  vector TEXT,                          -- in-person, secure line, sealed pouch
  content_hash TEXT,
  risk_level SMALLINT,                  -- 1..3
  ack_at TIMESTAMP,
  triage_at TIMESTAMP,
  disposition TEXT
);

-- Proximity anomalies near post (instruction‑channel candidates)
CREATE TABLE diplomatic_proximity_anomalies (
  anomaly_id UUID PRIMARY KEY,
  post_code TEXT,
  observed_at TIMESTAMP,
  medium TEXT,                          -- RF, bluetooth, wifi, physical
  signature TEXT,
  rssi NUMERIC(5,2),
  duration_ms INT
);
```

---

## 4) Detection Logic (Embassy Rhythms & One‑Way Cues)

- **Reception‑Cue Coupling (RCC):** If distinct anomalies (RF/wifi/bt) recur within ±30m of receptions/courtesy calls **3×/month**, open **RCC‑Alert**.
- **Motor‑Pool Timing Drift (MPTD):** Regular 7–10m pre‑event drop‑offs at non‑standard curb points ⇒ **C2.5 Elevated**; possible physical dead‑drop.
- **Call‑Back Stair‑Step:** Predictable follow‑ups from counterpart orgs after receptions without prior agenda ⇒ flag **curated pipeline**.

**Scoring**
`RCC_score = normalized(recurrence) + normalized(signal_strength variance)`; **≥0.6** ⇒ triage, **≥0.8** ⇒ on‑site sweep.

---

## 5) Safe‑Tip SOP (Diplomats & LES)

### Channels

- **In‑person sealed note** to CI liaison;
- **Dedicated secure line** with call windows;
- **Pouch to region CI cell** with per‑tip tracking ID.

### Process & SLAs

- Acknowledge ≤ 8h; triage ≤ 24h; protective measures ≤ 72h.
- **No retaliation clause** and **confidential routing**; access reduction applies to _targets_, not reporters.

### Forms (Min Fields)

- Who/what/when; observed vectors; corroborants; any immediate risk.

---

## 6) Policy‑Pressure Insulation

- **Country‑Team Caveat Protocol:** When analysis is politically heated, publish **with caveats by default** and attach **source‑provenance ledger**.
- **Red‑Team at Post:** Quarterly contrarian review (econ/pol/mil reps) to surface drift; track divergences vs baseline.
- **Ambassador’s Red Line:** No sharing of live source identities in country‑team meetings; metrics and contradictions only.

---

## 7) Host‑Nation Liaison (Diplomatic View)

- **MoU Inserts:** novelty & origin clauses (partner must provide low‑risk microfacts; agree to blinded deconfliction).
- **Reception Hygiene:** Avoid crafting “wins” on the reception circuit; all claims mapped to origin chains or downgraded.

---

## 8) Dashboards (Post Leadership)

- **Event‑Cue Overlay:** receptions/calls layered with proximity anomalies.
- **Tip Channel Health:** submissions, SLA compliance, outcomes; anonymous satisfaction pulse.
- **Policy‑Heat Monitor:** count of products published with caveats, red‑team divergences.

---

## 9) Scripts & Brief Kits

- **Ambassador Brief (10 min):** embassy rhythms, RCC/MPTD tells, safe‑tip instructions, “red line” rules.
- **Front Office Quick Card:** do/don’t list for receptions, courtesy calls, and media engagements.

---

## 10) Tests & Drills

- **Reception Drill:** Plant synthetic cue during reception → RCC alert fires.
- **Tip‑to‑Case Drill:** Submit test tip → ack ≤ 8h, triage ≤ 24h, measures ≤ 72h.
- **Country‑Team Red‑Team:** inject contrarian baseline → ensure caveated product and divergence logging.

---

## 11) Timeline (10 working days)

- **D1–2:** Create tables; wire event calendars and anomaly collectors.
- **D3–5:** Stand up safe‑tip line + forms; train operators; run reception drill.
- **D6–8:** Country‑team caveat protocol and red‑team cadence; dashboards live.
- **D9–10:** Deliver Embassy CI Hygiene Checklist, Safe‑Tip SOP, and Reception Risk Guide; Council review.

---

## 12) Close of Session

“Diplomacy’s rhythm can hide an enemy’s metronome. We will hear it—and break it—without breaking the embassy.” — M. Wolf
