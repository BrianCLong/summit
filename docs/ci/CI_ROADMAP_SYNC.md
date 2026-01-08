# CI Reliability Roadmap Sync

## Overview

The CI Reliability Roadmap Sync is a deterministic system that converts CI trends and OKR failures into actionable work items. It runs weekly to ensure that the most critical reliability issues are surfaced without creating noise.

## Configuration

Configuration is managed in `policy/ci-roadmap.yml`.

```yaml
ci_roadmap_sync:
  enabled: true
  mode: draft              # draft | apply
  max_items_per_week: 5
  selection:
    include_p0_only: false
    min_failure_count: 10
    min_regression_delta: 5
    include_failed_okrs: true
```

## Workflow

1.  **Selection (`select_ci_roadmap_items.mjs`)**:
    *   Reads `artifacts/ci-trends/report.json` and `artifacts/ci-okrs/status.json`.
    *   Scores candidates based on severity, regression, and volume.
    *   Selects top N items based on `max_items_per_week`.
    *   Outputs `artifacts/ci-roadmap/selected.json`.

2.  **Sync (`sync_ci_roadmap.mjs`)**:
    *   Reads `selected.json`.
    *   Checks for existing issues using a unique marker (`<!-- CI_ROADMAP_ITEM: <id> -->`).
    *   **Draft Mode**: Generates markdown drafts in `artifacts/ci-roadmap/drafts/`.
    *   **Apply Mode**: Creates or updates GitHub issues (requires GitHub Token).
    *   Generates `artifacts/ci-roadmap/digest.md`.

## Artifacts

*   `artifacts/ci-roadmap/digest.md`: A summary of the selected items and their status.
*   `artifacts/ci-roadmap/selected.json`: The raw data of selected items.
*   `artifacts/ci-roadmap/drafts/*.md`: Draft issue bodies.

## Manual Override

To manually curate the list before sync:
1. Run the selection script.
2. Edit `artifacts/ci-roadmap/selected.json` to remove or reorder items.
3. Run the sync script.

## Taxonomy

Failure categories are defined in `docs/ci/FAILURE_TAXONOMY.yml`. This file maps failure codes to descriptions, severity, and remediation owners.
