# IO/CogWar Radar 2027 (Summit/IntelGraph Brief)

## Readiness Escalation (Summit Assertion)

This brief is aligned with the Summit Readiness Assertion and the governance expectations
codified in `docs/SUMMIT_READINESS_ASSERTION.md`. The intent is to keep the golden path green
while introducing a defensive-only cognitive security layer. The work is intentionally
constrained to documentation until code-level gates, policy wiring, and evidence bundles are
in place.

## Purpose (Why Now)

Summit already supports investigation workflows, analytics, provenance, and connectors.
The IO/CogWar radar expands the defensive posture with early-warning indicators for
narrative flows, synthetic credibility signals, and cross-domain correlation (cyber +
information + space/C2 disruptions). This creates a forward radar for cognitive stability
without enabling offensive influence automation.

## Scope (Defensive-Only)

**In-scope:**

- Narrative integrity indicators (entropy, tension, artificial flow score).
- Defensive governance defaults (deny-by-default, feature-flagged).
- Deterministic, reproducible evidence artifacts.
- Correlation views across narrative + cyber + space/C2 incidents.

**Out-of-scope:**

- Audience segmentation export.
- Counter-messaging or persuasion tooling.
- Any offensive targeting automation.

## Minimal Winning Slice (MWS)

**MWS statement:** Add a defensive CogWar Radar module that ingests narrative signals and
incident data, computes reproducible cognitive-instability metrics, and renders a
trust/narrative-integrity panel—feature-flagged OFF by default.

**Acceptance tests (deterministic):**

1. `summit cogwar ingest --input fixtures/cogwar/sample_bundle.jsonl --out out/ingest_report.json`
   produces deterministic IDs and normalized entities.
2. `summit cogwar metrics --in out/graph.json --out out/metrics.json` includes:
   - `narrative_entropy_index`
   - `superposition_tension_index`
   - `artificial_flow_score`
3. `summit cogwar report --in out/metrics.json --out out/report.json` is byte-identical on repeat.
4. Policy tests prove deny-by-default: any targeting segmentation export returns `403` unless
   `COGWAR_DEFENSE_MODE=on` and role is allowlisted.

## Evidence & Determinism Standards

- **Evidence ID pattern:** `EVID:COGWAR:<kind>:<stable_hash>` (hash over canonical JSON).
- **Deterministic artifacts:**
  - `out/report.json`
  - `out/metrics.json`
  - `out/stamp.json` (git SHA + config hash only; no wall-clock time)

## Governance Defaults

- Defensive-only policy hooks.
- Deny-by-default export controls.
- Feature flag `feature.cogwar_radar` defaults OFF.
- Never-log list enforced for PII and raw message bodies beyond configured limits.

## Standards & Interop

| Interface | Import | Export | Non-goals |
| --- | --- | --- | --- |
| HTTP/CSV connector | narrative events, incident logs | normalized entities | ad-targeting audiences |
| Graph model | claim/evidence relationships | investigation-ready subgraph | campaign automation |
| Provenance ledger | source URLs, hashes, transforms | signed evidence refs | storing raw PII |
| UI dashboards | metrics time-series | reports, alerts | persuasion tooling |

## Risk Controls (Threat-Informed)

1. **Threat:** Offensive targeting misuse
   **Mitigation:** deny-by-default export; policy tests
2. **Threat:** Prompt injection and poisoned narratives
   **Mitigation:** strict parsers, untrusted text handling, log sanitization
3. **Threat:** PII leakage
   **Mitigation:** redaction + never-log tests
4. **Threat:** Metric gaming
   **Mitigation:** multi-signal scoring + anomaly detection on burstiness

## MAESTRO Alignment (Required)

- **MAESTRO Layers:** Data, Agents, Tools, Observability, Security
- **Threats Considered:** prompt injection, misuse of exports, PII leakage, metric gaming
- **Mitigations:** deny-by-default policy gates, deterministic artifacts, sanitization, anomaly
  detection, audit logging

## Roll-forward Plan

1. Ship behind `feature.cogwar_radar` (OFF by default).
2. Enable in internal/staging with synthetic fixtures only.
3. Add production enablement checklist + monitoring.
4. Gradual org rollout with guardrails and audit evidence.

## Positioning (Defensive)

- “We compute reproducible narrative integrity indicators (entropy/tension) and correlation views
  for investigations.”
- “We ship defensive governance: deny-by-default exports + auditability.”

## Forward-leaning Enhancement (Post-MWS)

Introduce a **deterministic provenance stamp** that can be embedded in exported reports as a
C2PA-style manifest, enabling verifiable integrity checks without embedding PII. This strengthens
chain-of-custody while preserving defensive-only constraints.

## Sources (Ground Truth Capture)

- INSS: Cognitive warfare as behavior-centric terrain (NATO Chief Scientist report).
- Polytechnique Insights: cognitive entropy + superposition tension indices; AI accelerates
  micro-targeting and enables modeling of information propagation.
- World Economic Forum: AI is double-edged—defense and online harms when misused.
- Breaking Defense / DefenseScoop: HSA space backbone with 2026 pilot timeline.
- NATO STO framing: emerging tech + info ops + psych influence; S&T countermeasures.
