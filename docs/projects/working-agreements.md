# Working Agreements

## Definition of Ready (DoR)

An item is considered "Ready" when it meets the following criteria:

*   **Description**: The user story or task is clearly defined.
*   **Acceptance Criteria**: A checklist of conditions for completion is present.
*   **Estimate**: The item has a story point estimate (`Estimate` field).
*   **Owner**: An owner is assigned.
*   **Dependencies**: There are no blocking dependencies, or they are explicitly noted in the `Blocked by` field.

## Definition of Done (DoD)

An item is considered "Done" when it meets the following criteria:

*   **Merged**: The associated Pull Request has been merged to the default branch (`main` or `master`).
*   **Tests Pass**: All automated tests (unit, integration, E2E) are passing.
*   **Docs Updated**: Any necessary documentation changes have been made.
*   **Release Notes**: A draft of release notes has been added if applicable.
*   **Monitoring**: Telemetry, alerts, or dashboards have been added or updated if applicable.
