# Modulith Security & Data Handling

## Data Classification
The Modulith verifier operates on source code metadata (import paths) and does not process runtime data or PII.

## Logging & Auditing
- **Never log file contents**: The scanner only records the names of modules and the paths of files containing violations.
- **Evidence Persistence**: Modulith artifacts are stored in `artifacts/modulith/` and should be retained according to the repository's evidence policy (typically 30 days).

## Confidentiality
- Only module names and file paths are included in the generated `report.json`.
- No sensitive logic or secrets are extracted during the static analysis phase.

## Integrity
- Modulith checks are gated in CI.
- The `stamp.json` file provides a machine-verifiable record of the scan, including a deterministic timestamp in CI environments.
