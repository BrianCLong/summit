# PR Security Checklist

This checklist is mandatory for all Pull Requests that touch sensitive components (auth, cryptography, data access) or fix security vulnerabilities.

## 1. Vulnerability Fixes
If this PR fixes a known vulnerability (CVE or internal finding):
- [ ] **Reproduction**: A test case is added that reproduces the vulnerability (and fails without the fix).
- [ ] **Root Cause**: The root cause is identified and explained in the PR description.
- [ ] **Completeness**: The fix addresses all variants of the vulnerability (e.g., all entry points for an XSS).
- [ ] **Regression**: Existing tests pass, and the new test case passes with the fix.

## 2. Authentication & Authorization
If this PR modifies auth logic:
- [ ] **No Hardcoded Secrets**: No keys, tokens, or passwords are hardcoded.
- [ ] **Scope Validation**: Ensure the user has the correct permissions (scopes/roles) for the action.
- [ ] **Session Handling**: Session tokens are handled securely (HttpOnly cookies, secure storage).
- [ ] **Insecure Direct Object Reference (IDOR)**: Ensure users can only access their own data.

## 3. Input Validation & Data Handling
- [ ] **Sanitization**: All user input is sanitized before use (SQL, HTML, shell commands).
- [ ] **Validation**: Input is validated against strict allowlists (type, length, format).
- [ ] **Secrets**: No secrets are logged or exposed in error messages.
- [ ] **PII**: Personally Identifiable Information is handled according to privacy policies (encryption, masking).

## 4. Dependencies
- [ ] **Lockfile**: `package-lock.json` or `pnpm-lock.yaml` is updated.
- [ ] **Audit**: `npm audit` or `pnpm audit` shows no new critical vulnerabilities.
- [ ] **Review**: The changelog of the updated dependency has been reviewed for breaking changes or security notes.

## 5. Deployment & Config
- [ ] **Configuration**: Security headers (CSP, HSTS) are maintained.
- [ ] **Feature Flags**: High-risk changes are behind a feature flag.
- [ ] **Rollback**: A rollback plan is documented in the PR description.
