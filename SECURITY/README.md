# Security Guardrails

This directory contains security policies and documentation for the guardrails enforced in this repository.

## Pre-commit Hooks

We use `pre-commit` to catch issues early:
- **Secret Scanning**: `gitleaks` and `trufflehog` scan for committed credentials.
- **Private Keys**: `detect-private-key` prevents key files from being added.
- **Linting**: standard linting (ruff, black, eslint) prevents some injection risks.

## Pipeline Checks

- **SAST**: Static Application Security Testing runs in CI.
- **Dependency Review**: We scan for vulnerabilities and license compliance.

## Troubleshooting

### Secret Detection Failure
If `gitleaks` fails:
1.  Verify if it is a true positive.
2.  If true, rotate the credential immediately.
3.  If false, add to `.gitleaksignore` or use inline allow comments (use sparingly).

### Policy Violation
Refer to `POLICY.md` for approved licenses and dependency rules.
