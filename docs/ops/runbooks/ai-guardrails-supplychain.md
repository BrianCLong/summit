# Runbook: AI Guardrails & Supply Chain Security

## Overview
This runbook covers the operation, troubleshooting, and remediation of the Supply Chain Guardrails subsystem.

## Gates & Alerts

### 1. `dependency-intake`
- **Symptom**: CI fails with `denylisted-package` or `suspicious-pattern`.
- **Action**:
    1. Check `artifacts/supplychain/dependency-intake/report.json`.
    2. Identify the offending package.
    3. If valid: Request an exception (see `docs/governance/EXCEPTIONS.md`).
    4. If malicious: Remove immediately and rotate credentials if executed.

### 2. `ai-upgrade-grounding`
- **Symptom**: CI fails with `Unresolvable recommendation`.
- **Action**:
    1. Verify if the version exists on npm/pypi.
    2. If it exists: The gate might have failed network check. Retry.
    3. If it does not exist: The AI hallucinated. Reject the upgrade.

### 3. `dev-threat-audit`
- **Symptom**: CI fails with `Suspicious pattern`.
- **Action**:
    1. Inspect the file line reported.
    2. If legitimate code: Add exclusion in `packages/supplychain-guard/src/gates/dev_threat_audit.ts`.
    3. If malware: **ISOLATE WORKSTATION**. Trigger Incident Response (Sev-1).

## Drift Detection
The `drift-check` workflow runs daily. If it fails, it means the gates are broken or a regression slipped in.
- **Action**: Investigate `.github/workflows/supplychain-drift.yml` logs.
