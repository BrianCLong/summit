# Sprint 13 Test Plan

## SSO Configuration
- Validate OIDC metadata and JWKS retrieval.
- Test SAML metadata upload errors.

## Feature Flags
- Ensure server evaluation and audit logging.
- Kill switch disables features immediately.

## Metering Accuracy
- Simulate API and compute usage; verify billing totals within 5%.

## Plugin Sandbox
- Attempt network/file access without capability and expect denial.
- Load unsigned plugin and expect rejection.

