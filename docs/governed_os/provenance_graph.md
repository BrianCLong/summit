# Provenance Graph

## Definition
The Provenance Graph is the authoritative evidence lineage system for Summit. It captures how
every output is derived, including dataset and model fingerprints, transformations, and
citations. The Provenance Graph ensures all citations resolve to evidence hashes and enables
offline deterministic replay.

## Core Nodes

- `EvidenceArtifact`
- `Transform`
- `ModelVersion`
- `DatasetVersion`
- `Query`
- `TraceSpan`
- `Citation`

## Core Edges

- `DERIVED_FROM`
- `PRODUCED_BY`
- `EXECUTED_AS`
- `CITES`
- `HASHES_TO`

## Evidence Invariants

- **Citation resolvability**: every citation resolves to an evidence hash.
- **Deterministic replay**: a replay with identical inputs reproduces `metrics.json`
  hash-identically.
- **Residency isolation**: evidence resolution stays within tenant+region boundaries.
- **Offline-first**: auditor verification is possible without external network calls.

## Evidence Bundle Contract

Evidence bundles are stored under:
`evidence/EVID-GOVOS-YYYYMMDD-<slug>-<gitsha7>/`

Required files:
- `report.json`
- `metrics.json`
- `stamp.json`

The `stamp.json` binds evidence hashes to the policy decision path.

## Citation Resolution Flow

1. **Extract** citations from output artifacts.
2. **Resolve** citations to `EvidenceArtifact` nodes and hashes.
3. **Verify** hash integrity against stored evidence artifacts.
4. **Stamp** the resolved output with a deterministic evidence stamp.

## Enforcement

- CI gate: `ci/citations-resolve` requires 100% resolvability.
- Runtime export gate: exports are blocked if citations do not resolve.
- Auditor Verify: loads evidence bundles and verifies lineage without remote calls.

## Status

Provenance graph evolution is governed by the Governed OS epic and anchored to the Summit
Readiness Assertion.
