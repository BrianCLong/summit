# Subsumption Bundle Contract

## Overview

The Subsumption Bundle contract defines the minimal, deterministic artifact set required to ingest a new ITEM into Summit governance. The contract is intentionally constrained to enforce evidence-first behavior and deny-by-default fixtures.

## Required Artifacts

- `subsumption/<item>/manifest.yaml`
- `subsumption/<item>/fixtures/deny/README.md`
- `subsumption/<item>/fixtures/allow/README.md`
- Evidence triad: `report.json`, `metrics.json`, `stamp.json`
- Evidence index entry in `evidence/index.json`

## Determinism Rules

- `report.json` and `metrics.json` must be stable across runs.
- `stamp.json` is the only file permitted to include timestamps.
- Evidence IDs must be tracked in the evidence index.

## Required Checks

- `subsumption-bundle-verify` must run on bundle paths.

## Fixtures

- Deny-by-default fixtures are mandatory for every bundle.
- Allow fixtures define the minimal pass state.

## Compatibility

- Aligns with Summit Evidence Contract Standard (ECS).
- Intentionally constrained to governance-only changes until ITEM evidence is provided.
