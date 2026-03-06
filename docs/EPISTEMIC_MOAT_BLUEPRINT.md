# Epistemic Moat Blueprint: Engines + Immune System

## Summit Readiness Assertion

This blueprint establishes epistemic infrastructure as a first-class product surface for Summit: evidence-grounded claims, governed belief updates, and containment of narrative-borne contamination before it mutates the Reality Graph.

## MAESTRO Alignment

- **MAESTRO Layers:** Data, Agents, Tools, Observability, Security.
- **Threats Considered:** Narrative injection, provenance spoofing, cross-graph contamination (NG/BG -> RG), write-path tool abuse.
- **Mitigations:** Graph write firewall, quarantine disposition, deterministic challenge protocols, auditable decision artifacts.

## Core Thesis

The moat is not model size. The moat is **knowledge validity over time**:

- what is known,
- how it is known,
- confidence and contradictions,
- provenance and revision history.

This defines a compounding asset competitors cannot clone quickly: epistemic memory.

## Tri-Graph Authority Model

- **Reality Graph (RG):** evidence-backed claims only; strongest provenance standards.
- **Belief Graph (BG):** actor belief states; must reference claims.
- **Narrative Graph (NG):** diffusion and influence dynamics; non-authoritative for factual writes.
- **Quarantine Graph (QG):** containment plane for suspicious writes.

### Mandatory Write Rules

1. Claims MUST cite at least one evidence artifact.
2. Evidence MUST include minimum provenance fields.
3. NG/BG writes MUST NOT mutate RG directly.
4. Belief updates MUST reference one or more claims.

## Epistemic Engine Set (Continuous Reasoning)

Each engine is single-purpose and writes only through `WriteSet` envelopes.

1. **Claim Verification Engine**
   - Scores support vs contradiction.
   - Produces confidence deltas and missing-evidence prompts.
2. **Contradiction Engine**
   - Adds explicit contradiction edges for incompatible claims.
3. **Narrative Injection Detector**
   - Detects high-diffusion / low-evidence patterns.
4. **Belief Update Engine**
   - Applies traceable belief updates from claim-state changes.

## Epistemic Immune System (EIS)

EIS upgrades the platform from self-updating to self-protecting.

### Control Loop

1. **Detect:** sentinel signals on every candidate write.
2. **Quarantine:** route suspicious writes to QG with disposition metadata.
3. **Challenge:** run corroboration and provenance challenge protocols.
4. **Heal:** reintegrate (allow) or suppress (reject), with inoculation memory.

### Standard Dispositions

- `allow`
- `allow_with_flags`
- `quarantine`
- `reject`

All outcomes must emit a structured report (`signals_triggered`, `missing_requirements`, `recommended_next_evidence`, impacted artifacts).

## Summit-Native Module Boundaries

- `epistemics/firewall` — schema + semantic write policy.
- `epistemics/sentinels` — burst/provenance/coordination detectors.
- `epistemics/quarantine` — case store and lifecycle.
- `epistemics/challenges` — adaptive verification workflows.
- `epistemics/immune-dashboard` — operator visibility and control.

## Decision Reversibility and Auditability

- Every quarantine/allow/reject action must be reproducible from the persisted WriteSet and deterministic scoring policy version.
- Every decision must define rollback triggers and reconciliation steps.
- All evidence-bearing actions remain human-reviewable and linked to provenance.

## Delivery Phases

### Phase 1 (Patch)

- Implement `disposition` support in write-path contracts.
- Add QG persistence + list/detail APIs.
- Add two sentinel detectors: burst velocity and provenance anomaly.

### Phase 2 (Minor)

- Add challenge protocols and operator resolve actions (`resolved_allow`, `resolved_reject`).
- Add dashboard panels for quarantines, top signals, and source anomaly drift.

### Phase 3 (Minor)

- Add inoculation memory library for recurring misinformation motifs.
- Add policy-driven immunity thresholds and environment profiles.

## Accountability Window

- **Post-deploy window:** 7 days.
- **Metrics:** quarantine precision, false-positive rate, mean time to resolution, RG contamination incidents (=0 target).

## Confidence and Tradeoff

- **Confidence:** 0.86 (architecture aligns with existing WriteSet/provenance direction; implementation risk is integration sequencing).
- **Tradeoff:** higher ingestion latency on suspicious payloads in exchange for stronger epistemic integrity and reduced downstream analytic contamination.
