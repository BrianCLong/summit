# IntelGraph Evidence Contract (v1 Foundation)

## Purpose
Define required evidence and event ingest for policy and runtime enforcement artifacts.

## Ownership
- **Contract authority**: Summit + companyOS governance
- **Ingest authority**: IntelGraph

## Stable Event Names
- `policy.decision`
- `flow.run`
- `job.run`

## Required Evidence Artifact Set
- `report.json` (deterministic summary)
- `metrics.json` (deterministic numeric counters)
- `stamp.json` (timestamps only)
- `evidence/index.json` (artifact index)

## Determinism Rules
- No timestamps outside `stamp.json`.
- Artifact paths in index must be deterministic and relative.
- Event payloads must include `orgId`, `action`, `decisionId` where applicable.

## Reject Conditions
- Missing required artifact file.
- Timestamp found outside `stamp.json`.
- Missing `orgId` for policy-bound events.
- Unknown event name outside approved set.
