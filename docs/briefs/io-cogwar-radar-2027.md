# IO/CogWar Radar 2027 — Summit/IntelGraph One-Pager

## Readiness alignment

This brief aligns to the **Summit Readiness Assertion** and the governance canon; delivery and claims are constrained by existing standards and evidence-first policy.

## Purpose

Add a **defensive CogWar Radar** module that ingests narrative signals and incident data, computes reproducible cognitive-instability metrics, and renders a trust/narrative-integrity panel. This is **defensive-only**: no targeting, persuasion, or automation of influence operations.

## ITEM grounding (sources)

* **Behavior-centric cognitive terrain**: conflict is increasingly behavior-centric; decisive terrain is perception/decision/action. (INSS)
* **Cognitive instability indicators**: entropy + superposition tension indices identify instability before breakdown. (Polytechnique Insights)
* **AI is dual-use**: defenses and detection, but also online harms if misused. (WEF)
* **AI accelerates micro-targeting + enables flow detection and propagation modeling**. (Polytechnique Insights)
* **Space backbone as contested, “hack-proof” info infrastructure** underpinning CJADC2. (Breaking Defense)
* **HSA pilot by 2026** for operational comms architecture. (DefenseScoop)
* **Cognitive warfare below armed violence threshold** targeting perception/decision-making. (Sararusso Research)
* **NATO STO framing**: emerging tech + info ops + psych influence; S&T countermeasures. (LinkedIn)

## Summit fit — defensive capability delta

Summit already exhibits IntelGraph analytics, connectors, governance flags, and audit emphasis. The delta is a **first-class cognitive-ops defensive layer**:

* Narrative/claim/evidence data model
* Time-series narrative dispersion and entropy metrics
* Defensive governance (deny-by-default exports)
* Correlation with cyber + infrastructure + space backbone events

## Minimal Winning Slice (MWS)

**MWS statement:** Add a defensive CogWar Radar module that ingests narrative signals + incidents, computes reproducible cognitive-instability metrics, and renders a trust/narrative-integrity panel—feature-flagged **OFF** by default.

**Acceptance tests:**

1. `summit cogwar ingest --input fixtures/cogwar/sample_bundle.jsonl --out out/ingest_report.json` produces deterministic IDs and normalized entities.
2. `summit cogwar metrics --in out/graph.json --out out/metrics.json` includes:
   * `narrative_entropy_index`
   * `superposition_tension_index`
   * `artificial_flow_score`
3. `summit cogwar report --in out/metrics.json --out out/report.json` is deterministic (no unstable timestamps).
4. **Deny-by-default policy**: any “targeting segmentation export” route returns `403` unless `COGWAR_DEFENSE_MODE=on` **and** caller is in an allowlisted role.

## Governance guardrails (defensive-only)

* **Default OFF** via `feature.cogwar_radar`.
* **Deny-by-default** on any export that could resemble targeting or persuasion tooling.
* **Never-log list** for PII; redact emails/phones in fixtures and logs.
* **No direct offensive automation** (non-goal): no targeting segments, no message generation, no influence orchestration.

## Deterministic artifacts (evidence-first)

* `out/metrics.json`
* `out/report.json`
* `out/stamp.json` (git SHA + config hash, no wall-clock time)

Evidence ID pattern: `EVID:COGWAR:<kind>:<stable_hash>` (stable hash over canonical JSON).

## Threat-informed requirements (defensive posture)

| Threat | Mitigation | Gate | Test |
| --- | --- | --- | --- |
| Export misuse (targeting) | Deny-by-default policy; allowlist role + defense mode | Policy tests | `403` unless explicitly enabled |
| Prompt injection / poisoning | Treat text as untrusted; strict parsers; no tool execution | Security lint/tests | Injection strings do not alter outputs |
| PII leakage | Redaction + never-log rules | Regression tests | Logs contain no emails/phones |
| Metric gaming | Multi-signal scoring + anomaly detection | Unit tests | Manipulated fixture raises `artificial_flow_score` |

## Interop matrix (defensive only)

| Interface | Import | Export | Non-goals |
| --- | --- | --- | --- |
| HTTP/CSV connector | Narrative events, incident logs | Normalized entities | Ad-targeting audiences |
| Graph model | Claim/evidence relationships | Investigation-ready subgraph | Campaign automation |
| Provenance ledger | Source URLs, hashes, transforms | Signed evidence refs | Raw PII storage |
| UI dashboards | Metrics time-series | Reports, alerts | Persuasion tooling |

## MAESTRO security alignment

**MAESTRO Layers:** Data, Agents, Tools, Observability, Security.

**Threats considered:** prompt injection, tool abuse, data exfiltration, metric manipulation.

**Mitigations:** strict parsers, deny-by-default policy, deterministic artifacts, audit logging, PII redaction.

## Roll-forward plan (feature-flagged)

1. Ship behind `feature.cogwar_radar` (default OFF).
2. Enable in internal/staging with synthetic fixtures only.
3. Add production enablement checklist + monitoring, then gradual org rollout.

## Positioning constraints

* **Allowed claims:** reproducible narrative integrity indicators (entropy/tension) and correlation views for investigations; defensive governance (deny-by-default exports + auditability).
* **Deferred pending governance review:** any automated persuasion, counter-messaging, or neurotech modulation.

## PR stack (max 6 PRs)

1. **Ontology + evidence ID spec**
2. **Ingest + normalization (CLI)**
3. **Metrics + determinism harness**
4. **Detection (defensive-only)**
5. **Governance + data-handling docs**
6. **Ops pack + drift detector**

## Forward-leaning enhancement (defensive-only)

Introduce a **causal drift ledger** that records metric deltas alongside evidence hashes, enabling reproducible “why the metric changed” audits without storing raw PII.
