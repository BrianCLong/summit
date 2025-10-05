# Intelgraph Security & Compliance Pipeline

The security suite protects every pull request, push to `main`, and deployment by
running a consistent set of automated controls defined in
[`.github/workflows/ci-security.yml`](../../.github/workflows/ci-security.yml).
The workflow also exposes a `workflow_call` trigger that is invoked by deployment
pipelines, guaranteeing that production promotions only proceed after every
required control has passed and the security gate has been explicitly approved.

## Automated controls

| Control | Tooling | Purpose | Blocking criteria |
| --- | --- | --- | --- |
| Secret scanning | Gitleaks | Detect committed credentials and high-entropy strings | Any finding fails the job |
| SAST | GitHub CodeQL | Identify code-level vulnerabilities across JS/TS and Python stacks | CodeQL alerts fail the workflow |
| Dependency scanning | Snyk | Surface vulnerable OSS dependencies across Node workspaces | Fails on `high` or `critical` severity and any policy violation |
| File system scan | Trivy (`fs` mode) | Catch OS/library CVEs, misconfigurations, and secrets inside the repo | Fails on `high`/`critical` findings |
| Container image scan | Trivy (`image` mode) | Build and inspect server/client images for OS and library CVEs | Fails on `high`/`critical` findings |
| License compliance | Trivy (`license` scanner) | Enforce license policy and flag incompatible packages | Fails on disallowed licenses |
| IaC scan | Checkov | Evaluate Terraform, Helm, Kubernetes assets against best practices | Any `FAIL` result fails the job |
| Policy enforcement | OPA Conftest | Enforce custom policies across rendered Helm manifests | Any policy violation fails the job |
| CIS benchmark | Trivy compliance | Validate rendered manifests against Kubernetes CIS 1.23 | Any benchmark violation fails the job |
| Baseline controls | `scripts/security/baseline-check.sh` | Verify foundational governance controls (SECURITY.md, Dependabot, CODEOWNERS, etc.) | Missing baseline artefacts fail the job |
| DAST | OWASP ZAP baseline | Probe the running stack for runtime vulnerabilities | High/medium alerts fail the job |

Each job uploads SARIF/JSON artefacts into a shared `security-reports` bundle,
allowing the `security-summary` stage to compute coverage metrics and publish a
human-readable dashboard directly in the workflow summary.

## Security gate and approvals

The `security-summary` job aggregates the status of every control, publishes
`security-summary.json`, and emits a link to the GitHub Security dashboard. The
follow-up `production-approval` job runs when the workflow is called from a
deployment or when `main` is updated. It targets the `production-security-gate`
environment so that required reviewers can confirm the findings before images or
artifacts are promoted.

To use the gate effectively:

1. Configure the `production-security-gate` environment in GitHub with the
   appropriate security approvers.
2. Review the workflow summary and attached SARIF/JSON artefacts when the job
   pauses for approval.
3. Approve or reject the gate; deployments will only continue after approval.

## Reporting and dashboards

* SARIF results for CodeQL, Snyk, Trivy, and Checkov are uploaded to the GitHub
  Security tab for consolidated tracking.
* The aggregated `security-summary.json` artefact captures the list of reports
  that were generated and the final status of each control. The summary section
  in the workflow run includes a table of all controls plus a quick link to the
  Security dashboard.
* Deployment workflows inherit the same suite through `uses: ./.github/workflows/ci-security.yml`,
  ensuring that every promotion produces the same artefacts and approval trail.

## Remediation workflow

1. **Triage** – Use the SARIF results in the Security tab or download the
   corresponding artefact to inspect failing controls.
2. **Assign** – Update the issue tracker with the failing control, linking to the
   workflow run. Set severity based on the blocking criteria listed above.
3. **Remediate** – Patch the vulnerability, update dependencies, or adjust the
   IaC/policy configuration. Follow least privilege principles for secrets.
4. **Verify** – Re-run the workflow (push to the branch or trigger a manual run)
   to confirm that the control now passes.
5. **Document** – Capture remediation notes in the PR description or in
   `docs/security/` so institutional knowledge persists.

## Exception handling

Exceptions must be rare, time-boxed, and auditable:

* File an issue describing the finding, impact, justification, and expiration
  date.
* Add the issue number to the PR description and obtain security approval for the
  temporary exception.
* Use allow-lists only where supported (for example, OPA `policies/opa/` or
  `.zap/rules.tsv`). Never disable a check globally.
* Track the exception in the issue backlog and verify resolution before the
  expiration date; the security gate should not be bypassed permanently.

## Operational requirements

* Set the `SNYK_TOKEN` secret (or provide one via reusable workflow inputs) so
  dependency scans can authenticate.
* Keep `.zap/rules.tsv`, OPA policies, and Helm values in sync with production to
  maintain accurate scanning coverage.
* Update this document whenever new controls, thresholds, or remediation
  practices are introduced.
