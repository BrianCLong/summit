# Golden Path Service Adoption Guide

Use this guide to onboard a service onto the Summit Golden Path. It aligns the
service with policy gates, SLO expectations, and evidence requirements so it
passes CI and promotion checks.

## Who this is for

- Service owners adding a new or existing service to the Golden Path.
- Platform leads validating readiness for production and promotion.

## Prerequisites

- Review the Golden Path overview: [`docs/GOLDEN_PATH.md`](../GOLDEN_PATH.md).
- Review CI expectations: [`docs/CI_STANDARDS.md`](../CI_STANDARDS.md).
- Confirm required workflows match the current automation in
  [`.github/workflows/`](../../.github/workflows/).

## Adoption steps

### 1) Choose the service and scope

- Confirm the service ownership, runtime tier, and the user workflow it enables.
- Identify dependencies that must be available during Golden Path smoke tests.
- Document the service entrypoint and any required feature flags.

### 2) Add OPA policy gates (policy-as-code)

- Add or extend policy-as-code rules for the service in the policy engine.
- Ensure policy linting and simulation are covered by CI (see CI workflows).
- Capture any required policy exceptions in the policy exception ledger.

**Checklist**

- [ ] Policy rule created or updated.
- [ ] Policy simulation matches expected allow/deny outcomes.
- [ ] Policy decisions are logged for compliance review.

### 3) Define canary thresholds and SLOs

- Establish baseline SLO targets (latency, error rate, availability).
- Set canary thresholds and rollback triggers for deployments.
- Align thresholds with existing perf/SLO guardrails in workflows.

**Checklist**

- [ ] SLOs documented (target + measurement window).
- [ ] Canary thresholds set (error budget + latency guardrails).
- [ ] Alerting thresholds aligned with paging/notification policies.

### 4) Build the evidence pack

- Prepare the disclosure/evidence pack artifacts (policy checks, test runs,
  approvals, and release notes).
- Store evidence according to the disclosure bundle requirements.

**Checklist**

- [ ] Evidence pack generated and stored.
- [ ] Links to logs/artifacts included in the PR.
- [ ] Disclosure bundle configuration documented.

### 5) Validate required checks

Reference required checks in [`docs/CI_STANDARDS.md`](../CI_STANDARDS.md) and the
current workflows in [`.github/workflows/`](../../.github/workflows/):

- `CI` workflow (`.github/workflows/ci.yml`)
- `CI Golden Path` workflow (`.github/workflows/ci-golden-path.yml`)
- Reusable CI jobs referenced by those workflows (lint, typecheck, tests, smoke,
  security, perf, and policy simulation)

Run boundary validation before opening the PR:

```bash
node scripts/check-boundaries.cjs
```

### 6) Open the adoption PR

- Use the Golden Path onboarding PR template in
  [`templates/golden-path-onboarding/`](../../templates/golden-path-onboarding/).
- Include SLOs, alerting, runbook, and disclosure pack config placeholders.
- Link to a sample PR for reference:
  [`docs/archive/root-history/PR_ANALYSIS.md`](../archive/root-history/PR_ANALYSIS.md).

## Required artifacts

- SLO and canary configuration (documented).
- OPA policy changes (policy-as-code).
- Evidence/disclosure pack bundle.
- CI + boundary checks green.

## Reference

- CI standards: [`docs/CI_STANDARDS.md`](../CI_STANDARDS.md)
- Golden Path overview: [`docs/GOLDEN_PATH.md`](../GOLDEN_PATH.md)
- Known issues: [`docs/onboarding/known-issues.md`](./known-issues.md)
- Boundary checks: [`scripts/check-boundaries.cjs`](../../scripts/check-boundaries.cjs)
- Workflow definitions: [`.github/workflows/`](../../.github/workflows/)
