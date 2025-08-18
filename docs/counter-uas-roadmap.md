# Counter-UAS/USV Capability Roadmap

This document outlines a defensive, standards-aligned expansion of IntelGraph for countering uncrewed aerial systems (UAS) and uncrewed surface vessels (USV). Capabilities center on sensing, attribution, decision support, and lawful response.

## 1. Remote-ID & Airspace Deconfliction Layer

- Ingest and decode Remote ID beacons per FAA Part 89 and ASTM F3411.
- Normalize fields (UAS ID, GPS, velocity, takeoff point, operator ID if present).
- Map to FRIA zones and local no-fly overlays.
- Correlate with ADS-B/UTM feeds to flag unknowns, policy violations, spoofing patterns, and misconfiguration vs. malicious intent.
- Graph model: `UAS` —[broadcasts]→ `RID_Message` —[within]→ `FRIA/airspace` —[conflicts_with]→ `Restriction`.

## 2. EW & GNSS Interference Intelligence

- Fuse field EW logs and sensor SDR summaries into GNSS/EW heatmaps and time-series “survivability scores.”
- Analyst workflows: "What jamming modes were active near Site X in the last 24h?" and "Which countermeasures degraded threat drones last week?"
- Rationale: frontline operations are an EW contest; tracking effects guides defense and planning.

## 3. UAS/USV Threat Taxonomy & TTP Graph

- Normalize platforms (airframe, link type, autonomy level, payload class, RID capability) and TTPs (ISR loiter, FPV strike, decoy, sea-skimming).
- Link sightings ↔ incidents ↔ suppliers to expose sustainment chokepoints and sanctionable nodes (“left-of-boom”).
- Align with emerging NATO C-UAS doctrine for interoperability tags.

## 4. Multi-Sensor Track Fusion (RF/EO-IR/Acoustic/Radar)

- Pluggable sensor adapters feed a track manager (JPDA/KF) to produce graph entities with confidence and provenance.
- Cross-cueing: RF hit → slew EO/IR; EO positive → elevate rule-based playbook.
- Policy guardrails ensure domestic operations escalate only to authorized C-UAS actors.

## 5. Countermeasure Playbook Orchestrator (Defensive, Non-Kinetic First)

- Configurable playbooks (detect → verify → notify → lawful response).
- Prioritize RF denial, spoof-resistant alerts, hardening, and safe holds; persist results for after-action review.
- Track cost-per-intercept and reload/energy timelines to favor low-cost options when multiple mitigations are available.

## 6. Counter-Swarm & Cost-Curve Simulator

- Agent-based simulation of mixed threats vs. layered defenses (RF effects, weather/LOS, power budgets, reload cycles).
- Outputs: probability of leakage, shots required, energy draw, recommended sensor/effector mix.
- Motivation: forces are pivoting to lasers/HPM to fix cost asymmetry; planning tools are needed prior to procurement.

## 7. Hardening & Deception Planner

- Generate vulnerability heatmaps for vehicles, depots, antenna farms.
- Recommend nets, overhead cover, smoke lanes, and realistic decoys to waste adversary munitions.
- Link decoy engagements back into simulator to quantify munition burn-down and saturation effects.

## 8. Maritime Annex (Counter-USV)

- Ingest AIS/NMEA, port CCTV/radar, and shoreline sensors to track small-craft anomalies and boom/barrier status.
- Include HPM/DE feasibility toggles in the simulator for port defense studies.

## 9. Directed-Energy/HPM Readiness Notebook (Policy-Aware)

- Catalog power, thermal, dwell-time, and weather limits (unclassified) and log live-fire test outcomes from partners.
- Auto-compute per-shot economics and availability vs. generators/ship power for planning.

## 10. Compliance, Chain-of-Custody, and Audit

- Immutable audit trail for every detection, correlation, and action (hash-chained logs).
- Rule packs for FAA Part 89, ASTM F3411 decoding validity, FRIA exceptions, and domestic response limits.

## Data Model & APIs (Starter)

