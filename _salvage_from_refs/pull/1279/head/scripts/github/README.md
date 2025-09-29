# GitHub Seeding Scripts

Seed Issues from CSV
- Script: `scripts/github/seed_issues_from_csv.py`
- CSV format: `Title,Body,Labels,Milestone` (see `project_management/issues-*.csv`)
- Usage:
  - `REPO_SLUG=owner/repo python3 scripts/github/seed_issues_from_csv.py project_management/issues-next.csv`
  - Or omit `REPO_SLUG` to use current `gh` default repo context.

Projects v2
- Recommend using your existing pack’s `gh` seeding script for Projects v2 fields/views.
- If desired, I can add a GraphQL-based `gh api graphql` script to create a project with a `Status` single-select (Now/Next/Later) and import issues into it. Provide `ORG/REPO` and project name.

