# Security Policy

## Reporting Vulnerabilities
- Please report suspected vulnerabilities via security@intelgraph.example.com or the private security issue template.
- Include reproduction steps, affected versions, and potential impact. Do not share exploits publicly until a fix is released.

## Supported Versions
- The `main` branch and the latest tagged release receive security fixes.
- Older releases may receive fixes on a best-effort basis for 90 days after a new minor release.

## Secrets Policy
- Never commit real secrets or credentials. Use environment variables and `.env.example` patterns instead.
- Rotate any credentials that may have been exposed and notify the security team immediately.
