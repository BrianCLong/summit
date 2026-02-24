# Security Debt Ledger Runbook

## Failure Causes
- Added dependency without risk classification.
- Agent-authored file without required provenance header.
- Threat model coverage below configured threshold.
- Repeated vulnerability signature detected (when deny is enabled).

## Execution Commands
- Analyze: `python3 -m summit analyze --security-debt --output-dir artifacts/security-debt --gate-config summit/ci/gates/security_debt.yml`
- Verify gate: `python3 summit/ci/verify_security_debt.py --artifacts-dir artifacts/security-debt --gate-config summit/ci/gates/security_debt.yml`
- One-shot gate: `pnpm run security-debt:gate`
- Drift check: `pnpm run security-debt:drift`

## Override Model
- Default mode: `SECURITY_DEBT_ENFORCEMENT=off` (warn-only).
- Strict mode: `SECURITY_DEBT_ENFORCEMENT=on` (merge-blocking).
- Temporary waivers must be documented in PR description with rationale and expiry.

## Drift Alerts
- Trigger on risk score delta above threshold.
- Trigger on dependency growth above threshold.
- Trigger on repeated vulnerability signatures.

## Escalation Path
- First response: owning engineer.
- Escalate to security/governance owner when strict-mode failures recur.
- Open incident if repeated signatures appear across multiple PRs.
