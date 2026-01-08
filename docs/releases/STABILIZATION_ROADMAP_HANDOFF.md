# Stabilization to Roadmap Handoff

This document outlines the automated process for handing off systemic issues identified during the monthly stabilization retrospective to the roadmap planning process.

## Purpose

The primary goal of this process is to ensure that recurring, systemic issues that affect stabilization are formally captured and considered for the product roadmap. This is achieved by analyzing the monthly retrospective report and generating a small, deduplicated set of roadmap candidates. This avoids spamming the backlog with duplicate issues and ensures that only the most impactful systemic problems are surfaced.

## How it Works

The process is orchestrated by a GitHub Actions workflow that runs on the first day of each month. It consists of two main steps:

1.  **Candidate Derivation:** A script (`scripts/releases/derive_stabilization_roadmap_candidates.mjs`) analyzes the `retrospective-report.json` artifact from the latest stabilization retrospective. It uses a set of rules and thresholds defined in `release-policy.yml` to identify systemic themes.

2.  **Draft Generation:** Another script (`scripts/releases/sync_stabilization_roadmap_handoff.mjs`) takes the derived candidates and generates draft markdown files for each one. These drafts are stored in `artifacts/stabilization/roadmap-handoff/drafts/`. A `digest.md` file is also created to provide a summary of the generated candidates.

### Candidate Identification

Candidates are identified based on the following rules:

-   **`issuance-hygiene`**: Triggered if there are one or more weeks with unissued P0s.
-   **`evidence-compliance`**: Triggered if there are two or more weeks where evidence compliance is below the configured threshold.
-   **`p0-sla-adherence`**: Triggered if there are two or more weeks with overdue P0s.
-   **`systemic-risk-reduction`**: Triggered if the average risk index is above the configured threshold for one or more weeks.
-   **`ci-gate-stability`**: Triggered if the CI OKR is at risk for two or more weeks.

### Deduplication

To avoid creating duplicate issues, a stable identifier is embedded in the body of each draft or issue:

`<!-- STAB_ROADMAP_KEY: <slug> -->`

The `slug` is a unique, hyphenated string derived from the candidate category (e.g., `issuance-hygiene`). When the process runs in `apply` mode, it will first search for existing issues with this key before creating a new one.

## Configuration

The behavior of the handoff process is controlled by the `stabilization_roadmap_handoff` section in `release-policy.yml`.

```yaml
stabilization_roadmap_handoff:
  enabled: true
  mode: draft              # draft|apply
  max_candidates: 5
  thresholds:
    recurring_overdue_weeks: 2
    min_risk_index_avg: 30
    evidence_compliance_min: 0.95
  labels:
    base: ["roadmap", "stabilization"]
    triage: ["needs-triage"]
```

-   **`enabled`**: A boolean to enable or disable the process.
-   **`mode`**:
    -   `draft`: The default mode. The process will only generate markdown draft files as artifacts.
    -   `apply`: The process will create or update GitHub issues with the specified labels. This should be enabled with caution.
-   **`max_candidates`**: The maximum number of roadmap candidates to generate per month.
-   **`thresholds`**: The values used to trigger the candidate derivation rules.
-   **`labels`**: The labels to apply to the GitHub issues when running in `apply` mode.
