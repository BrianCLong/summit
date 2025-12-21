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

## Remediation playbook
1. **Triage quickly**: confirm the report, gather logs, reproduction steps, and affected commit/branch.
2. **Containment**: revoke exposed credentials, disable compromised tokens, and rotate keys immediately.
3. **Assessment**: classify severity (CVSS-lite), identify blast radius, and determine affected components.
4. **Fix and verify**: land a patch on a protected branch, add regression tests, and rerun gitleaks + OSV scanner.
5. **Release**: cut a patch release or hotfix; notify stakeholders privately; update advisories when public.
6. **Postmortem**: document timeline, contributing factors, and preventative actions; backlog follow-up work.
