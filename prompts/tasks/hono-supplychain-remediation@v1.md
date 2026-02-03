# Prompt: Hono Supply-Chain Remediation Gate (v1)

## Objective
Add a deny-by-default lockfile gate for `hono` versions, create evidence bundle scaffolding, and update walkthrough documentation.

## Scope
- tools/security/verify_hono_lockfile.mjs
- tools/security/verify_hono_lockfile.test.mjs
- tools/security/fixtures/*
- tools/security/emit_hono_evidence_stamp.mjs
- .github/workflows/security-supplychain.yml
- evidence/out/HONO-ERRBOUNDARY-XSS/*
- evidence/index.json
- walkthrough.md
- required_checks.todo.md
- docs/templates/atomic-pr-brief-template.md
- docs/roadmap/STATUS.json

## Constraints
- Additive-only changes; no refactors outside scope.
- Deny-by-default gate: fail if versions cannot be verified or are below 4.11.7.
- Evidence outputs are deterministic; timestamps live only in stamp.json.
