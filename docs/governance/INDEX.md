Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: governance-docs-integrity
Status: active

# Summit Governance Index

Start here, then follow the authority chain in `docs/SUMMIT_READINESS_ASSERTION.md`.
This index is the authoritative navigation layer for governance artifacts.

## Start Here

- [Succession Readiness](SUCCESSION_READINESS.md)
- [Summit Readiness Assertion](../SUMMIT_READINESS_ASSERTION.md)
- [Governance Ownership](OWNERSHIP.md)
- [Policies & Authority](POLICIES.md)

## Runtime Governance

- [Runtime Enforcement](RUNTIME_ENFORCEMENT.md) (planned)

## Gates

- [Docs Integrity](GATES/docs-integrity.md)
  - Job: `Governance / Docs Integrity`
  - Command: `pnpm ci:docs-governance`
  - Evidence: `artifacts/governance/docs-integrity/<sha>/`
- [SOC Control Verification](GATES/soc-control-verification.md)
  - Job: `SOC Control Verification`
  - Command: `bash scripts/test-soc-controls.sh soc-compliance-reports`
  - Evidence: `soc-compliance-reports/`
- [Branch Protection Drift](GATES/branch-protection-drift.md)
  - Job: `Governance / Branch Protection Drift`
  - Command: `pnpm ci:branch-protection:check`
  - Evidence: `artifacts/governance/branch-protection-drift/`
- [Security Audit Gate](GATES/security-audit-gate.md)
  - Command: `pnpm ci:security-audit-gate`
  - Evidence: none (logs only)
- [Unified Governance Gate](UNIFIED_GATE.md) (planned)

## Policies & Exceptions

- [Governance Policies](POLICIES.md)
- [Exceptions Register](EXCEPTIONS.md)

## Evidence & Audit

- [Governance Evidence](EVIDENCE.md)
- [Control Evidence Index](CONTROL_EVIDENCE_INDEX.md)
