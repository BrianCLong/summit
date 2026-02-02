# 2027 IO/CogWar Radar Brief (Summit/IntelGraph)

## Executive intent (defensive-only)

Summit will ship a **defensive, evidence-first “CogWar Radar” module** that detects narrative
instability, synthetic credibility risks, and hybrid campaign correlations without enabling
influence automation. The module remains **feature-flagged OFF by default** and enforces
**deny-by-default export controls**. The focus is early warning, reproducible measurement, and
investigation-ready evidence packaging.

## Ground-truth anchors (ITEM recap)

* **Cognitive terrain is behavior-centric** and increasingly decisive in modern conflict.
* **Cognitive instability indicators** (entropy + tension indices) can reveal early breakdowns.
* **AI is dual-use** (defense + online harms), demanding governance controls.
* **AI enables micro-targeting + modeling** of narrative flows and detection.
* **Hybrid/space backbone risks** (CJADC2) demand correlation with cyber + infra events.
* **Cognitive warfare below armed-violence thresholds** requires defensive posture.

## Summit fit (capabilities + gaps)

**Existing strengths**
* IntelGraph-style graph analytics + investigation workflows.
* Connectors for ingest (HTTP/CSV) and provenance-ready analysis.
* Governance flags + audit logging patterns.

**Gap to close**
* A first-class **narrative security layer**:
  * narrative/claim/evidence model
  * cognitive stability metrics
  * defensive-only governance posture
  * cross-domain correlation (narratives ↔ cyber ↔ infra/space)

## Minimal Winning Slice (MWS)

**MWS sentence**
*Add a defensive CogWar Radar module that ingests narrative signals + incidents, computes
reproducible cognitive-instability metrics, and renders a “trust / narrative integrity” panel—
feature-flagged OFF by default.*

**Acceptance tests (exact)**
1. `summit cogwar ingest --input fixtures/cogwar/sample_bundle.jsonl --out out/ingest_report.json`
   produces deterministic IDs + normalized entities.
2. `summit cogwar metrics --in out/graph.json --out out/metrics.json` includes:
   * `narrative_entropy_index`
   * `superposition_tension_index`
   * `artificial_flow_score`
3. `summit cogwar report --in out/metrics.json --out out/report.json` is deterministic (no unstable
   timestamps).
4. Policy tests prove **deny-by-default**: any “targeting segmentation export” route returns `403`
   unless `COGWAR_DEFENSE_MODE=on` AND an allowlisted role.

## Guardrails (non-negotiables)

* **Defensive-only.** No influence automation, targeting, or counter-messaging tooling.
* **Feature-flag OFF** by default (`feature.cogwar_radar`).
* **Safe failures**: no background ingestion without explicit opt-in.
* **Determinism**: stable IDs, reproducible metrics, no wall-clock time in artifacts.

## Evidence & determinism standards

* **Evidence ID pattern**: `EVID:COGWAR:<kind>:<stable_hash>`
* **Deterministic artifacts**:
  * `out/ingest_report.json`
  * `out/metrics.json`
  * `out/report.json`
  * `out/stamp.json` (git SHA + config hash; no timestamps)

## Governance posture

* **Deny-by-default exports** for any segmentation or targeting route.
* **Rights-preserving defaults** (no raw PII persistence, redact or omit where possible).
* **Auditability**: source URLs, hashes, transforms recorded as evidence.

## Threat-informed requirements (defensive posture)

| Threat | Mitigation | Gate | Test |
| --- | --- | --- | --- |
| Misuse for offensive targeting | deny-by-default exports | policy tests | 403 unless defense mode + role | 
| Prompt injection / poisoned narratives | treat text as untrusted; no tool execution | security lint + tests | fixture with injection has no effect |
| PII leakage | redact + never-log list | regression tests | logs exclude emails/phones |
| Metric gaming | multi-signal scoring | unit tests | manipulated fixture raises score |

## PR stack (max 6, sequential)

1. **Ontology + evidence ID spec** (docs + types)
2. **Ingest + normalization** (CLI + fixtures)
3. **Metrics** (entropy + tension + determinism harness)
4. **Detection** (flow anomalies + coordination hints)
5. **Governance** (deny-by-default + feature flags + security docs)
6. **Ops** (drift detector + runbooks + SLOs)

## Positioning constraints

**Allowed claims (after MWS)**
* “Reproducible narrative integrity indicators + investigation-ready evidence.”
* “Defensive governance with deny-by-default exports + auditability.”

**Deferred claims**
* Any automated persuasion/counter-messaging.
* Neurotech or psychometric manipulation tooling.

## Success rubric (Definition of Done ≥ 20/25)

* Determinism (5)
* Machine-verifiability (5)
* Mergeability (5)
* Security posture (5)
* Measured advantage (5)

## Operational readiness

* **Monitoring**: daily drift detector on pinned fixtures.
* **Alerts**: metric spike, source outage, determinism regression.
* **Roll-forward**: feature-flag ON only in controlled staging → gradual rollout.
