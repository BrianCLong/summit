# GitHub App Automation

The GitHub App complements the CI gates by opening remediation PRs and attaching signed supply-chain evidence.

## Responsibilities
- Listen for `security_advisory` and `repository_vulnerability_alert` events.
- For each affected manifest:
  - Download the latest SBOM and vulnerability manifest from `security/supply-chain/artifacts/`.
  - Open a PR with upgraded dependency versions and attach SBOM + vuln manifest as PR assets.
  - Apply labels: `security`, `sca`, `auto-fix`, and severity derived from CVSS.
- Enforce dual-control on license exceptions by requiring a reviewer from `dual_control.approvers` plus the service owner.

## Installation scopes
- Permissions: `contents: write`, `pull_requests: write`, `security_events: read`, `metadata: read`.
- Webhook secrets should be stored in `COMPLIANCE_CENTER_TOKEN`-backed secret storage to align with manifest export controls.

## Burn-down signals
The App emits metrics to the dashboards described in `dashboards/README.md`:
- `github_app.pr_opened_total` – tagged by severity and package name.
- `github_app.merge_latency_seconds` – monitors remediation time.
- `github_app.license_exception_requested_total` – ensures dual-control approval rates stay compliant.
