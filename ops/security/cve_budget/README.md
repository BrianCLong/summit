# CVE Budget Policy Gate

This module implements the Track B "Risk & Compliance Automation" gate:

- **CI policy step** that parses SBOM and vulnerability scan artifacts, enforces per-service CVE budgets, and emits evidence artifacts.
- **Runtime admission checks** implemented with OPA/Rego to reject unsigned or unattested images.
- **Operational reporting** including Grafana dashboards and weekly Markdown exports.

## Components

| File          | Purpose                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------- |
| `config.yaml` | Declarative budgets, owners, and waiver definitions.                                        |
| `gate.py`     | CI entrypoint. Evaluates SBOM + vulnerability scan data and enforces budgets.               |
| `fixtures/`   | Sample SBOM, vulnerability reports, failing build logs, and release manifests for evidence. |

The policy gate executes in three phases:

1. **Ingest** – Load SBOMs and vulnerability reports. The gate validates that every vulnerability maps to a package in the SBOM to catch stale/incorrect scans.
2. **Policy evaluation** – Compare severity counts per service with budgets and apply any active waivers. Expired waivers are surfaced as violations.
3. **Reporting** – Emit machine readable JSON (`--output`) and optional Markdown weekly report (`--weekly-report`). Both artifacts power the Grafana dashboard and compliance evidence bundle.

Budgets and waivers are data-only; changing thresholds does not require code edits. The OPA bundle in `policy/opa/cve_budget.rego` consumes the same structure so CI, runtime gates, and dashboards stay consistent.

## Usage

```bash
python ops/security/cve_budget/gate.py \
  --config ops/security/cve_budget/config.yaml \
  --sbom ops/security/cve_budget/fixtures/sbom-conductor-api.json \
  --sbom ops/security/cve_budget/fixtures/sbom-inference-worker.json \
  --vulns ops/security/cve_budget/fixtures/vuln-report-pass.json \
  --output runs/cve-budget-latest.json \
  --weekly-report reports/security-weekly-2025-09-01.md
```

Exit code is non-zero when any budget is exceeded, when unsigned/unstamped images are present, or when an SBOM is missing.
