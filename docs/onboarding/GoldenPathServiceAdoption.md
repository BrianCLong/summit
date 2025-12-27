# Golden Path Service Adoption

This guide outlines how to onboard a service onto the Summit Golden Path. Follow the steps in
order to keep governance, reliability, and compliance signals aligned with the platform’s CI
standards and workflow gates.

## Prerequisites

- Confirm the service is scoped to a single zone (server, web app, client, or docs) before
  making changes.
- Review the CI requirements in
  [docs/CI_STANDARDS.md](../CI_STANDARDS.md) and plan to run
  `scripts/check-boundaries.cjs` before submitting.
- Use the Golden Path onboarding PR template in
  [templates/golden-path-onboarding/](../../templates/golden-path-onboarding/).

## Step 1: Choose the Service

1. Identify the service name, owning team, and primary zone.
2. Document the service boundary (APIs, storage, and dependencies) and ensure it does not
   cross zones without a shared `packages/` contract.
3. Add the service to your onboarding PR with a short scope summary and owners.

## Step 2: Add OPA Policy Gates

1. Locate the relevant policy entry points under `server/src/policies/`.
2. Add policy-as-code rules that enforce:
   - data access and RBAC requirements,
   - audit logging for sensitive operations,
   - required approvals for high-risk changes.
3. Reference the policy changes in the PR and include the policy decision logs in the
   evidence pack.

## Step 3: Set Canary Thresholds

1. Define service SLOs (latency, error rate, availability) and expected alert thresholds.
2. Configure canary limits for:
   - error budget burn rate,
   - latency regression thresholds,
   - rollback triggers.
3. Include the SLO and canary thresholds in the template PR placeholders for review.

## Step 4: Add Evidence Pack

1. Prepare an evidence pack configuration (see
   [templates/golden-path-onboarding/disclosure-pack.yaml](../../templates/golden-path-onboarding/disclosure-pack.yaml)).
2. Attach:
   - policy decision logs,
   - CI workflow output references,
   - rollout and canary metrics snapshots,
   - approval or risk reviews (if applicable).
3. Store the evidence pack under the expected compliance location and link it in the PR.

## Required Checks and CI Alignment

- CI requirements are defined in
  [docs/CI_STANDARDS.md](../CI_STANDARDS.md). Ensure your PR meets lint, typecheck,
  security, unit test, and golden path smoke checks.
- Run the boundary validator before submitting:

  ```bash
  node scripts/check-boundaries.cjs
  ```

- Validate that your change aligns with the active workflows in `.github/workflows/`,
  especially:
  - [ci.yml](../../.github/workflows/ci.yml)
  - [ci-lint-and-unit.yml](../../.github/workflows/ci-lint-and-unit.yml)
  - [ci-security.yml](../../.github/workflows/ci-security.yml)
  - [ci-golden-path.yml](../../.github/workflows/ci-golden-path.yml)

## Example PR Reference

- See the sample PR analysis for alignment cues:
  [docs/archive/root-history/PR_ANALYSIS.md](../archive/root-history/PR_ANALYSIS.md).

## Known Issues / Gotchas

Review the onboarding-specific gotchas in
[docs/onboarding/known-issues.md](known-issues.md) before starting.
