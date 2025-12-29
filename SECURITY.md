# Security Policy

This document outlines the security policy for the Summit (IntelGraph) platform.

## Threat Model

_(Coming soon)_

## Security Controls

Our CI/CD pipeline enforces a number of security controls on every pull request and release. These controls are defined in the `.github/workflows/ci-security.yml` workflow.

- **Secret Scanning**: We use `gitleaks` to scan for hardcoded secrets in the codebase. This is configured to run on every pull request and fail the build if any secrets are found.

- **Static Application Security Testing (SAST)**: We use `CodeQL` and `Semgrep` to identify potential vulnerabilities in our code. `CodeQL` is configured to run on both JavaScript and Python code. `Semgrep` uses the `p/ci` ruleset to check for common security issues.

- **Dependency Vulnerability Scanning**: We use `Snyk` to scan our dependencies for known vulnerabilities. The `SNYK_FAIL_THRESHOLD` is set to `high`, which means that pull requests with `HIGH` or `CRITICAL` vulnerabilities will be blocked from merging.

- **Filesystem and Container Scanning**: We use `Trivy` to scan our filesystem and container images for vulnerabilities. This includes scanning for known CVEs in the operating system and application packages.

- **Infrastructure-as-Code (IaC) Scanning**: We use `Checkov` to scan our Terraform and Helm charts for misconfigurations. This helps to ensure that our infrastructure is deployed in a secure manner.

- **Policy Enforcement**: We use `OPA/Conftest` to enforce policies on our Kubernetes manifests. This allows us to define and enforce custom security policies for our production environment.

- **Dynamic Application Security Testing (DAST)**: We use `OWASP ZAP` to perform dynamic analysis of the running application. This is configured to run on a weekly schedule against the staging environment.

## Incident Response

_(Coming soon)_

## Reporting a Vulnerability

Please report any security vulnerabilities to our security team at `security@summit.ai`. We appreciate your efforts to disclose your findings responsibly.
