# Retention Policy

## Artifacts
*   **Submission Bundles**: Retained indefinitely in local checkout for audit.
*   **Evidence Index**: Retained as part of git history.
*   **Logs**: CI logs retained per platform default (e.g., 90 days).

## Redaction
*   Sensitive tokens/keys must be redacted BEFORE commit.
*   Use `policy/never_log_fields.yml` to configure scrubbing tools.

## Credentials
*   **No portal credentials** (SAM.gov, DARPA, etc.) shall be stored in this repository.
