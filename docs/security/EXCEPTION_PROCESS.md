# Security Exception Process

This document outlines the process for requesting, approving, and managing security exceptions in the Summit platform.

## When to Request an Exception

Exceptions should only be requested when:
1.  A false positive is detected and cannot be suppressed via standard configuration.
2.  A vulnerability is deemed low risk in the specific context of deployment (e.g., dev-only tool).
3.  A fix is planned but immediate remediation is not feasible (e.g., waiting for vendor patch).

## Exception Lifecycle

1.  **Request**: Create a PR adding an entry to `docs/security/exceptions.yml`.
2.  **Review**: The Security or Platform Engineering team reviews the request.
3.  **Approval**: If approved, the PR is merged.
4.  **Expiry**: Exceptions automatically expire on the `expiry_date`.
5.  **Renewal**: To renew, a new PR must be submitted with updated rationale and expiry.

## Exception Format

Exceptions are defined in `docs/security/exceptions.yml` with the following schema:

```yaml
exceptions:
  - id: "EX-2025-001"
    check_id: "dependencies" # Must match a gate ID in security_gates.yml
    target: "package-name@1.2.3" # Specific artifact or rule
    rationale: "False positive, see vendor advisory link..."
    expiry: "2025-06-01"
    approver: "@security-lead"
    links:
      - "https://github.com/advisory/..."
```

## Enforcement

The CI/CD pipeline enforces exceptions. If a check fails and there is no valid, unexpired exception, the build fails.
