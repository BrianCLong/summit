# Summit Most Important Need Now: The Killer Loop

## Readiness Assertion

Summit's highest-leverage move right now is to convert architectural advantage into repeated operational proof. Per the readiness posture, the fastest path is a governed, demonstrable loop that runs end-to-end with evidentiary traceability, not additional subsystem expansion.

## Priority Decision (Now)

Build and harden one **small, unmistakably real killer loop**:

1. Ingest live or replayed OSINT evidence.
2. Enforce WriteSet firewall validation (schema + semantic + provenance).
3. Update Reality, Belief, and Narrative views.
4. Run epistemic reconciliation (contradictions, confidence updates, narrative injection checks).
5. Render analyst-facing output with deterministic `Explain()` and `What changed?`.

## Why This Is Most Important

- It transforms Summit from architecture to behavior.
- It creates immediate analyst trust through source-backed explainability.
- It enables repeatable acceptance criteria and GA evidence artifacts.
- It forces cross-layer alignment (data model, provenance, graph materialization, UI, and governance).

## Definition of Done (30-second proof loop)

The loop is done when a laptop-accessible run can complete within a short demo window and produce:

- Accepted + rejected WriteSets with machine-readable rejection reasons.
- Tri-graph deltas (Reality/Belief/Narrative) with confidence movement.
- A deterministic explanation chain for at least one claim.
- A timeline entry proving state transition from prior to current belief.

## First Four Deliverables

1. **WriteSet Firewall (truth infrastructure)**
   - `writeset.schema.json`
   - semantic validator module
   - rejection report output
2. **Local evidence substrate**
   - DuckDB + Parquet export path
   - indexed evidence query paths for explain/diff
3. **Cognitive Battlespace view**
   - `Explain()` panel
   - `What changed?` confidence delta
4. **Autonomous ingestion worker**
   - feed adapters -> normalize -> writeset -> firewall -> ledger/views

## Single Feature With Highest Immediate UX Lift

Implement **Explain Why This Exists** on every claim/narrative node:

- Evidence chain: source artifacts, transforms, confidence deltas.
- Causal chain: actor/location/narrative links.
- Provenance chain: producing pipeline and validation status.

This is the trust conversion point from "score display" to "defensible reasoning".

## Architectural Decision That Maximizes Long-Term Advantage

Adopt an append-only, provenance-first, bitemporal evidence ledger as the system of record:

- Immutable WriteSets.
- `valid_time` and `transaction_time` on assertions.
- Replayable/materialized views for Reality/Belief/Narrative.
- Deterministic explain/diff against historical as-of states.

## Execution Sequence (next two sprints)

### Sprint 1

- Ship WriteSet schema + semantic validator + rejection report.
- Persist immutable ledger records with provenance hash.
- Stand up replay + diff queries.

### Sprint 2

- Add Explain panel and timeline confidence deltas.
- Wire ingestion worker to continuous mini-feeds.
- Capture GA evidence bundle from killer-loop smoke run.

## Success Metrics

- Median killer-loop cycle time.
- % of claims with fully sourced explanations.
- Rejection precision (invalid writesets rejected for correct reason).
- Analyst trust score on explainability workflow.

## Non-goals (for now)

- Expanding model complexity before explanation fidelity is solid.
- UI breadth over timeline + explain depth.
- New graph subsystems without shared bitemporal/provenance semantics.
