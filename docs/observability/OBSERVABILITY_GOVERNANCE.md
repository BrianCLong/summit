# Observability Governance

This document outlines the governance structure for observability practices, including logging, metrics, and tracing.

## 1. Logging Safety

### Policy
All code changes must adhere to the [Logging Safety Rules](./LOGGING_SAFETY_RULES.md). The primary goal is to prevent secret leakage into logs.

### Automation
*   **Tool**: `scripts/ci/check_logging_safety.mjs`
*   **Trigger**: Runs as part of the `verify` job in the `CI` workflow.
*   **Behavior**:
    *   Scans for regex patterns like `console.log(process.env)` or `console.log(token)`.
    *   Fails the build if high-risk patterns are detected.
    *   Supports exclusions via `// no-log-check` comments.

### Override / Exemption
To override a check:
1.  **Code Level**: Add `// no-log-check` to the specific line. This must be justified in the PR description.
2.  **Repo Level**: Only the Platform Engineering or Security team can modify the guardrail script or disable the CI step.

## 2. Metric Standards
(Placeholder for future metric governance)

## 3. Tracing Standards
(Placeholder for future tracing governance)
