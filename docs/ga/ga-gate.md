# General Availability (GA) Release Gate

The GA gate is the single source of truth for governance, security, quality, and observability
controls required before merging into `main`. The gate is deterministic, auditable, and enforced in
CI.

## Gate specification

The JSON block below is parsed directly by automation. Update it intentionally and keep it stable.

<!-- GA-GATE-SPEC:START -->

```json
{
  "requiredChecks": ["tests", "typecheck", "lint", "build"],
  "securityChecks": ["dependency-audit", "provenance"],
  "governance": {
    "codeownerPaths": ["/server", "/apps/web", "/packages"],
    "requiredLabels": ["area/*", "risk/*"],
    "minApprovals": 2
  },
  "observability": {
    "sloFiles": ["slo/availability.yaml", "slo/latency.yaml", "slo/server.yaml"]
  }
}
```

<!-- GA-GATE-SPEC:END -->

## Required checks

- **Tests**: `pnpm test --runInBand`
- **Typecheck**: `pnpm typecheck`
- **Lint**: `pnpm lint`
- **Build**: `pnpm build`

These checks must be present and passing for every pull request into `main`.

## Security checks (placeholders)

- **Dependency audit**: placeholder hook for SBOM/dependency scanning. Currently a deterministic
  placeholder that records the result and must remain green.
- **Provenance**: placeholder hook for release provenance/attestation verification. Currently a
  deterministic placeholder that records the result and must remain green.

## Governance checks

- **CODEOWNERS**: approvals required for changes touching `/server`, `/apps/web`, or `/packages`.
- **Labels**: pull requests must contain at least one `area/*` label and one `risk/*` label.
- **Reviews**: a minimum of two approvals are required on every pull request into `main`.

## Observability checks

- **SLO configuration**: the gate validates that the SLO configuration files listed in the gate
  specification are present in the repository. Missing files block the merge.

## Reporting

The GA workflow emits a machine-readable report at `artifacts/ga-report.json` that captures:

- Commit SHA evaluated
- Per-check results and messages
- Timestamp of evaluation
- Overall gate verdict (pass/fail)

The report is uploaded as a workflow artifact to provide an auditable trail for every gate
execution.
