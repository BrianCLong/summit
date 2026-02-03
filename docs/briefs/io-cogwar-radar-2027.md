# IO/CogWar Radar 2027 — Summit/IntelGraph One-Pager

**Status:** Draft for controlled review
**Scope:** Defensive early-warning and integrity analytics only (no influence automation).
**Authority Anchors:** Summit Readiness Assertion and governance invariants remain binding.

## Purpose

Add a **defensive CogWar Radar** module that ingests narrative signals and incident data, computes reproducible cognitive-instability metrics, and renders a trust/narrative-integrity panel. This is **defensive-only**: no targeting, persuasion, or automation of influence operations.

## Evidence Bundle (UEF / ITEM grounding)

* **ITEM:CLAIM-01 (CogWar is behavior-centric / cognitive terrain).** “Contemporary conflict is increasingly behavior-centric… decisive terrain… how individuals and groups perceive, interpret, decide, and act.” (Institute for National Strategic Studies)
* **ITEM:CLAIM-02 (Move to measurement: cognitive instability indicators).** Cognitive entropy index + superposition tension index; identify areas of cognitive instability before breakdown. (Polytechnique Insights)
* **ITEM:CLAIM-03 (AI is double-edged: offense + defense, online harms).** AI can aid detection/defense/response, but risks “data leaks, cyberattacks and online harms… if… misused.” (World Economic Forum)
* **ITEM:CLAIM-04 (AI accelerates micro-targeting + cognitive isolation; also enables modeling).** “Accelerates… micro-targeting and cognitive isolation… [and] model… detection of artificial flows, simulation of information propagation…” (Polytechnique Insights)
* **ITEM:CLAIM-05 (Space backbone as contested “hack-proof” info infra).** HSA aims at a “hack-proof internet in space… to underpin… CJADC2.” (Breaking Defense)
* **ITEM:CLAIM-06 (HSA pilot by 2026).** “Create an operational pilot communications architecture by 2026.” (DefenseScoop)
* **ITEM:CLAIM-07 (Cognitive warfare targets perception/decision-making, below armed violence threshold).** Adversaries target “perception, behaviour, and decision-making… rather than territory alone… below the threshold of armed violence.” (sararussoresearch.substack.com)
* **ITEM:CLAIM-08 (NATO STO framing: emerging tech + info ops + psych influence; S&T countermeasures).** Report examines how emerging tech/info ops/psych influence reshape warfare and how S&T can counter it. (LinkedIn)

## Summit Fit — Defensive Capability Delta

Summit already exhibits IntelGraph analytics, connectors, governance flags, and audit emphasis. The delta is a **first-class cognitive-ops defensive layer**:

* Narrative/claim/evidence data model and ontology.
* Time-series narrative dispersion and entropy metrics (reproducible).
* Defensive governance (deny-by-default exports).
* Correlation with cyber + infrastructure + space backbone events.

## Minimal Winning Slice (MWS)

**MWS statement:** Add a defensive CogWar Radar module that ingests narrative signals + incidents, computes reproducible cognitive-instability metrics, and renders a trust/narrative-integrity panel—feature-flagged **OFF** by default.

**Acceptance tests (deterministic):**

1. `summit cogwar ingest --input fixtures/cogwar/sample_bundle.jsonl --out out/ingest_report.json` produces deterministic IDs and normalized entities.
2. `summit cogwar metrics --in out/graph.json --out out/metrics.json` includes:
   * `narrative_entropy_index`
   * `superposition_tension_index`
   * `artificial_flow_score`
3. `summit cogwar report --in out/metrics.json --out out/report.json` is deterministic (no unstable timestamps).
4. **Deny-by-default policy**: any “targeting segmentation export” route returns `403` unless `COGWAR_DEFENSE_MODE=on` **and** caller is in an allowlisted role.

## Governance Guardrails (Defensive-Only)

* **Default OFF** via `feature.cogwar_radar`.
* **Deny-by-default** on any export that could resemble targeting or persuasion tooling.
* **Never-log list** for PII; redact emails/phones in fixtures and logs.
* **No direct offensive automation** (non-goal): no targeting segments, no message generation, no influence orchestration.

## Deterministic Artifacts (Evidence-First)

* `out/metrics.json`
* `out/report.json`
* `out/stamp.json` (git SHA + config hash, no wall-clock time)

Evidence ID pattern: `EVID:COGWAR:<kind>:<stable_hash>` (stable hash over canonical JSON).

## Threat-Informed Requirements (Defensive Posture)

| Threat | Mitigation | Gate | Test |
| --- | --- | --- | --- |
| Export misuse (targeting) | Deny-by-default policy; allowlist role + defense mode | Policy tests | `403` unless explicitly enabled |
| Prompt injection / poisoning | Treat text as untrusted; strict parsers; no tool execution | Security lint/tests | Injection strings do not alter outputs |
| PII leakage | Redaction + never-log rules | Regression tests | Logs contain no emails/phones |
| Metric gaming | Multi-signal scoring + anomaly detection | Unit tests | Manipulated fixture raises `artificial_flow_score` |

## MAESTRO Security Alignment

**MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.

**Threats considered:** prompt injection, poisoned narratives, PII leakage, metric manipulation, misuse of analytics for offensive targeting.

**Mitigations:** strict parsers, no tool execution on text, redaction, audit-only exports, deny-by-default policy, deterministic artifacts, audit logging, PII redaction.

## Roll-Forward Plan (Feature-Flagged)

1. Ship behind `feature.cogwar_radar` (default OFF).
2. Enable in internal/staging with synthetic fixtures only.
3. Add production enablement checklist + monitoring, then gradual org rollout.

## Accountability

Evidence artifacts and audit logs remain mandatory for any enablement. Alert on metric spikes, source outages, and determinism drift (fixture re-runs against golden outputs).

## Positioning Constraints

* **Allowed claims:** reproducible narrative integrity indicators (entropy/tension) and correlation views for investigations; defensive governance (deny-by-default exports + auditability).
* **Deferred pending governance review:** any automated persuasion, counter-messaging, or neurotech modulation.

## PR Stack (Max 6 PRs)

1. **Ontology + evidence ID spec**
2. **Ingest + normalization (CLI)**
3. **Metrics + determinism harness**
4. **Detection (defensive-only)**
5. **Governance + data-handling docs**
6. **Ops pack + drift detector**
