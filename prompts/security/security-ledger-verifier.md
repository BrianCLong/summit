# Security Ledger Verifier Prompt

## Objective

Normalize the security remediation ledger into a machine-checkable YAML file and add a CI-safe verifier that enforces clear FIXED/DEFERRED status gates.

## Scope

- docs/security/security_ledger.yml
- docs/security/SECURITY-ISSUE-LEDGER.md
- scripts/ci/verify_security_ledger.mjs
- scripts/ci/pr-gate.sh
- docs/roadmap/STATUS.json

## Constraints

- Do not invent findings; only normalize existing ledger entries.
- No network access or nondeterministic tooling.
- Keep verification fast and deterministic.
