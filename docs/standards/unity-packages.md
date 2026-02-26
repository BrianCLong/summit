# Unity Package Ingestion Standard

This standard defines the Summit import/export contract for Unity UPM-style modular packages.

## Inputs
- Unity `package.json` manifest (`name`, `version`, `dependencies`).
- Assembly Definition Files (`*.asmdef`) discovered within the package tree.

## Outputs
- `package-report.json`: canonical deterministic report.
- `dependency-dag.json`: dependency graph and topological order.
- `metrics.json`: dependency and assembly counts.
- `stamp.json`: evidence stamp with report hash.

## Determinism Rules
- No runtime timestamps in output artifacts.
- All JSON encoded with sorted keys and compact separators.
- Edges and node lists are emitted in stable sorted order.
