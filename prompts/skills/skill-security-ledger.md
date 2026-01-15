# skill-security-ledger

## Purpose

Update security ledgers, SBOM/provenance pointers, and threat-model notes with evidence.

## Inputs

- Security issue description.
- Relevant ledger and SBOM files.
- Threat model update requirements.

## Determinism Requirements

- Stable ordering of ledger entries.
- No timestamps in deterministic outputs.
- Evidence bundle required for every update.

## Steps

1. Locate authoritative ledgers and SBOM references.
2. Apply updates with stable ordering and consistent identifiers.
3. Emit evidence bundle artifacts.

## Output Artifacts

- `artifacts/agentic/<task>/<run-id>/stamp.json`
- `artifacts/agentic/<task>/<run-id>/report.json`
- `artifacts/agentic/<task>/<run-id>/report.md`
- `artifacts/agentic/<task>/<run-id>/provenance.json`
- Optional `diffs.patch`
