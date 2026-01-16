# Autonomy Policy

This document defines the rules and constraints for the "Assurance-Driven Autonomy" system. Agents are granted limited autonomy to perform actions on the codebase, subject to strict verification and audit trails.

## Principles

1.  **No Silent Changes**: All autonomous actions must be logged and attributable.
2.  **Deterministic Outputs**: Actions must be reproducible from the same inputs and policy.
3.  **Safe-by-default**: Default mode is dry-run. Execution requires explicit policy and approval.
4.  **Never Auto-Merge**: If merges occur, they must be human-approved and evidenced.

## Triggers

Agents may react to the following triggers:

*   **Anomalies**: Deviations from expected behavior or metric baselines.
*   **Drift**: Discrepancies between defined configuration (IaC, Policy) and actual state.
*   **Missing Evidence**: Required artifacts or documentation missing for a release or control.
*   **Expiring Exceptions**: Security or compliance exceptions nearing their expiration date.

## Allowed Actions

Subject to policy constraints, agents may:

*   **Open Issue**: Create a GitHub issue to report a signal.
*   **Open PR**: Create a Pull Request with a proposed remediation.
*   **Comment**: Add a comment to an existing Issue or PR.
*   **Label**: Add or remove labels from an Issue or PR.
*   **Assign**: Assign users to an Issue or PR.

## Prohibited Actions

Agents are strictly forbidden from:

*   **Merge**: Merging PRs (must be human-initiated).
*   **Force Push**: Overwriting history.
*   **Delete**: Deleting branches, tags, or resources (unless in specific temporary scopes).
*   **Secrets Access**: Reading or modifying secrets (except rotating strictly scoped agent tokens if empowered).

## Blast Radius Limits

To prevent runaway automation:

*   **Max Files Changed**: Limit per PR.
*   **Max PRs/Day**: Global limit to prevent flooding.
*   **Max Repos Affected**: Limit scope of impact.

## Approval Requirements

*   Policy changes require `admin` approval.
*   Execution mode enabling requires `admin` or `ops-lead` approval.
