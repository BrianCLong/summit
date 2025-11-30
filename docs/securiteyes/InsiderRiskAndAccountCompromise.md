# Securiteyes Insider Risk & Account Compromise

The Insider Risk module tracks risk scores for all principals (users, service accounts, integrations) to detect compromise or misuse.

## Risk Profiles

Each principal has an `InsiderRiskProfile` node in IntelGraph.

*   **Risk Score**: 0-100.
*   **Risk Factors**: JSON map of timestamped reasons for score increases.

## Calculation Logic

Risk is updated incrementally when `SuspiciousEvent` nodes are linked to a principal.

*   **Critical Severity**: +50
*   **High Severity**: +20
*   **Medium Severity**: +10
*   **Low Severity**: +2

*Note: This is a simplified additive model. Production systems should implement temporal decay.*

## High Risk Detection

The `/risk/high` endpoint returns all profiles with a score > 70 (configurable). These profiles should be prioritized for manual review or automated step-up authentication.
