# Prompt: Secrets Hygiene + Redaction Gate (GA)

## Objective

Implement a deterministic secrets scanning gate for GA readiness that scans tracked repository files and generated artifacts, produces audit-ready outputs, and enforces allowlist governance with expiry and rationale.

## Scope

- Policy file: `docs/security/SECRETS_SCAN_POLICY.yml`
- Scanner: `scripts/ci/secrets_scan_gate.mjs` and shared utilities in `scripts/ci/lib/`
- Evidence verifier integration: `scripts/evidence/verify_evidence_bundle_offline.mjs`
- CI wiring: `.github/workflows/ci-core.yml`
- Script entrypoint: `package.json`
- Runbook: `docs/security/SECRETS_SCAN_RUNBOOK.md`
- Roadmap status update: `docs/roadmap/STATUS.json`

## Constraints

- No new dependencies.
- Deterministic ordering and JSON formatting.
- Redact all secret previews (prefix/suffix only, or <redacted> for key blocks).
- Do not require network access.
- CI job must fail on blocking findings.

## Deliverables

- Policy, gate script, shared utilities, CI job, and documentation.
- Evidence outputs under `artifacts/governance/secrets-scan/<sha>/`.
- Allowlist schema with expiry and rationale.
- Integration with evidence verification.
