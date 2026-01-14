# Dependency & Supply-Chain Risk Gate Runbook

## Purpose

The Dependency Risk Gate enforces policy-as-code checks for dependency
vulnerabilities and license compliance across all workspaces. It emits
audit-ready evidence under `artifacts/governance/dependency-risk/<sha>/` and
blocks CI merges when risk exceeds policy.

## What the Gate Checks

- **Vulnerabilities**: `pnpm audit --json` results normalized into a canonical
  schema and evaluated against the policy threshold.
- **License Compliance**: Direct + transitive dependencies are inspected via
  installed package manifests and compared with allow/deny lists.
- **Governed Exceptions**: Temporary allowlists with expiration and rationale.

## How to Run Locally

```bash
pnpm ci:dependency-risk
```

Local runs respect the policy’s `network_access` and `audit_sources` settings.
If a source is marked `mode: ci`, it is skipped locally to avoid network calls.

## Interpreting the Report

Artifacts are written to:

```
artifacts/governance/dependency-risk/<sha>/
├── report.json
├── report.md
└── stamp.json
```

- `report.json`: Canonical machine-readable evidence.
- `report.md`: Human summary with remediation actions.
- `stamp.json`: Hashes + verdict for audit trails.

## Adding Allowlist Entries (Governed Exceptions)

Add explicit, time-bounded exceptions in
`docs/security/DEPENDENCY_RISK_POLICY.yml`:

```yaml
vulnerability_gate:
  allowlist:
    - id: "GHSA-xxxx-xxxx-xxxx"
      expires: "2026-03-01"
      rationale: "Vendor patch is queued in Q2."
```

Rules:

- **Expiry is mandatory**. Expired entries are treated as violations.
- **Rationale is mandatory**. Provide a remediation plan.

## Handling Unknown Licenses

Unknown licenses are classified per policy:

```yaml
license_gate:
  unknown_license_behavior: "fail" # or "warn"
```

If set to `fail`, any dependency without a resolvable license blocks the gate.
If set to `warn`, the gate passes but records the unknowns in the report.
