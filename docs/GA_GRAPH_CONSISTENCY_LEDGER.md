# GA Graph Consistency Ledger (Postgres ↔ Neo4j)

## Authority and Readiness Assertion

This control is executed under the Summit Readiness Assertion and the Constitution of the Ecosystem.
All evidence produced by this ledger is grounded in the authority files and governance standards
below and is treated as append-only audit material.

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Constitution: `docs/governance/CONSTITUTION.md`
- Meta-Governance Framework: `docs/governance/META_GOVERNANCE.md`

## Purpose

The Graph Consistency Ledger is the authoritative, nightly reconciliation between the
Postgres system-of-record and the Neo4j intel graph. It enforces tenant isolation,
provenance integrity, and early drift detection by producing a signed, append-only ledger
with record-level mismatches.

## Control Objectives

- Enforce tenant isolation by asserting no cross-tenant edges and no cross-tenant leakage.
- Ensure Neo4j facts resolve to Postgres evidence events.
- Detect structural drift within 24 hours (missing nodes, dangling edges, version skew).
- Produce GA/SOC-ready, immutable evidence artifacts for audit review.

## Output Artifacts

- `graph_snapshot/<date>.jsonl`: point-in-time Neo4j export
- `pg_deltas/<since,until>.jsonl`: Postgres deltas since last run
- `graph_compare/<date>.jsonl`: mismatch findings
- `consistency_ledger/<date>.jsonl`: signed append-only ledger
- Optional detached signature: `consistency_ledger/<date>.sig`

## Ledger Schema

Each JSONL entry conforms to the following shape.

```json
{
  "ts": "2026-01-14T02:13:07Z",
  "tenant_id": "acme",
  "subject": {"kind": "node|edge", "type": "Person", "uuid": "e7f..."},
  "checks": [
    {"name": "exists_in_pg", "status": "pass|fail"},
    {"name": "exists_in_neo4j", "status": "pass|fail"},
    {"name": "version_match", "expected": 12, "actual": 11, "status": "fail"},
    {"name": "provenance_link", "status": "pass|fail"},
    {"name": "tenant_boundary", "status": "pass|fail"}
  ],
  "diff": {"field": "email", "pg": "a@acme.com", "neo4j": "null"},
  "evidence_ids": ["ev_9c1..."],
  "severity": "info|warn|error",
  "hash": "sha256-...",
  "runner": {"host": "ci-12", "commit": "abc123"}
}
```

## Nightly Flow

1. Export a point-in-time Neo4j snapshot.
2. Export Postgres deltas for the reconciliation window.
3. Compare by `(tenant_id, uuid)` and validate version, provenance, and edge endpoints.
4. Emit ledger rows for every mismatch or anomaly.
5. Sign and store the ledger artifact.

## Scripts

The following scripts are provided as the sanctioned execution path.

```bash
pnpm graph:snapshot
pnpm graph:pg-deltas
pnpm graph:compare
pnpm graph:ledger
```

`pnpm graph:nightly` executes the full chain.

### Required Environment

- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- `PG_URL`
- `LAST_RUN`, `THIS_RUN` (optional; defaults to 24h window)
- `GRAPH_SNAPSHOT_DIR`, `PG_DELTAS_DIR`, `GRAPH_COMPARE_OUTPUT`, `CONSISTENCY_LEDGER_PATH`
- `GIT_COMMIT`, `RUNNER_HOST` (recommended for ledger provenance)

### Governed Exceptions

If edge endpoint tenant identifiers are missing, the ledger records a `tenant_boundary` failure
and classifies the record as `warn` until the upstream event schema is corrected. This is an
explicit Governed Exception and must be resolved in the source event emitter.

## CI Integration

The nightly workflow is defined in `.github/workflows/graph-consistency.yml` and runs on schedule
or via manual dispatch. The ledger output is uploaded as a workflow artifact for audit retention.

## Evidence Mapping

- Evidence class: Data Integrity & Reconciliation
- Primary evidence artifact: `consistency_ledger/<date>.jsonl`
- Supporting artifacts: snapshot, deltas, comparison findings
- Policy linkage: `docs/ga/TESTING-STRATEGY.md` and `docs/ga/LEGACY-MODE.md`

## Operational Notes

- Output directories are intentionally constrained to repo-root folders for deterministic
  artifact collection.
- The comparison script is intentionally constrained to delta-based validation to keep nightly
  runs fast; full snapshot parity checks are deferred pending incremental checksum support.

## Forward Enhancements

- Add a full snapshot parity job that uses per-tenant checksum manifests.
- Attach cosign signatures to the ledger output and store signatures in the evidence bundle.
- Extend comparison to enforce policy-as-code checks for prohibited edge types.
