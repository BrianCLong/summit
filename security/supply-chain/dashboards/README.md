# Supply Chain Dashboards

## Vulnerability burn-down
- **Purpose:** Track remediation velocity and backlog by service and severity.
- **Inputs:** Signed vulnerability manifests exported from CI (`artifacts/vulns.json`), baseline CVSS threshold, and fix availability.
- **Visuals:**
  - Time-series of critical/high counts; shaded SLA windows.
  - Table of top offenders with fix versions and owning team.
  - SLA breach gauge driven by `policy.yaml`.
- **Query hints:** Use Grafana Loki or Prometheus labels `service`, `version`, `severity`, `fix_available`, and `attested=true` to filter only signed reports.

## License exceptions
- **Purpose:** Ensure dual-control approvals and aging limits are enforced.
- **Inputs:** License exception manifests signed via Cosign, including approver emails and expiration dates.
- **Visuals:**
  - Pie chart of exception status (active, expiring, expired).
  - Table of exceptions with dual approvers and justification.
  - Alert panel for items expiring within `exception_window_days`.
- **Query hints:** Persist exceptions in Compliance Center with labels `license`, `approvers`, `expires_at`, `service`, `signature_digest`.

## GitHub App automation
- Emits metrics on created PRs, merge rate, and mean time to remediate by severity.
- Uses repository dispatch events to attach CI-generated SBOM and vuln manifests to PRs for reviewers.
