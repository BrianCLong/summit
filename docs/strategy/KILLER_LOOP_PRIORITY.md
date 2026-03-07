# Summit Most Important Need Now: Governed Killer Loop Execution

## Summit Readiness Assertion
Summit's immediate mandate is operational proof, not architectural expansion. The highest-value path is a governed, repeatable killer loop that demonstrates ingestion, truth enforcement, tri-graph state transition, and analyst-grade explainability inside one compressed execution window.

## Priority Decision (Now)
Deliver and harden one deterministic loop that is demonstrably alive:

1. Ingest real or replayed OSINT artifacts.
2. Enforce WriteSet firewall controls (schema, semantic, provenance, policy).
3. Persist immutable evidence entries with bitemporal semantics.
4. Materialize Reality/Belief/Narrative state views.
5. Surface `Explain()` and `What changed?` outputs with full source traceability.

## 23rd-Order Intent Translation (Decision Consequences)
This decision intentionally collapses strategic risk across product, trust, and delivery:

- **Product risk control**: converts abstract architecture into a visible intelligence workflow.
- **Trust risk control**: every claim must be explainable from evidence and provenance.
- **Governance risk control**: GA evidence requirements become executable acceptance gates.
- **Execution risk control**: forces one-zone coupling (docs + implementation roadmap) with short validation cycles.
- **Commercial risk control**: creates a demonstration artifact suitable for analyst and buyer evaluation.

## Operating Scope and Boundaries
- Primary zone: `docs/` strategy + roadmap coordination.
- Strictly coupled implementation zones (next PRs): `packages/` (ledger/firewall), `apps/web/` (Explain panel), worker service for ingestion.
- No new subsystem class without compatibility to shared bitemporal and provenance definitions.

## Definition of Done (Golden-Path Aligned)
The killer loop is considered complete only when all evidence outputs are present in one run:

- Accepted and rejected WriteSets with machine-readable rejection reports.
- Tri-graph delta report (Reality/Belief/Narrative) including confidence movement.
- Deterministic explanation chain for at least one claim, fully sourced to ledger rows.
- Timeline delta proving prior vs current system belief state.
- Evidence bundle suitable for PR-quality gate attachment.

## Required Deliverables (Execution Order)
1. **WriteSet Firewall**
   - `writeset.schema.json`
   - semantic validator module
   - rejection report contract
2. **Evidence Ledger Substrate**
   - append-only write path
   - bitemporal fields (`valid_time`, `transaction_time`)
   - DuckDB store + Parquet export
3. **Explainability Surface**
   - claim-level `Explain()` panel
   - confidence delta (`What changed?`) event details
4. **Autonomous Ingestion Worker**
   - feed adapters -> normalization -> writeset -> firewall -> ledger -> materialized views

## Acceptance Gate Matrix
| Gate | Criterion | Evidence Artifact |
| --- | --- | --- |
| G1: Validation Integrity | Invalid WriteSets rejected with explicit codes | `artifacts/killer-loop/rejections.json` |
| G2: Temporal Replay | As-of replay reconstructs expected prior state | `artifacts/killer-loop/replay-check.json` |
| G3: Explainability | Explain output references only sourced evidence links | `artifacts/killer-loop/explain-chain.json` |
| G4: Delta Fidelity | Confidence changes and narrative transitions diff correctly | `artifacts/killer-loop/diff-report.json` |
| G5: Golden Path Compatibility | Smoke path remains green with loop enabled | CI log + `make smoke` output |

## MAESTRO Alignment
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection in ingestion, provenance spoofing, unsourced confidence inflation, unauthorized policy bypass.
- **Mitigations**: schema + semantic firewall, append-only ledger, signed/hash-linked provenance, deterministic explain resolver, evidence-backed acceptance gates.

## Two-Sprint Execution Plan
### Sprint 1 (Foundation)
- Ship WriteSet schema and semantic validator with rejection report output.
- Persist immutable ledger records with provenance hash chain.
- Implement replay and diff query interfaces with deterministic ordering.

### Sprint 2 (Analyst Proof)
- Ship claim-level `Explain()` + `What changed?` surface.
- Connect ingestion worker to continuous mini-feeds.
- Produce and archive evidence bundle from a complete killer-loop run.

## Success Metrics
- Median killer-loop cycle time (target tracked per build).
- % of claims with fully sourced explanation chain.
- Rejection precision for invalid writesets.
- Analyst trust score for explainability workflow.
- Mean time to diagnose belief change from timeline view.

## Non-Goals (Intentionally Constrained)
- Expanding model complexity before explanation fidelity is proven.
- Broad UI expansion beyond timeline + explain critical path.
- Introducing parallel graph subsystems without shared bitemporal/provenance contracts.

## Forward-Leaning Enhancement (Next Increment)
Adopt **signed explanation manifests**: each `Explain()` response emits a compact manifest hash linking claim -> evidence set -> confidence delta. This enables cache-safe explanation reuse, tamper detection, and low-latency analyst replay across sessions.
