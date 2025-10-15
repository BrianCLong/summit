# Security Scanning Guide

This guide explains how automated vulnerability scanning is performed in the Summit CI pipeline and how to run the checks locally.

## Overview

The `Security Scans` GitHub Actions workflow builds the Summit Docker image, runs Trivy for image vulnerability analysis, and executes an OWASP ZAP baseline scan against an API endpoint. When high or critical issues are found, the workflow automatically opens (or updates) a GitHub issue summarizing the findings and attaches the raw reports as workflow artifacts.

## GitHub Actions Workflow

- **Location:** `.github/workflows/security-scans.yml`
- **Trigger:** Every pull request event (`opened`, `synchronize`, `reopened`, `ready_for_review`).
- **Jobs:**
  - Builds the application Docker image.
  - Runs `scripts/security/trivy-scan.sh` to generate `security-reports/trivy-report.json`.
  - Runs `scripts/security/zap-scan.sh` to produce reports in `security-reports/zap/` when a target URL is configured.
  - Summarizes the results and, when issues are found, creates or updates `Security Scan Findings for PR #<number>` in GitHub with a copy of the summary and attaches the raw artifacts.

### Required Secrets

| Secret | Purpose |
| ------ | ------- |
| `ZAP_TARGET_URL` | Publicly reachable base URL for the OWASP ZAP baseline scan. Leave unset to skip the API scan (the workflow logs the skip). |

## Local Execution

### Prerequisites

- Docker Engine 20.10+
- `jq` for parsing JSON output (optional for manual inspection)

### Trivy Image Scan

1. Build the Summit image locally:
   ```bash
   docker build -t summit-app:local .
   ```
2. Run the scan:
   ```bash
   scripts/security/trivy-scan.sh summit-app:local security-reports/trivy-report.json
   ```
3. Review the results in `security-reports/trivy-report.json`. High and critical issues are surfaced in the CI summary and GitHub issue.

### OWASP ZAP Baseline Scan

1. Ensure the API is running and reachable (for example, via `docker-compose` or a staging URL).
2. Execute the scan (replace the URL with your target):
   ```bash
   scripts/security/zap-scan.sh "http://localhost:3000" security-reports/zap
   ```
3. Inspect the generated Markdown, HTML, and JSON reports in `security-reports/zap/`.

## Results and Reporting

- Workflow artifacts (`security-reports`) contain the raw reports from both scanners.
- The GitHub issue includes a summary of high/critical Trivy findings and medium/high OWASP ZAP alerts.
- Existing open issues for the same PR are updated on subsequent workflow runs to avoid duplicates.

## Maintenance Tips

- Update the Trivy and ZAP container tags in the scripts periodically to keep scanner databases current.
- Consider pinning known false positives using Trivy ignore files (`.trivyignore`) or OWASP ZAP context files when necessary.
- Extend the workflow with additional scanners or notification targets as needed.
