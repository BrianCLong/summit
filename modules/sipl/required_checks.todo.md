# Required checks discovery for SIPL

## Goal
List the repository's *required* CI checks for the SIPL module.

## Temporary convention
Until discovered, we use temporary verifier names:
- `ci:sipl-unit`
- `ci:sipl-schema`
- `ci:sipl-lint`
- `ci:sipl-evidence-contract`
- `ci:sipl-sanitize-redact`
- `ci:sipl-anticollapse`
- `ci:sipl-eval-smoke`

## Rename plan
Once actual check names are known, update CI config to emit the official check names.