**Core nodes:** `UAS`, `USV`, `RID_Message`, `Sensor_Hit`, `Track`, `Incident`, `Countermeasure`, `Playbook`, `Restriction`, `Operator_Attribution`, `Supplier`.

**Key relationships:**

- `UAS` —[observed_by]→ `Sensor_Hit` —[fused_into]→ `Track`
- `Track` —[involved_in]→ `Incident`
- `Incident` —[mitigated_by]→ `Countermeasure`
- `UAS` —[uses]→ `Link_Type`
- `UAS` —[supplied_by]→ `Supplier`

**APIs:**

- `POST /api/rid/ingest` (ASTM F3411 payloads)
- `POST /api/sensor/hit`
- `POST /api/track/fuse` → returns `track_id` + confidence
- `POST /api/playbook/evaluate` → recommended next action + legal flags
- `GET /api/ew/heatmap?bbox=&t=`
- `GET /api/sim/run` (threat mix, defenses, weather, ROE profile)

## Day 1–14 Implementation Plan

1. RID decoder + schema with FRIA overlays and Part-89 rule checks.
2. Sensor adapters (RF + EO/IR stubs) feeding Track Fusion service and IntelGraph store.
3. C-UAS playbook MVP: detect → verify → notify (no effectors) with policy guardrails.
4. EW heatmap MVP: ingest structured logs → tile server → UI overlay.
5. Counter-swarm sim (alpha): simple agent model + cost curves; surface leakage probability and cost-per-intercept.
6. Audit + chain-of-custody across all events and decisions.

## Ready-to-Paste Dev Prompts

### Prompt 1 — Remote ID / RID Ingest & Deconfliction

Implement a `rid-ingest` microservice that parses ASTM F3411 Broadcast RID frames and FAA Part-89 fields into a normalized schema (`UAS`, `RID_Message`, `FRIA`, `Restriction`). Provide `POST /api/rid/ingest` and `GET /api/rid/conflicts?bbox=&t=`. Validate beacons against Part 89 rules, mark FRIA exceptions, and emit graph edges in IntelGraph. Include unit tests with canned RID payloads and edge cases (stale timestamps, invalid GPS, spoofed altitude). Render a web map overlay (vector tiles) for RID points and conflict badges.

### Prompt 2 — Sensor Fusion + Track Manager

Build a track-fusion service that consumes `Sensor_Hit` events (RF/EO/IR/acoustic/radar) and maintains tracks using JPDA/Kalman filters. Each fused `Track` carries confidence, velocity, and provenance. Expose `POST /api/track/fuse` and `GET /api/track/:id`. Implement cross-cue rules: RF → EO slew tasking hooks. Persist all to IntelGraph with audit stamps.

### Prompt 3 — EW & GNSS Effects Map

Create an `ew-effects` service that ingests structured EW logs and outputs time-windowed heatmaps and survivability scores for blue assets. Provide `GET /api/ew/heatmap` and a dashboard showing “jamming intensity vs mission success.” Wire to incidents so analysts can correlate EW intensity with threat outcomes.

### Prompt 4 — Counter-Swarm Simulator

Implement an agent-based simulator that takes a threat mix (counts/types/approach vectors) and a defense stack (RF denial, kinetic interceptors, DE/HPM placeholders, hardening). Model energy/reload/time-to-engage constraints and weather penalties; output leakage probability, intercept counts, and cost-per-shot. Provide `POST /api/sim/run` and a simple UI with scenario presets (“Port,” “FOB,” “Convoy”).

### Prompt 5 — Playbook Orchestrator (Policy-Aware)

Build a playbook engine that runs defensive, non-kinetic-first flows: detect → verify → notify → (optionally) hand-off to authorized responders. Encode legal guardrails for domestic ops (no unlawful effectors; escalate to approved authorities; log everything). Provide `POST /api/playbook/evaluate` returning the next safe action and required approvals.

### Prompt 6 — Maritime Annex (Counter-USV)

Add an `ais-fuser` that ingests AIS/NMEA and shoreline sensors; detect small-craft anomalies near restricted zones and model barrier/boom status. Output tracks and policy-gated hand-offs to responders.
