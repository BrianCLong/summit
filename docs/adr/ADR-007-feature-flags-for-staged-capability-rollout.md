# ADR-007: Feature Flags for Staged Capability Rollout

## Status
Accepted

## Context
As we develop complex features for Summit, such as the Multi-Agent Counter-Sensor Orchestrator (MACO) and new risk-based alerting paradigms, deploying these capabilities all at once increases operational risk. We need a way to integrate code into the `main` branch frequently (avoiding long-lived feature branches) while keeping unfinished or experimental features disabled until they are fully validated.

## Decision
We utilize a feature flag system to manage the staged rollout of new capabilities.

1.  **Centralized Flag Management:** For Python modules within the `summit` package, feature flags are explicitly managed in `summit/flags.py`.
2.  **Environment Variable Backing:** The `is_feature_enabled(name, default)` function in `summit/flags.py` maps feature names to underlying environment variables, allowing operators to toggle features without requiring code changes or redeployments.
3.  **Continuous Integration:** New capabilities can be merged into `main` behind a feature flag, allowing them to be tested continuously in CI without affecting production behavior.

## Consequences

**Positive:**
-   **Reduced Deployment Risk:** Features can be turned on or off dynamically in production via environment variables, allowing for rapid rollbacks if issues arise.
-   **Continuous Integration:** Developers can merge code to `main` more frequently, avoiding the integration hell of long-lived feature branches.
-   **Staged Rollouts:** Enables targeted testing of new capabilities with specific users or in specific environments before a full release.

**Negative:**
-   **Code Complexity:** Feature flags introduce conditional logic throughout the codebase, making testing and maintenance more complex.
-   **Flag Debt:** Unused or obsolete feature flags must be actively managed and removed, otherwise they accumulate as technical debt and clutter the code.
