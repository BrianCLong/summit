# Pilot-to-Production Hardening Path

This runbook describes the maturity stages for promoting code from Pilot to Production.

## Maturity Model

We define three maturity stages:

### 1. PILOT (Experimental)
- **Pattern**: `main`, `*`
- **Description**: Rapid iteration, low governance.
- **Gates**:
  - All gates are **Report Only**. Failure does not block deployment to dev/staging.
  - Evidence is collected for traceability.

### 2. PRE_GA (Release Candidate)
- **Pattern**: `v*-rc.*`
- **Description**: Stabilization phase. Preparing for GA.
- **Gates**:
  - `promotion_guard`: **Required**. All required checks (tests, lint, security scan) must pass.
  - `observability_verify`: **Required**. Verification that metrics/logging are working.
  - `deps_approval`: Report Only (unless specifically enforced).
  - `policy_drift`: Report Only.
  - `field_budgets`: Report Only.

### 3. GA (General Availability)
- **Pattern**: `v*` (e.g., `v1.0.0`)
- **Description**: Production ready. Strict governance.
- **Gates**:
  - `promotion_guard`: **Required**.
  - `deps_approval`: **Required**. SBOMs must be generated and approved (if applicable).
  - `policy_drift`: **Required**. No policy violations allowed.
  - `field_budgets`: **Required**. Field budgets must be locked.
  - `observability_verify`: **Required**.

## Enforcement

Enforcement is handled by the `scripts/ci/evaluate_maturity_stage.ts` script running in CI workflows.

- **Tag Verification**: The `tag-verification` workflow runs maturity checks.
- **Release Workflows**: `release-ga` and `release-rc` enforce gates before publishing.

### Outputs
- `maturity-eval.json`: detailed machine-readable report.
- `maturity-eval.md`: human-readable report.

## Handling Failures

If a gate fails:
1. Check the `Maturity Evaluation` step in the GitHub Actions log.
2. Review `dist/maturity/maturity-eval.md` artifact.
3. Identify the blocking reason (e.g., "promotion_guard: CHECKS_PENDING").
4. Remediate the issue (fix tests, approve dependencies, etc.).
5. Re-run the workflow.

## Rollback / Emergency Override

To bypass maturity checks in an emergency (Break Glass):
1. Use the `override_freeze` input in the `release-ga` workflow if the issue is related to freeze windows.
2. For other gates, you must update `ci/maturity-stages.yml` to set the failing gate to `report_only` for the specific stage, commit, and push.
   **Warning:** This requires PR approval and leaves a permanent audit trail.

## Promoting a Stage

To promote a project's maturity (e.g., requiring stricter gates for Pilot):
1. Edit `ci/maturity-stages.yml`.
2. Change gates from `report_only` to `required`.
3. Verify with `npx tsx scripts/ci/validate_maturity_stages.ts`.
