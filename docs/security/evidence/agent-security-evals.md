# Agent Security Evaluations Evidence

## Control Mapping

- **Control**: SEC-004 Agent Gateway Safety Evaluations
- **Objective**: Prevent unsafe agent behaviors from re-entering the codebase by enforcing adversarial scenarios and coverage.
- **Evidence Sources**:
  - Harness implementation: `server/src/security/evals/`
  - Scenario pack: `server/security/scenarios/`
  - CI enforcement: `.github/workflows/ci-security-evals.yml`
  - CLI entrypoint: `server/scripts/security-eval.ts`

## How to Verify

1. From a fresh checkout, run `pnpm install` then `pnpm security:eval --json`.
2. Confirm exit code is `0` and JSON shows no failed scenarios.
3. Verify coverage: each category count ≥3.
4. Check workflow run logs for artifact `agent-security-evals.json` on PRs.

## Notes

- Harness is deterministic and offline; no secrets or network calls are required.
- Failures emit actionable findings with remediation text to satisfy auditability.
