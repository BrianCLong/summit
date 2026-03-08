# P0 Surfacing and Labeling Policy

## Objective
Ensure deterministic tracking and visibility of P0 (Priority 0) blockers to prevent silent issues from blocking GA readiness.

## Policy Definitions

1.  **Priority Taxonomy**:
    *   `prio:P0`: Critical blocker. Must be resolved before the next major release (e.g., GA). System is down, unusable, or suffers a severe security/compliance vulnerability.
    *   `P0-candidate`: Issues that show signs of being P0 but require immediate triage to confirm severity.
    *   `prio:P1`: High priority, significant impact, but workaround exists.
    *   `prio:P2`: Medium priority, standard bug or feature.

2.  **Deterministic Search Rules**:
    *   To surface active P0 blockers: `is:issue is:open label:prio:P0`
    *   To surface pending triage candidates: `is:issue is:open label:P0-candidate`

3.  **Triage Workflow**:
    *   Any `P0-candidate` issue must be evaluated by the Merge Captain or assigned triage owner within 4 hours.
    *   If confirmed critical, the label `P0-candidate` must be replaced with `prio:P0`.
    *   If non-critical, the label `P0-candidate` must be removed and the issue reassigned an appropriate priority (`prio:P1`, `prio:P2`, etc.).

4.  **Auto-Labeling Rules**:
    *   The Merge Engine enforces an auto-labeling taxonomy. Any issue missing priority labels will be automatically evaluated via CI/CD heuristics (e.g., `merge-blocker`, `ci-red`, `capture-needed`) to assign an initial `P0-candidate` label if critical signals are detected.
