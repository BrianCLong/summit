# Stabilization Sustainability Controls

This document defines the limits and policies for the stabilization program to prevent backlog sprawl and ensure high-quality prioritization.

## Limits

The following limits are enforced on the `backlog.yaml` items:

| Category | Metric | Limit | Description |
| :--- | :--- | :--- | :--- |
| **Active** | P0 Items | 10 | Maximum number of active (not DONE) Critical items. |
| **Active** | P1 Items | 25 | Maximum number of active (not DONE) High priority items. |
| **Active** | Overdue | 15 | Maximum number of items past their target date. |
| **Backlog** | Blocked/Unissued P0 | 0 | **Zero Tolerance**. All P0 items must be fully issued (see below). |
| **Backlog** | Blocked/Unissued P1 | 3 | Max buffer for P1 items being drafted. |

## Requirements for New Items

All new P0 and P1 items must be "fully issued" before they can be added to the backlog. A fully issued item includes:

*   **Owner**: Who is responsible for delivery?
*   **Ticket**: Link to the tracking ticket (e.g., GitHub Issue, Jira).
*   **Target Date**: When is this expected to land?
*   **Acceptance Criteria**: What does "Done" look like?

### Example (backlog.yaml)

```yaml
- story: Fix critical security vulnerability
  priority: P0 - Must
  sprint: Sprint 1
  owner: jules
  ticket: PROJ-123
  target_date: "2025-10-30"
  acceptance_criteria: "Vulnerability scanned clean; Patch applied."
```

## Waivers

Exceptions to these limits can be granted via waivers in `docs/releases/STABILIZATION_LIMITS.yml`. Waivers must be explicit and time-boxed.

### How to request a waiver

Add an entry to the `waivers.list` section in `docs/releases/STABILIZATION_LIMITS.yml`:

```yaml
waivers:
  allowed: true
  list:
    - item: "Fix critical security vulnerability" # Must match story name exactly
      expires: "2025-11-15"
      reason: "Pending vendor patch"
```

## Enforcement

*   **PRs**: Validation runs in `warn` mode on Pull Requests changing the backlog.
*   **Scheduled**: Validation runs in `enforce` mode weekly and on release workflows. Violations will block the workflow.
*   **Reports**: A "Sustainability Report" is generated weekly at `artifacts/stabilization/sustainability/report.md`.
