# Runbook: Shai-Hulud Supply-Chain Subsumption

## Purpose

Ensure subsumption bundle evidence stays deterministic and aligned with governance gates.

## Preconditions

- Subsumption manifest present.
- Evidence index includes EVD-SUPPLYCHAIN-GOV-001.

## Validation Steps

1. Confirm manifest + evidence files exist.
2. Validate evidence index mapping paths.
3. Confirm docs targets exist.

## Failure Modes

- Missing evidence entries.
- Timestamp fields outside stamp.json.
- Drift between manifest and evidence index.

## Response

- Regenerate evidence artifacts with deterministic outputs.
- Update evidence/index.json mappings.
- Record corrective notes in the decisions log.
