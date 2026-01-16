# CI Gate (Umbrella Required Check)

## Purpose

CI Gate is an always-on, deterministic umbrella check designed to prevent required-check deadlocks
caused by workflow-level path or branch filters. It aligns with the Summit Readiness Assertion by
keeping readiness signals present for every pull request, merge queue run, and push to `main`.

## Why It Exists

Workflow-level `paths` or `paths-ignore` filters can prevent checks from reporting, leaving branch
protection stuck in a "Waiting for status to be reported" state. CI Gate avoids that by always
triggering, and then conditionally running suite jobs at the job level.

## Workflow-Level Filter Audit (Deadlock Candidates)

Workflow-level filters are present in the following workflows and can cause required-check deadlocks
if they are configured as required checks:

- `.github/workflows/a11y-keyboard-smoke.yml`
- `.github/workflows/api-lint.yml`
- `.github/workflows/audit-exception-expiry.yml`
- `.github/workflows/branch-protection-drift.yml`
- `.github/workflows/ci-core.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/compliance-governance.yml`
- `.github/workflows/compliance.yml`
- `.github/workflows/dependency-audit.yml`
- `.github/workflows/dependency-freeze-check.yml`
- `.github/workflows/doc-link-check.yml`
- `.github/workflows/docs-lint.yml`
- `.github/workflows/docker-build.yml`
- `.github/workflows/ga-gate.yml`
- `.github/workflows/ga-ready.yml`
- `.github/workflows/governance-dashboard-publish.yml`
- `.github/workflows/governance-drift-check.yml`
- `.github/workflows/governance-lockfile-verify.yml`
- `.github/workflows/governance-policy-validation.yml`
- `.github/workflows/governance-regression-guard.yml`
- `.github/workflows/graph-guardrail-fuzz.yml`
- `.github/workflows/hello-service-ci.yml`
- `.github/workflows/intelgraph-ci.yml`
- `.github/workflows/perf.yml`
- `.github/workflows/policy-auto-tuning-ci.yml`
- `.github/workflows/promptpack.yml`
- `.github/workflows/pr-gates.yml`
- `.github/workflows/redaction-tests.yml`
- `.github/workflows/release-lint.yml`
- `.github/workflows/release-ops-orchestrator.yml`
- `.github/workflows/release-policy-tests.yml`
- `.github/workflows/release-train-dashboard.yml`
- `.github/workflows/required-checks-exceptions.yml`
- `.github/workflows/schema-compat.yml`
- `.github/workflows/schema-compatibility-check.yml`
- `.github/workflows/schema-diff.yml`
- `.github/workflows/stabilization-report.yml`
- `.github/workflows/supply-chain-integrity.yml`
- `.github/workflows/type-safety-audit.yml`
- `.github/workflows/unit-test-coverage.yml`
- `.github/workflows/web-accessibility.yml`
- `.github/workflows/workflow-lint.yml`
- `.github/workflows/golden-path/ci-consolidated-example.yml`

## What Runs

CI Gate uses a change-detection job and then runs suites only when relevant:

- **Backend Suite**: runs for backend-related changes.
- **Frontend Suite**: runs for frontend-related changes.
- **CI Governance Suite**: runs for CI/configuration changes.

Suites that are not relevant are skipped and treated as **Governed Exceptions**. The umbrella gate
passes when suites are successful or skipped, and it fails when any required suite fails, is
cancelled, or times out.

## Required Check Name (Exact String)

Require the umbrella gate job as a single required check:

```
CI Gate / Umbrella Gate
```

## Merge Queue Compatibility

CI Gate triggers on `merge_group` events so required checks are reported for merge queue builds.

## Admin Handoff: Branch Protection Update

1. Add the required check name above to branch protection for `main`.
2. Remove legacy required checks once CI Gate is verified as stable.
3. Keep any GitHub-native checks that must remain always-on (e.g., code scanning) alongside CI Gate.

## Verification Guidance

- **Docs-only PR**: CI Gate runs, suites are skipped, gate passes quickly.
- **Backend-only PR**: Backend Suite runs, other suites skip, gate reflects the results.
- **Failing suite**: CI Gate fails and surfaces the failing suite in the step summary.
