# AMES/PEG Tactical Plan (Insurance Model Espionage Defense)

## Readiness Assertion

This plan operates under the Summit Readiness Assertion, with any deviations treated as
Governed Exceptions and recorded in the evidence bundle and DecisionLedger.

## Scope & Primary Zone

**Zone:** Documentation (`docs/`) only. This plan is intentionally constrained to a tactical
execution blueprint and governance-ready artifacts.

## Tactical Objective (v0)

Deliver a deterministic, defensive-only AMES/PEG foundation that produces verifiable evidence
artifacts from fixtures, without touching production endpoints or external networks.

## Minimal Winning Slice (MWS)

Given synthetic fixtures describing actuarial models, their lineage, and exposure surfaces,
Summit builds an AMG snapshot, runs bounded extraction/inversion/poisoning risk evaluations,
and emits a deterministic PEG defense configuration with an evidence index.

## Deterministic Artifacts (v0)

- `out/ames_peg.amg.snapshot.json`
- `out/ames_peg.sim.extraction.json`
- `out/ames_peg.sim.inversion.json`
- `out/ames_peg.sim.poisoning.json`
- `out/ames_peg.peg.equilibrium.json`
- `out/ames_peg.blueprint.json`
- `out/ames_peg.evidence.index.json`

**Evidence ID pattern:** `EVID:ames-peg:<kind>:<sha256-12>`

## Execution Plan (PR Stack)

### PR1 — Evidence + safety scaffolding (docs only)

- Evidence schemas and index format (docs).
- Safety constraints declared: no network egress, no production endpoint access.
- Determinism rules: timestamps only in stamp artifacts.

### PR2 — AMG schema + fixture plan (docs only)

- AMG schema reference and fixture format definition.
- Node/edge taxonomy for models, data assets, and exposure surfaces.

### PR3 — Simulation harness contract (docs only)

- Defensive-only evaluation contract for extraction/inversion/poisoning risk proxies.
- Required invocation: safety policy enforcement before any evaluation.

### PR4 — PEG-lite optimizer contract (docs only)

- Bounded search over rate limits and output granularity.
- Objective: minimize economic exploitability under accuracy/latency budgets.

### PR5 — Blueprint + runbook contract (docs only)

- Blueprint format for deployable defense bundles.
- Runbook: observe-only → simulate-only → recommend-only → enforce-by-proxy.

## Governance & Compliance Alignment

- **Never-log list:** PII, claim narratives, raw loss runs, raw model weights.
- **Retention:** deterministic outputs versioned by policy hash.
- **Approvals:** CISO + Chief Actuary + ML Platform Owner for any enforcement.
- **Evidence-first:** every run emits a schema-validated evidence index.

## MAESTRO Security Alignment

- **MAESTRO Layers:** Data, Agents, Tools, Observability, Security.
- **Threats Considered:** model theft via query scraping, inversion leakage, poisoning, insider
  misuse, tool abuse/prompt injection.
- **Mitigations:** safety policy enforcement, bounded evaluations, output coarsening
  recommendations, integrity checks for training inputs, and evidence-gated execution.

## Threat-Informed Requirements

| Threat | Mitigation | Evidence Hook |
| --- | --- | --- |
| External probing clones pricing behavior | Output shaping + rate limiting + query budgets | `EVID:ames-peg:extraction:*` |
| Model inversion infers sensitive segments | Output coarsening + sensitivity tags | `EVID:ames-peg:inversion:*` |
| Silent poisoning shifts reserves/pricing | Canary datasets + signed inputs | `EVID:ames-peg:poisoning:*` |
| Insider/partner misuse via portals | Channel-scoped exposure rules | `EVID:ames-peg:surface:*` |
| Overblocking harms accuracy/latency | PEG objective constraints | `EVID:ames-peg:peg:*` |

## Determinism Contract

- Stable sorting for all arrays.
- Fixed precision for numeric outputs.
- No timestamps outside the evidence stamp artifacts.

## Rollback & Kill-Switch

- All AMES/PEG execution is feature-flagged and OFF by default.
- Kill-switch: disable AMES flags and invalidate any scheduled runs.

## Evidence & Verification

- Validate all evidence JSON against schemas.
- Demonstrate deterministic outputs across repeated fixture runs.
- Record proof in evidence index with stable IDs.

## Innovation Edge (Forward-Leaning Enhancement)

Introduce a **Pricing Behavior Manifold Guard**: a constrained, monotonic envelope that
stabilizes externally observable pricing responses while preserving internal model fidelity.
This delivers stronger resistance to cloneability without sacrificing underwriting signal.

## Finality

This tactical plan is the single authoritative blueprint for AMES/PEG v0 delivery until
superseded by a governed exception or approved roadmap update.
