# Narrative Signals Integration Plan (NAIO)

**Status:** Draft (Governed Exception-free)
**Disposition:** INTEGRATE
**Mode:** Reasoning (analysis-focused)

## Summit Readiness Assertion (Escalated)
This plan operates under the active Summit Readiness Assertion. Any deviations are managed as
**Governed Exceptions** and must be explicitly recorded in governance artifacts.

## Evidence Bundle (UEF)
- **Item Type:** Research synthesis / analyst update (user-supplied, no primary citations).
- **Primary Claim:** IO optimized for durability and plausibility can bypass detectors focused on
  virality/falsehood/coordination.
- **Grounded Sources (public references):**
  1. Narrative/framing central in disinformation research.
  2. Information laundering / migration.
  3. Narrative networks and actor influence as graphs.
  4. Narrative-centric disinformation emphasis.
  5. Resilience framing in policy literature.

## 7th+ Order Implications (Compressed)
1. **Detection Shift:** From burst detection to **transition detection** (seeding density, handoffs,
   credibility-tier migration, durability).
2. **Evaluation Shift:** From accuracy-only to **lead-time + durability metrics**.
3. **Governance Shift:** Evidence artifacts become first-class outputs for every signal.
4. **Threat Shift:** Adversaries optimize for slow-burn plausibility, requiring **register shift** and
   **role trajectory** tracking.
5. **Architecture Shift:** Event-sourced narrative ledger with deterministic replay becomes a core
   dependency for audit and rollback.
6. **Ops Shift:** Feature-flagged, risk-scored rollout with drift monitors per signal.
7. **Product Shift:** Analyst experience pivots to **explainable transitions**, not spikes.

## MAESTRO Threat Modeling Alignment
- **MAESTRO Layers:** Data, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection, goal manipulation, tool abuse, adversarial probing,
  seeding flood, credibility laundering.
- **Mitigations:** tenant isolation, deterministic evidence artifacts, rate limiting, audit logging,
  role-trajectory privacy partitions, offline replay for verification.

---

# Full Architecture

## Module Boundaries (PR Stack)
- **PR-1: Evidence & Schema Scaffolding**
  - `schemas/narrative_signal_event.schema.json`
  - `schemas/narrative_handoff_event.schema.json`
  - `libs/evidence_writer/` (report/metrics/stamp)
  - `ci/check_schemas.py`
  - `tests/test_evidence_writer_determinism.py`
- **PR-2: Origin Density Detector (v0)**
  - `libs/origin_density/cluster.py`
  - `pipelines/narrative_features/origin_density_job.py`
  - `evals/narrative_signals/eval_origin_density.py`
  - `tests/test_origin_density_invariance.py`
- **PR-3: Comparative Frame Detector (v0)**
  - `libs/frame_semantics/comparative_frames.py`
  - `libs/frame_semantics/process_critique.py`
  - `evals/narrative_signals/eval_comparative_frames.py`
  - `tests/test_comparative_frame_precision_baseline.py`
- **PR-4: Register Shift + Handoff Detection (v0)**
  - `libs/register_shift/shift.py`
  - `libs/narrative_handoff/detect.py`
  - `evals/narrative_signals/eval_handoff.py`
  - `runbooks/handoff-alerts.md`
- **PR-5: Robustness / Stress-Testing Harness (offline)**
  - `libs/narrative_stress/stressors.py`
  - `libs/narrative_stress/robustness_metrics.py`
  - `evals/narrative_signals/eval_robustness.py`
  - `tests/test_robustness_metric_determinism.py`

## Event Sourcing & Determinism
- **Narrative Ledger:** Append-only event log of `NarrativeSignalEvent` and `NarrativeHandoffEvent`.
- **Determinism Strategy:** fixed seeds, stable sorting, canonical tokenization, pinned dependencies,
  recorded model versions, and evidence stamps.
- **Offline Replay:** deterministic replay of narrative event streams, producing identical evidence
  artifacts for audit and regression.

## Core Data Objects
- **Narrative** = `(topic cluster, frame labels, canonical claims/questions, load-bearing assumptions)`
- **ActorRole** = time-series over `(seeder, amplifier, legitimizer, explainer, debunker-targeter, procedural critic)`
- **HandoffEvent** = `(source-tier transition, register shift score, audience overlap score, time)`

## Dependency Graph (High-level)
```
Ingest -> Narrative Cluster -> Signal Extractors -> Evidence Writer -> Ledger
         |                                  |          |
         |                                  +-- Evals  +-- Metrics/Stamp
         +-- Actor Graph -----------------------> Handoff Detector
```

## PR Review Checklist (Per PR)
- Evidence artifacts present and deterministic.
- Schema validation gate passes.
- Unit tests and eval harness scripts present.
- Feature flags wired for rollout.
- Runbooks updated for any alerting behavior.

---

# Implementation (All Files)
> **Scope:** Planning-only. Implementation staged by PR-1..PR-5 above.

---

# Tests
- **Required:** deterministic unit tests for evidence writer, origin density invariance, robustness
  metric determinism.
- **Golden Path:** `make smoke` must remain green before merge.

---

# Documentation
- **Runbooks:** origin density, handoff alerts, comparative frames.
- **Analyst Guide:** evidence bundle interpretation per alert.

---

# CI/CD
- Schema validation gate in CI.
- Evidence artifact checks in CI for each PR.
- Determinism verification for eval scripts.

---

# PR Package (Template)
- **Title:** `feat(narrative-signals): <scope>`
- **Why:** Shift detection to durable, transition-oriented IO signals.
- **How:** Deterministic signal extraction + evidence artifacts.
- **Risks:** False positives on register shift; mitigated via calibrations + lead-time gating.
- **Rollback:** disable feature flags and remove ledger events after audit.
- **Confidence:** 0.62 (basis: literature + internal heuristics; upgraded post-evals).
- **Post-deploy window:** 14 days with drift monitoring.

---

# Future Roadmap (Forward-Leaning Enhancement)
- **Narrative Digital Twin:** replayable narrative evolution with counterfactual forks.
- **Multi-modal Handoff:** combine text register shift + URL taxonomy + outlet credibility tiers.
- **Role-Trajectory Library:** privacy-preserving cross-tenant role pathway analytics.

**Finality:** This plan is complete and ready for execution under governance constraints.
