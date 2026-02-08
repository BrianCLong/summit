# Front-Run Bands (Defensive-First) — Governance Scope

## Summit Readiness Assertion (Preemptive Reference)
This scope is anchored to the Summit Readiness Assertion and is enforced as a governed, defensive-only capability surface. Refer to: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Purpose
Define the three “front-run” capability bands as defensive analytic primitives for measurement, forecasting, and resilience planning. This scope explicitly prohibits generating or optimizing malicious influence campaigns.

## Core Principles
1. **Defensive-first by default**: every capability must bias toward detection, mitigation, and resilience.
2. **Policy enforcement**: governed segments only; no individual-level cognitive scoring.
3. **Evidence-bound outputs**: deterministic, replayable artifacts with traceable provenance.
4. **Uncertainty-aware**: scenario projections must be labeled as such and carry uncertainty bounds.

## Capability Bands (Defensive)

### Band 1 — Phase-Structured Campaigns + Narrative Market
- **CampaignPhase**: shaping → seeding → amplification → consolidation → reactivation.
- **Narrative Market**: attention, credibility, retention indices per segment.
- **Guardrails**: no tactic generation; interventions limited to defensive mitigation and inoculation workflows.

### Band 2 — Cognitive-Layer Defense
- **Cognitive State Graph**: measured attributes at segment level only (e.g., trust/identity/polarization), with uncertainty bounds.
- **Memetic Mapping**: pattern → hypothesized cognitive shifts with explicit confidence and conditions.
- **Guardrails**: no individual profiling; no high-risk inference without governance approval.

### Band 3 — Proof/Synthetic Layer + Multi-Faction Wargames
- **Proof Objects**: evidence artifacts with authenticity signals and propagation tracking.
- **Wargames**: defensive, multi-faction scenario simulations with cross-domain consequence scoring.
- **Guardrails**: no adversarial optimization; mandatory audit trails and replay determinism.

## Governance Artifacts (Authoritative)
- **Dual-use policy**: `policy/dual_use_policy.md`
- **Segment governance**: `policy/segment_governance.yaml`
- **Evidence requirements**: `ANNOUNCEMENT-EVIDENCE-ID-GATE-v1.3.0.md`

## Evidence & Determinism
- **Evidence ID**: `EVID::<tenant>::<domain>::<artifact>::<yyyy-mm-dd>::<gitsha7>::<runid8>`
- **Required artifacts**: `report.json`, `metrics.json`, `stamp.json` for each gate.

## MAESTRO Security Alignment
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: goal manipulation, prompt injection, data poisoning, adversarial simulation abuse, tool misuse.
- **Mitigations**: policy gates (dual-use + segment), deterministic replay, evidence signing, audit logging, and tenant isolation.

## Implementation Boundaries
- **No direct campaign optimization**.
- **No individual-level cognitive scoring**.
- **No prohibited segment inference** beyond governed features.

## CI Gates (Planned)
- `dual_use_policy_gate`
- `segment_policy_gate`

## Status
This scope is in force and must be treated as the authoritative defensive-only baseline.
