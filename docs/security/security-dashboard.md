# Security Dashboard and Reporting

This dashboard specification provides the reporting artifacts required by dependency governance, DAST, and red-team simulations.

## Data Sources
- **Dependency Governance:** SARIF output from `security-governance` workflow (`tools/security/dependency-governance/output/`).
- **DAST:** ZAP HTML and JSON reports published as artifacts.
- **Red-Team Harness:** Scenario evidence bundles in `tools/security/redteam/runs/`.

## Key Panels
1. **Top Vulnerable Dependencies**
   - Aggregated by package name and version.
   - Shows severity counts and **time-to-fix** based on ticket creation date vs. remediation PR merge.
2. **Open Exceptions**
   - Expiry countdown, approving manager, linked ticket.
3. **DAST Findings by Service**
   - Severity trend line with SLA breach flags.
4. **Red-Team Regression Status**
   - Pass/fail per scenario with evidence bundle link.

## Time-to-Fix Calculation
- Each finding carries `opened_at` and `remediated_at` timestamps.
- `time_to_fix_days = (remediated_at - opened_at) / 86400` and is grouped weekly.

## Operational Usage
- Export SARIF and HTML artifacts to the observability bucket nightly via the `security-artifact-export` job (see `.github/workflows/security-governance.yml`).
- Grafana dashboard JSON resides in `tools/security/dashboards/security.json` (placeholder for import).
- Alerts: trigger when **CVE budget** exceeded, **exception** within 7 days of expiry, or **DAST SLA** exceeds 48 hours for High/Critical findings.
