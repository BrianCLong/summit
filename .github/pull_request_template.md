## Summary

<!-- What does this PR do? Link to Jira ticket or issue. -->

## Type of Change

- [ ] Bug Fix
- [ ] New Feature
- [ ] Refactor
- [ ] Documentation
- [ ] Infrastructure

## Green CI Contract Checklist

<!-- Must be checked before merge. See docs/governance/GREEN_CI_CONTRACT.md -->

- [ ] **Lint**: Ran `pnpm lint` locally.
- [ ] **Tests**: Ran `pnpm test:unit` locally.
- [ ] **Determinism**: No leaked singletons or open handles.
- [ ] **Evidence**: Added at least one test case or verification step.

## Temporary Merge Guardrails (CI Non-Blocking Only)

<!-- Complete when CI test/governance/provenance jobs are continue-on-error. -->

- [ ] `CI=1 TZ=UTC pnpm lint`
- [ ] `CI=1 TZ=UTC pnpm verify`
- [ ] `CI=1 TZ=UTC pnpm test:unit`
- [ ] `CI=1 TZ=UTC pnpm test:integration` (only if integration surfaces were touched)
- [ ] `CI=1 TZ=UTC make smoke` (required for runtime, infra, deployment, or build changes)

## Verification Plan

<!-- How did you verify this change? -->

- [ ] Automated Test (Unit/Integration)
- [ ] Manual Verification (describe steps below)
- [ ] Snapshot / Screenshot

```bash
# Paste verification output here
```
