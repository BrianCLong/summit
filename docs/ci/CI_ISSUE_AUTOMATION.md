# CI Issue Automation

This workflow automates the creation and drafting of GitHub issues for high-priority CI regressions.

## Overview

The system runs weekly, consuming the **CI Failure Trend Report** to identify P0/P1 failure patterns.

- **Mode:** `draft` (default) or `apply`.
- **Inputs:** `artifacts/ci-trends/report.json`, `docs/ci/FAILURE_TAXONOMY.yml`.
- **Outputs:** `artifacts/ci-issues/digest.md` and draft markdowns.

## Configuration

The behavior is controlled by the `policy/ci-issue-automation.yml` policy.

## Failure Taxonomy

New failures must be added to `docs/ci/FAILURE_TAXONOMY.yml` to be recognized by the automation.

\`\`\`yaml
failures:
  - code: CI-Example-001
    pattern: "Error message"
    category: "Infrastructure"
    severity: "P1"
    next_steps:
      - "Investigate logs"
\`\`\`

## Deduplication

Issues are deduplicated by `failure_code`. If an open issue exists with the label `ci-failure` and the code in the title/body, it is updated instead of creating a duplicate.
