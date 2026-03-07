# IntelGraph Evidence Contract (v1 foundation)

## Purpose
IntelGraph is the provenance and evidence home for policy decisions and runtime execution logs.

## Event names
- `policy.decision`
- `flow.run`
- `job.run`

## Required evidence bundle per policy decision
- `report.json` (deterministic summary)
- `metrics.json` (deterministic counters)
- `stamp.json` (timestamps only)
- `index.json` (EVD ID to file-path map)

## Determinism rule
Any timestamp field outside `stamp.json` is invalid.
