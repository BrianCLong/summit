# Owner Routing for CI Failures

This document explains the Owner Routing system for CI regressions and failures.

## Overview

The goal of Owner Routing is to automatically assign the correct owner (team or individual) to CI failures based on explicitly defined rules. This ensures that failures are triaged and addressed promptly by the right people.

## How it Works

1.  **Mapping File**: The source of truth for ownership is `docs/ci/FAILURE_OWNERS.yml`.
2.  **Validation**: This file is validated in CI to ensure it follows the correct schema and rules.
3.  **Routing**: When CI failures occur (or during weekly trend analysis), a script (`scripts/ci/draft_ci_failure_issues.mjs`) resolves the owner for each failure.
4.  **Labeling & Mentioning**:
    *   If an owner is found, the failure report (issue or comment) is updated with:
        *   Owner labels (e.g., `owner/server`).
        *   A mention of the owner (e.g., `@team-server`).
    *   If no owner is found, the `needs-triage` label is applied.

## Mapping Specification (`docs/ci/FAILURE_OWNERS.yml`)

The mapping file defines "owners" and the criteria to match them to failures.

### Structure

```yaml
defaults:
  triage_label: needs-triage
  owner_label_prefix: owner/

owners:
  - id: OWN-001                   # Unique ID
    name: "Server Team"           # Human readable name
    github: ["@team-server"]      # GitHub handles (max 3)
    labels: ["owner/server"]      # Labels to apply
    areas: ["server", "api"]      # Metadata
    matches:                      # Matching criteria
      failure_codes: ["ERR-001"]  # Exact error code match (Highest Priority)
      categories: ["api"]         # Category AND Workflow match (Medium Priority)
      workflows: ["ci-api"]
      paths: ["server/**"]        # Path glob match (Lowest Priority)
    escalation:
      on_p0: true                 # Flag for high severity
```

### Resolution Rules

The system determines the "winner" owner based on specificity:

1.  **Failure Code**: An exact match on `failure_codes` is the strongest signal.
2.  **Category + Workflow**: Matches on both `categories` and `workflows` are checked next.
3.  **Path**: Matches on `paths` (using glob patterns) are checked last.

If multiple owners match at the same priority level, the **first one defined in the file** wins.

## Adding or Updating Owners

1.  Edit `docs/ci/FAILURE_OWNERS.yml`.
2.  Add a new entry under `owners` or update an existing one.
3.  Ensure `id` is unique.
4.  Run the validator locally to check for errors:
    ```bash
    node scripts/ci/validate_failure_owners.mjs
    ```
5.  Submit a PR.

## Troubleshooting

*   **"No owner mapping found"**: This means the failure did not match any criteria. Consider adding a general path match or specific failure code to the mapping file.
*   **Wrong owner assigned**: Check the resolution order. A `failure_code` match on another owner might be taking precedence over a `path` match. Or, if relying on path matches, check the file order.

## Artifacts

*   **Validation Report**: `artifacts/ci-owners/validation.md`
*   **Routed Failures**: `artifacts/ci-issues/routed_failures.json`
