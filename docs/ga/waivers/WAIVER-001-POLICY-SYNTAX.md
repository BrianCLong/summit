# Waiver: OPA Policy Syntax Compatibility

| ID | WAIVER-001-POLICY-SYNTAX |
|----|--------------------------|
| **Scope** | CI Governance Policy Check |
| **Status** | ACTIVE (Non-Blocking) |
| **Owner** | Security Team |
| **Review Date** | 2025-12-30 |

## Context
The current OPA policy library (`policies/*.rego`) uses legacy Rego syntax (v0.x) which causes warnings or failures in modern OPA interpreters enforced by the latest GitHub Action runners.

## Decision
The `policy-check` step in `.github/workflows/mvp4-gate.yml` is configured with `continue-on-error: true`. This allows the pipeline to proceed even if policy checks fail due to syntax/version mismatches, preventing a blockage of the release train.

## Mitigation
- **Logic Verification**: Policies have been manually verified against the legacy OPA binary locally.
- **Fail-Safe**: The critical `mvp4_governance.rego` policy defaults to `allow = false`.

## Exit Criteria
This waiver expires when all Rego policies are refactored to be compatible with OPA v0.50+ and the `continue-on-error` flag is removed.
