# RC1 Blocker: High Severity Security Vulnerabilities

## Description
Security scan (`pnpm audit`) found 12 vulnerabilities, including 5 HIGH severity ones in packages:
- `axios` (DoS via proto pollution)
- `mjml` (Directory traversal)
- `lodash` (Proto pollution)

## Impact
Exposes the platform to known exploits.

## Suggested Fix
Run `pnpm audit fix` or manually update the vulnerable packages to patched versions.
