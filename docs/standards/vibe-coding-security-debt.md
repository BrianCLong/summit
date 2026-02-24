# Standard: Vibe Coding Security Debt

## Objective
Provide deterministic security-debt accounting for AI-assisted development workflows.

## Imports
- SBOM (CycloneDX)
- SARIF
- SPDX
- Dependency graph metadata

## Exports
- `security_debt_ledger.json`
- `report.json`
- `metrics.json`
- `stamp.json`
- Evidence ID convention: `EVID-<area>-<hash>`

## Non-goals
- Replacing SAST/DAST tools.
- Rewriting core Summit architecture.
- Implementing a full vulnerability scanner.
