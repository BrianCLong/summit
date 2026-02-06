# Runbook: Procurement Espionage Graph (PEGra) & BES

## Summit Readiness Assertion (Escalation)

This runbook aligns to the Summit Readiness Assertion and assumes evidence-first execution.
See `docs/SUMMIT_READINESS_ASSERTION.md`.

## Purpose

Operate the PEGra/BES module in advisor mode to identify procurement leakage risk and produce
mitigation bundles.

## Prerequisites

- Customer-owned procurement artifacts and authorization for ingestion.
- Feature flag enabled for PEGra/BES in the target environment.
- Evidence bundle storage available for outputs and audit metadata.

## Inputs

- Procurement artifacts (RFPs, bids, awards, contracts, line items).
- Supplier master data and platform telemetry (if available).
- Customer-provided public awards feed (optional).

## Procedure

1. **Ingest Artifacts**
   - Validate data classification and authorization.
   - Apply redaction and normalization rules.
2. **Build PEGra**
   - Generate `pegra.graph.json` with deterministic IDs.
3. **Compute Yield**
   - Generate `yield_scores.json` for artifact sets.
4. **Run BES Simulation**
   - Execute seeded adversary simulation to generate `bes.sim.json`.
5. **Generate Recommendations**
   - Output `recommendations.json` with evidence references and deltas.

## Outputs

- `pegra.graph.json`
- `yield_scores.json`
- `bes.sim.json`
- `recommendations.json`

## Observability

- Track job latency, success rate, and artifact processing counts.
- Alert on failed redaction checks or evidence generation errors.

## Troubleshooting

- **Missing Artifacts**: verify procurement export access and permissions.
- **Non-deterministic Outputs**: ensure seeds are set and input set is stable.
- **Policy Denials**: confirm the request is defensive and within authorized data scope.

## Rollback

- Disable PEGra/BES feature flag.
- Purge derived artifacts if classification or authorization is invalid.
- Re-run ingestion with corrected redaction and retention settings.
