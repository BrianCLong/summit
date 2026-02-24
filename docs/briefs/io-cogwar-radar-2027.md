# IO/CogWar Radar 2027 — Summit/IntelGraph One‑Pager

**Status:** Draft for controlled review
**Scope:** Defensive early‑warning and integrity analytics only (no influence automation).
**Authority Anchors:** Summit Readiness Assertion and governance invariants remain binding.

## Evidence Bundle (UEF)

**ITEM:CLAIM-01 (CogWar is behavior‑centric / cognitive terrain).** “Contemporary conflict is increasingly behavior‑centric… decisive terrain… how individuals and groups perceive, interpret, decide, and act.” (Institute for National Strategic Studies)

**ITEM:CLAIM-02 (Move to measurement: cognitive instability indicators).** Cognitive entropy index + superposition tension index; identify areas of cognitive instability before breakdown. (Polytechnique Insights)

**ITEM:CLAIM-03 (AI is double‑edged: offense + defense, online harms).** AI can aid detection/defense/response, but risks “data leaks, cyberattacks and online harms… if… misused.” (World Economic Forum)

**ITEM:CLAIM-04 (AI accelerates micro‑targeting + cognitive isolation; also enables modeling).** “Accelerates… micro‑targeting and cognitive isolation… [and] model… detection of artificial flows, simulation of information propagation…” (Polytechnique Insights)

**ITEM:CLAIM-05 (Space backbone as contested “hack‑proof” info infra).** HSA aims at a “hack‑proof internet in space… to underpin… CJADC2.” (Breaking Defense)

**ITEM:CLAIM-06 (HSA pilot by 2026).** “Create an operational pilot communications architecture by 2026.” (DefenseScoop)

**ITEM:CLAIM-07 (Cognitive warfare targets perception/decision‑making, below armed violence threshold).** Adversaries target “perception, behaviour, and decision‑making… rather than territory alone… below the threshold of armed violence.” (sararussoresearch.substack.com)

**ITEM:CLAIM-08 (NATO STO framing: emerging tech + info ops + psych influence; S&T countermeasures).** Report examines how emerging tech/info ops/psych influence reshape warfare and how S&T can counter it. (LinkedIn)

## Summit Fit: Present Capability Signals → Required Additions

**Present capability signals (asserted):** Summit is certified for controlled deployments with governed ingestion, provenance, orchestration, and policy enforcement under the Readiness Assertion.

**Required additions for CogWar Radar (defensive only):**
- Narrative/claim/evidence ontology and deterministic evidence IDs.
- Reproducible cognitive‑instability metrics (entropy + tension) and “artificial flow” detectors.
- Governance guardrails: deny‑by‑default, defense‑only exports, rights‑preserving defaults.
- Hybrid‑campaign correlation: narratives ↔ cyber incidents ↔ space/C2 disruptions.

## Minimal Winning Slice (MWS)

**MWS:** Add a defensive CogWar Radar module that ingests narrative signals + incidents, computes reproducible cognitive‑instability metrics, and renders a “trust / narrative integrity” panel—feature‑flagged OFF by default.

**Acceptance Tests (deterministic):**
1. `summit cogwar ingest --input fixtures/cogwar/sample_bundle.jsonl --out out/ingest_report.json` produces deterministic IDs + normalized entities.
2. `summit cogwar metrics --in out/graph.json --out out/metrics.json` includes:
   - `narrative_entropy_index`
   - `superposition_tension_index`
   - `artificial_flow_score`
3. `summit cogwar report --in out/metrics.json --out out/report.json` is deterministic (no unstable timestamps).
4. Policy tests prove **deny‑by‑default** for any “targeting segmentation export,” requiring `COGWAR_DEFENSE_MODE=on` and an allowlisted role.

## Standards & Determinism

- **Evidence ID pattern:** `EVID:COGWAR:<kind>:<stable_hash>` (stable hash over canonical JSON).
- **Deterministic artifacts:** `out/report.json`, `out/metrics.json`, `out/stamp.json` (git SHA + config hash; no wall‑clock time).
- **Governed Exception posture:** Legacy gaps are tracked as governed exceptions, not defects.

## Governance & Security Posture (Defensive‑Only)

- **Default OFF:** `feature.cogwar_radar` gate.
- **Deny‑by‑default:** export of targeting segments blocked unless defense mode + allowlist.
- **Never‑log:** raw identifiers, tokens, full message bodies beyond configurable limits.
- **Rights‑preserving defaults:** no persuasion tooling; no audience manipulation features.

## MAESTRO Threat Modeling (Required)

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection, poisoned narratives, PII leakage, misuse of analytics for offensive targeting.
- **Mitigations:** strict parsers; no tool execution on text; redaction; audit‑only exports; deny‑by‑default gating; deterministic outputs with reproducible fixtures.

## Rollout & Monitoring

- **Roll‑forward:** ship behind feature flag → enable in internal/staging with synthetic fixtures → production enablement checklist → gradual rollout.
- **Monitoring:** alert on metric spikes, source outages, and determinism drift (fixture re‑runs against golden outputs).
- **Accountability:** evidence artifacts and audit logs remain mandatory for any enablement.

## Positioning Constraints

- **Allowed claims:** “Reproducible narrative‑integrity indicators and correlation views for investigations,” “defensive governance and auditability.”
- **Deferred claims:** automated persuasion, counter‑messaging, or neuro‑modulation capabilities (intentionally constrained).

## Decisions & Next Actions

- **Decision:** Proceed with a 6‑PR stack (ontology → ingest → metrics → detection → governance → ops) under defensive‑only scope.
- **Action:** Validate repo layout, feature flag system, and CI gates before implementation.
