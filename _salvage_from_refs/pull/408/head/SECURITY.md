# Security Policy

- Report vulnerabilities via GitHub Issues or security@intelgraph.com.
- Do not include sensitive data in issues. We will coordinate a private disclosure.
- We run secret scanning and gitleaks in CI; please keep secrets out of code.

## Application Hardening

- User input is sanitized at API boundaries to reduce injection risk.
- RBAC and OPA policies enforce least-privilege access across services.
- Secrets are stored in encrypted form via [`sops`](.sops.yaml) and loaded from environment variables.

