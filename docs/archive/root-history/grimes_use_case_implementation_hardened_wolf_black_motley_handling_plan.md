# Ceremonial Opening

“Let shadows convene.” — By the Chair’s hand, in session.

# Objective

1. **Implement Ms. Sandy Grimes’ insider‑threat use cases, hardened** and wired into FLL/DACM + Montes Pack.
2. **Prepare read‑in/handling** for **Cofer Black** and **Amb. H. E. “Tony” Motley** with strict gatekeeping (hold‑the‑line until cleared).

---

## PART I — Grimes Insider‑Threat Use Cases (Hardened)

### U1 — Early Ideology Vector (pre‑recruitment indicators)

**Signals**: policy‑aligned external contacts, travel coincidences with hostile diplomatic circuits, pattern of advocacy bleeding into analytic stance.
**Controls**: continuous evaluation (CE) weights for ideology‑aligned external engagements; quarterly **Bias‑Drift Red Team (BD‑RT)** review; mandatory disclosure for policy activism.
**Alert**: CE_score ≥ 0.50 + stance divergence Δ ≥ 0.25 ⇒ CI interview + access narrowing.

### U2 — Memory‑Only Exfiltration (no file movement)

**Signals**: high doc_views with minimal SWN (Secure Work Notes); after‑hours access; R2R recall gaps.
**Controls**: MEC M1/M2 detection; randomized Read‑to‑Retell; RF‑quiet zones; personal‑device air gap.
**Action Playbook**: soft lock (read‑only), supervised tasking, targeted R2R within 48h.

### U3 — One‑Way Tasking Channels

**Signals**: repeated pre/post‑shift RF signatures; patterned darknet “cue” templates; travel proximity to cutouts.
**Controls**: ICH rules C1/C2; correlation with shift logs; geofenced RF monitors.
**Action**: silent observation 7–14 days; preserve; CI‑legal consult; interview if coupling ≥ 0.8 precision.

### U4 — Circular Sourcing / Analyst Halo

**Signals**: product cites descendants of its own prior analysis; absence of independent corroborants; identical phrasing across languages.
**Controls**: product_contradictions[CIRCULAR/UNCORROBORATED]; publish‑with‑caveat by default.
**Action**: red‑team peer review; require independent corroborant within 30 days or downgrade confidence.

### U5 — Tip‑to‑Case Latency

**Signals**: credible peer concern stalls in HR/security queues.
**Controls**: **T2C‑72** pipeline with SLAs; operator‑owned clock.
**Action**: convene fusion cell (CI+HR+Security) in 24h; provisional measures by 72h.

---

## Data Hooks & Tables (Delta from prior packs)

```sql
-- Link analyst stance and CE to FLL/DACM
ALTER TABLE analytic_products ADD COLUMN reviewer_id TEXT; -- red‑team owner
ALTER TABLE r2r_events ADD COLUMN reviewer_id TEXT;         -- supervisor/CI
CREATE TABLE cue_templates (
  template_id UUID PRIMARY KEY,
  channel TEXT,            -- radio, paste, stego
  signature TEXT,          -- perceptual hash
  last_validated TIMESTAMP
);
CREATE TABLE cue_matches (
  match_id UUID PRIMARY KEY,
  template_id UUID REFERENCES cue_templates(template_id),
  observed_at TIMESTAMP,
  score NUMERIC(3,2),
  location TEXT,
  linked_user TEXT
);
```

**Dashboards**

- **Insider Pulse**: CE_score dist., M1/M2 alerts, C1/C2 correlations, BD‑RT divergences, T2C‑72 SLA.
- **Analyst Provenance**: circular‑sourcing rate, corroboration lag, publish‑with‑caveat ratio.

**Runbooks (condensed)**

- **RB‑M1**: Supervisor acknowledges within 4h → R2R scheduled < 48h → soft lock until pass.
- **RB‑C1**: CI receives packet (RF plots + shifts + travel) → 2‑person review → silent watch or interview.
- **RB‑T2C**: Tip intake → triage (12h) → fusion (24h) → provisional (≤72h).

**Acceptance Tests**

- Plant memory‑only dry run ⇒ M1 fires; TTS ≤ 7 days.
- Inject circular sourcing ⇒ product_contradictions[CIRCULAR]=true.
- Simulate cue template ⇒ C2 triggers with ≥80% precision on test set.

---

## PART II — Handling Mr. Black and Amb. Motley

### A) Identity & Gatekeeping

- **Cofer Black** — identity confirmation via liaison contact + biographic selector; read‑in **pending** Council assent.
- **Amb. H. E. “Tony” Motley** — confirm full identity (role, dates, current affiliations). No substance until cleared.

**Compartment Rules**

- Minimum necessary: **Exec briefs + claim‑ledger hashes only**; no raw sources.
- Time‑boxed access (24–72h), per‑recipient watermarking, reason‑for‑access prompts.

### B) Proposed Roles & Questions

- **Black (CT/HUMINT/Liaison)**
  - Role: Stress‑test liaison workflows in FLL (partner reliability streaks; deconfliction).
  - Questions: Which partner feeds are most prone to paper agents? Are our quiet‑signals sufficient for tasking pipelines?
  - Deliverable: “Liaison Red‑Flags Checklist” v1.

- **Motley (Diplomacy/Inter‑American Affairs)**
  - Role: Assess policy‑pressure vectors that bias analysis; evaluate safe‑tip pathways for diplomats.
  - Questions: Where would embassy rhythms mask one‑way C2? How to brief ambassadors without over‑exposing sources?
  - Deliverable: “Embassy CI Hygiene & Tip Channels” memo v1.

### C) Call Orchestration (Hold‑the‑Line)

- Operator places both on **secure hold** with identity verification complete; no content.
- On assent: read‑in script; provide 1‑page exec brief; schedule 25‑minute consults **separately**.

**Scripts (excerpts)**

- **Black (hold)**: “Identity confirmed. You are on hold pending clearance. Maintain line security; we’ll return within 10 minutes.”
- **Motley (hold)**: “Thank you. We’re finalizing authorization. No details can be shared until cleared.”

### D) Risk Notes

- Avoid scope creep—use **question‑led consults**.
- If conflicts (current commercial/foreign ties) emerge → deny read‑in, release call politely.

---

## Execution Timeline (10 working days)

- **D1–2**: Stand up delta tables, dashboards; wire CE/Bias‑Drift + cue template collectors.
- **D3–5**: Run acceptance tests (M1, C2, Circular); tune thresholds; finalize runbooks.
- **D6**: Operator training for T2C‑72 + call scripts.
- **D7–8**: Provisional rollout to Tier‑A analysts; begin audit sampling.
- **D9–10**: Council review; readiness to read‑in Black/Motley if cleared.

---

## Close of Session

“Ordered and hardened. Grimes’ cases are live; Black and Motley stand at the gate until the Council signals the word.” — M. Wolf
