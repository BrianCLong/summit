# SOC Compliance CI Gate

**Authority**: Platform Engineering
**Last Updated**: 2026-02-01
**Owner**: Security & Compliance

## Purpose

SOC control verification is a **required CI gate**. Every PR and push to `main` must run the SOC
control unit tests to preserve audit readiness and enforce compliance baselines.

## CI Workflow

- **Workflow**: `.github/workflows/soc-controls.yml`
- **Check Name**: `SOC Controls`
- **Artifacts**: `soc-compliance-report` (XML reports)

## Local Execution

Run the SOC control tests locally with the same command used in CI:

```bash
bash scripts/test-soc-controls.sh soc-compliance-reports
```

Reports are written to the `soc-compliance-reports/` directory.

## Required Checks Policy

The required check is defined in:

- `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- `docs/ci/REQUIRED_CHECKS_POLICY.json`

Branch protection reconciliation is executed via:

```bash
scripts/release/reconcile_branch_protection.sh --branch main
```

## Troubleshooting

- Confirm the SOC tests exist under `server/tests/soc-controls/` or
  `server/src/services/__tests__/SOC2ComplianceService.test.ts`.
- If the SOC tests fail, review the XML report artifacts uploaded by the workflow.
