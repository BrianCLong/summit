# Stop-the-Line Enforcement

This document defines the conditions under which the autonomy system must halt operations ("stop the line") to prevent damage or unsafe deployments.

## Mechanism

The `enforce_stop_the_line.ts` script evaluates the current state against the `autonomy_policy.yml`. If a "Stop-the-Line" condition is met, it:
1.  Fails the CI build.
2.  Generates a `stop-the-line.json` artifact.
3.  Escalates via an issue (or other configured channels).

## Conditions

Stop-the-line is triggered if:

*   **Critical Anomaly**: A KPI deviation classified as `CRITICAL`.
*   **Security Breach**: Open critical vulnerabilities in production artifacts.
*   **Policy Violation**: `autonomy_policy.yml` integrity check fails.
*   **Runaway Autonomy**: Too many autonomous PRs created in a short window (Circuit Breaker).

## Recovery

To resume operations:
1.  Address the root cause (fix the bug, resolve the vulnerability).
2.  Manually override the stop (requires Admin approval).
3.  Re-run the verification suite.
