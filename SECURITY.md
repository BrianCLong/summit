# Security Policy

## Reporting Vulnerabilities
- Email security@intelgraph.example.com with details and proof-of-concept.
- Please include impact, affected versions/commit, and any known mitigations.
- We aim to acknowledge reports within 2 business days.

## Supported Versions
- Main branch and the latest two minor releases receive security patches.
- Older branches may receive fixes only for critical issues.

## Secrets and Sensitive Data
- Never commit secrets, keys, or credentials. Use environment variables or secret managers.
- Rotate credentials used for testing regularly and scope them to least privilege.
- Use `docker-compose.dev.yaml` for local overrides and avoid hardcoding secrets in code or configs.
